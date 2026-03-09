import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import VehicleList from './VehicleList';
import VehicleForm from './VehicleForm';
import DriverList from './DriverList';
import DriverForm from './DriverForm';
import InfosMaintenance from './InfosMaintenance';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { api } from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

function ManagerDashboard({ vehicles, drivers, fuelEntries, onCreateVehicle, onUpdateVehicle, onDeleteVehicle, onCreateDriver, onUpdateDriver, onDeleteDriver }) {
  const [activeSection, setActiveSection] = useState('home');
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [livePositions, setLivePositions] = useState({}); // key: vehicle_id or driver_id
  const [incidents, setIncidents] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const socketRef = useRef(null);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const mapRef = useRef(null);
  const [pendingCenter, setPendingCenter] = useState(null);
  const highlightRef = useRef({});
  const [selectedMarkerKey, setSelectedMarkerKey] = useState(null);

  console.log('ManagerDashboard props:', { vehicles, drivers, fuelEntries, livePositions, incidents });

  useEffect(() => {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || (process.env.REACT_APP_API_BASE ? process.env.REACT_APP_API_BASE.replace('/api', '') : 'http://localhost:3001');
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Manager socket connected', socket.id);
    });

    socket.on('location:update', (payload) => {
      // payload: { driver_id, vehicle_id, lat, lng, timestamp }
      const key = payload.vehicle_id || `d${payload.driver_id}`;
      setLivePositions(prev => ({ ...prev, [key]: payload }));
    });

    socket.on('incident:reported', (payload) => {
      setIncidents(prev => [payload, ...prev]);
      // Also add live position if provided
      if (payload && (payload.lat || payload.lng)) {
        const key = payload.vehicle_id || `d${payload.driver_id}`;
        setLivePositions(prev => ({ ...prev, [key]: { driver_id: payload.driver_id, vehicle_id: payload.vehicle_id, lat: payload.lat, lng: payload.lng, timestamp: payload.timestamp } }));
      }
      // increment unread alerts badge
      setUnreadAlerts(n => n + 1);
      // Play sound and show browser notification if enabled
      try {
        if (soundEnabled) playAlertSound();
        if (notifyEnabled) showBrowserNotification('New incident', payload.message || 'New incident reported', () => {
          // focus and center on the incident when notification clicked
          try { window.focus(); focusOnPosition(payload.lat, payload.lng, 13, payload.id); } catch(e){}
        });
      } catch (e) {
        console.error('Notification error', e);
      }
    });

    socket.on('fuel:added', (payload) => {
      // we could update local stats, for now log
      console.log('Fuel added event', payload);
    });

    socket.on('alert:resolved', (payload) => {
      // remove highlight and remove incident from list
      try {
        const id = payload.id;
        clearHighlight(id);
        setIncidents(prev => prev.filter(i => Number(i.id) !== Number(id)));
      } catch (e) {
        console.error('Error handling alert:resolved', e);
      }
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // Play a short alert sound using WebAudio
  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880; // A5
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      setTimeout(() => { try { o.stop(); ctx.close(); } catch(e){} }, 500);
    } catch (e) {
      console.error('playAlertSound error', e);
    }
  };

  // Show a browser notification (requires permission)
  const showBrowserNotification = (title, body, onClick) => {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        const n = new Notification(title, { body: body || '', silent: true });
        if (onClick) n.onclick = onClick;
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            const n = new Notification(title, { body: body || '', silent: true });
            if (onClick) n.onclick = onClick;
          }
        });
      }
    } catch (e) {
      console.error('showBrowserNotification error', e);
    }
  };



  // Calculate summary statistics
  const totalVehicles = vehicles.length;
  const totalDrivers = drivers.length;
  const assignedVehicles = vehicles.filter(v => v.driver_id).length;
  const availableVehicles = totalVehicles - assignedVehicles;

  // Calculate fuel consumption per vehicle
  const fuelConsumption = vehicles.map(vehicle => {
    const vehicleFuel = fuelEntries.filter(entry => entry.vehicle_id === vehicle.id);
    const totalLiters = vehicleFuel.reduce((sum, entry) => sum + entry.liters, 0);
    return {
      vehicle: `${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`,
      liters: totalLiters
    };
  }).filter(item => item.liters > 0);

  console.log('Fuel consumption:', fuelConsumption);

  // Data for fuel consumption chart
  const fuelChartData = {
    labels: fuelConsumption.map(item => item.vehicle),
    datasets: [
      {
        label: 'Fuel Consumption (Liters)',
        data: fuelConsumption.map(item => item.liters),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const fuelChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#ecf0f1',
        },
      },
      title: {
        display: true,
        text: 'Fuel Consumption per Vehicle',
        color: '#ecf0f1',
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#ecf0f1',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        ticks: {
          color: '#ecf0f1',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  // Generate alerts
  const alerts = [];
  const unassignedVehicles = vehicles.filter(v => !v.driver_id);
  if (unassignedVehicles.length > 0) {
    alerts.push(`${unassignedVehicles.length} vehicle(s) without assigned drivers`);
  }

  const handleCreateVehicle = async (vehicle) => {
    try {
      await onCreateVehicle(vehicle);
      setActiveSection('vehicles'); // Stay on vehicles section
    } catch (error) {
      console.error('Error creating vehicle:', error);
    }
  };

  const handleUpdateVehicle = async (id, vehicle) => {
    try {
      await onUpdateVehicle(id, vehicle);
      setEditingVehicle(null);
    } catch (error) {
      console.error('Error updating vehicle:', error);
    }
  };

  const handleDeleteVehicle = async (id) => {
    try {
      await onDeleteVehicle(id);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  const handleCreateDriver = async (driver) => {
    try {
      await onCreateDriver(driver);
      setActiveSection('drivers'); // Stay on drivers section
    } catch (error) {
      console.error('Error creating driver:', error);
    }
  };

  const handleUpdateDriver = async (id, driver) => {
    try {
      await onUpdateDriver(id, driver);
      setEditingDriver(null);
    } catch (error) {
      console.error('Error updating driver:', error);
    }
  };

  const handleDeleteDriver = async (id) => {
    try {
      await onDeleteDriver(id);
    } catch (error) {
      console.error('Error deleting driver:', error);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <div className="home-section">
            <div className="welcome-message">
              <h2>Welcome to Fleet Management</h2>
              <p>Manage your vehicles, drivers, and operations efficiently.</p>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats">
              <div className="stat-card">
                <div className="stat-icon">🚗</div>
                <div className="stat-info">
                  <h3>{totalVehicles}</h3>
                  <p>Total Vehicles</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👤</div>
                <div className="stat-info">
                  <h3>{totalDrivers}</h3>
                  <p>Total Drivers</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <h3>{assignedVehicles}</h3>
                  <p>Assigned Vehicles</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <h3>{availableVehicles}</h3>
                  <p>Available Vehicles</p>
                </div>
              </div>
            </div>

            {/* Fuel Consumption Statistics */}
            <div className="fuel-stats-section">
              <h3>Fuel Consumption Statistics</h3>
              <div className="chart-container">
                {fuelConsumption.length > 0 ? (
                  <Bar data={fuelChartData} options={fuelChartOptions} />
                ) : (
                  <p className="no-data">No fuel consumption data available. Add fuel entries to see statistics.</p>
                )}
              </div>
            </div>

            {/* Drivers and Assigned Vehicles */}
            <div className="drivers-vehicles-section">
              <h3>Drivers and Assigned Vehicles</h3>
              <div className="drivers-list">
                {drivers.map(driver => {
                  const assignedVehicle = vehicles.find(v => v.driver_id === driver.id);
                  return (
                    <div key={driver.id} className="driver-vehicle-item">
                      <span className="driver-name">{driver.name}</span>
                      <span className="assigned-vehicle">
                        {assignedVehicle ? `${assignedVehicle.make} ${assignedVehicle.model} (${assignedVehicle.license_plate})` : 'No vehicle assigned'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button className="action-btn" onClick={() => handleNavClick('vehicles')}>
                  ➕ Add Vehicle
                </button>
                <button className="action-btn" onClick={() => handleNavClick('drivers')}>
                  👤 Add Driver
                </button>
                <button className="action-btn" onClick={() => handleNavClick('overview')}>
                  📊 View Details
                </button>
                <button className="action-btn" onClick={() => handleNavClick('tracking')}>
                  📍 Tracking
                </button>
              </div>
            </div>
          </div>
        );
      case 'overview':
        return (
          <>
            {/* Summary Overview */}
            <div className="summary-cards">
              <div className="card">
                <h3>Total Vehicles</h3>
                <p className="metric">{totalVehicles}</p>
              </div>
              <div className="card">
                <h3>Total Drivers</h3>
                <p className="metric">{totalDrivers}</p>
              </div>
              <div className="card">
                <h3>Assigned Vehicles</h3>
                <p className="metric">{assignedVehicles}</p>
              </div>
              <div className="card">
                <h3>Available Vehicles</h3>
                <p className="metric">{availableVehicles}</p>
              </div>
            </div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
              <div className="alerts-section">
                <h2>Alerts</h2>
                <ul className="alerts-list">
                  {alerts.map((alert, index) => (
                    <li key={index} className="alert-item">{alert}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        );
      case 'vehicles':
        return (
          <div className="section">
            <h2>Vehicle Management</h2>
            <VehicleForm
              onSubmit={editingVehicle ? (vehicle) => handleUpdateVehicle(editingVehicle.id, vehicle) : handleCreateVehicle}
              initialData={editingVehicle}
              drivers={drivers}
            />
            <VehicleList
              vehicles={vehicles}
              drivers={drivers}
              onEdit={setEditingVehicle}
              onDelete={handleDeleteVehicle}
            />
          </div>
        );
      case 'drivers':
        return (
          <div className="section">
            <h2>Driver Management</h2>
            <DriverForm
              onSubmit={editingDriver ? (driver) => handleUpdateDriver(editingDriver.id, driver) : handleCreateDriver}
              initialData={editingDriver}
            />
            <DriverList
              drivers={drivers}
              onEdit={setEditingDriver}
              onDelete={handleDeleteDriver}
            />
          </div>
        );
      case 'alerts':
        return (
          <div className="section">
            <h2>System Alerts / Incidents</h2>
            {incidents.length > 0 ? (
              <ul className="alerts-list">
                {incidents.map((inc, index) => {
                  const driver = drivers.find(d => d.id === inc.driver_id);
                  return (
                    <li key={inc.id || index} className="alert-item">
                      <div><strong>{inc.level || 'incident'}</strong> — {inc.message}</div>
                      <div>Driver: {driver ? driver.name : (inc.driver_id || 'Unknown')}</div>
                      <div>Vehicle: {inc.vehicle_id || 'N/A'}</div>
                      {inc.lat && inc.lng ? (
                        <div>
                          Position: {inc.lat.toFixed ? inc.lat.toFixed(6) : inc.lat}, {inc.lng.toFixed ? inc.lng.toFixed(6) : inc.lng}
                          {' '}
                          <button onClick={() => focusOnPosition(Number(inc.lat), Number(inc.lng), 13, inc.id)}>Center on Map</button>
                          <button onClick={() => clearHighlight(inc.id, inc.lat, inc.lng)} style={{ marginLeft: '8px' }}>Clear highlight</button>
                          <button onClick={async () => {
                            try {
                              await api.resolveAlert(inc.id, {});
                              clearHighlight(inc.id, inc.lat, inc.lng);
                              setIncidents(prev => prev.filter(i => Number(i.id) !== Number(inc.id)));
                            } catch (e) {
                              console.error('Error resolving alert', e);
                              alert('Failed to resolve alert');
                            }
                          }} style={{ marginLeft: '8px' }}>Resolve</button>
                        </div>
                      ) : (
                        <div>No position available</div>
                      )}
                      <div>Time: {inc.timestamp || inc.created_date}</div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="no-alerts">No alerts at this time. All systems operational.</p>
            )}
          </div>
        );
      case 'tracking':
        return (
          <div className="tracking-section">
            <h2>Vehicle Tracking</h2>
            <div className="map-container">
              <MapContainer center={[-1.6787, 29.2350]} zoom={12} style={{ height: '500px', width: '100%' }} whenCreated={(map) => {
                    // store map instance
                    mapRef.current = map;
                    // If a pending center exists (we requested focus before the map mounted), apply it now
                    try {
                      if (pendingCenter && mapRef.current && typeof mapRef.current.flyTo === 'function') {
                        centerAndHighlight(pendingCenter);
                        setPendingCenter(null);
                      }
                    } catch (e) {
                      console.error('Error applying pending center on map created:', e);
                    }
                  }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {(() => {
                  // Prefer live positions (socket) if available, otherwise use vehicle last known coords
                  const markers = [];
                  // livePositions keys may be vehicle ids or driver ids prefixed
                  Object.values(livePositions).forEach(pos => {
                    if (pos && pos.lat && pos.lng) {
                      markers.push({ key: `live-${pos.vehicle_id || `d${pos.driver_id}`}`, lat: pos.lat, lng: pos.lng, meta: pos });
                    }
                  });
                  // Fallback: use vehicles last known position
                  vehicles.forEach(v => {
                    if (v.last_lat && v.last_lng) {
                      const exists = markers.some(m => m.key === `live-${v.id}` || (m.meta && m.meta.vehicle_id === v.id));
                      if (!exists) {
                        markers.push({ key: `vehicle-${v.id}`, lat: v.last_lat, lng: v.last_lng, meta: v });
                      }
                    }
                  });

                  return markers.map(m => (
                    <Marker key={m.key} position={[m.lat, m.lng]}>
                      <Popup>
                        {m.meta.vehicle_id ? (
                          <div>
                            <strong>Vehicle ID: {m.meta.vehicle_id}</strong><br />
                            Driver ID: {m.meta.driver_id || 'N/A'}<br />
                            Time: {m.meta.timestamp}
                          </div>
                        ) : (
                          <div>
                            <strong>{m.meta.make} {m.meta.model}</strong><br />
                            License: {m.meta.license_plate}<br />
                            Status: {m.meta.status}
                          </div>
                        )}
                        <div style={{ marginTop: '8px' }}>
                          {process.env.REACT_APP_GOOGLE_API_KEY ? (
                            <button onClick={() => {
                              const lat = m.lat;
                              const lng = m.lng;
                              const key = process.env.REACT_APP_GOOGLE_API_KEY;
                              const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}&heading=0&pitch=0&key=${key}`;
                              window.open(url, '_blank');
                            }}>Street View</button>
                          ) : null}
                        </div>
                      </Popup>
                    </Marker>
                  ));
                })()
                }
                {/* Pulsing marker for selected incident */}
                {selectedMarkerKey && (() => {
                  const sel = incidents.find(i => String(i.id) === String(selectedMarkerKey));
                  if (sel && sel.lat && sel.lng) {
                    const pulsingIcon = L.divIcon({ className: 'pulsing-icon', iconSize: [20, 20] });
                    return (
                      <Marker key={`pulse-${selectedMarkerKey}`} position={[sel.lat, sel.lng]} icon={pulsingIcon} />
                    );
                  }
                  return null;
                })()}
              
              </MapContainer>
            </div>
          </div>
        );
      case 'analysis':
        return (
          <div className="analysis-section">
            <h2>Fleet Analysis</h2>
            <div className="analysis-charts">
              <div className="chart-item">
                <h3>Fuel Consumption Trend</h3>
                <div className="chart-container">
                  <Line data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                      label: 'Total Fuel (Liters)',
                      data: [1200, 1350, 1100, 1400, 1300, 1250],
                      borderColor: 'rgba(75, 192, 192, 1)',
                      backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    }]
                  }} options={{
                    responsive: true,
                    plugins: {
                      legend: { labels: { color: '#ecf0f1' } },
                      title: { display: true, text: 'Monthly Fuel Consumption', color: '#ecf0f1' }
                    },
                    scales: {
                      x: { ticks: { color: '#ecf0f1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                      y: { ticks: { color: '#ecf0f1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                    }
                  }} />
                </div>
              </div>
              <div className="chart-item">
                <h3>Vehicle Utilization</h3>
                <div className="chart-container">
                  <Bar data={{
                    labels: vehicles.map(v => `${v.make} ${v.model}`),
                    datasets: [{
                      label: 'Assigned Days',
                      data: vehicles.map(() => Math.floor(Math.random() * 30) + 1),
                      backgroundColor: 'rgba(153, 102, 255, 0.6)',
                      borderColor: 'rgba(153, 102, 255, 1)',
                      borderWidth: 1,
                    }]
                  }} options={{
                    responsive: true,
                    plugins: {
                      legend: { labels: { color: '#ecf0f1' } },
                      title: { display: true, text: 'Vehicle Utilization (Last 30 Days)', color: '#ecf0f1' }
                    },
                    scales: {
                      x: { ticks: { color: '#ecf0f1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                      y: { ticks: { color: '#ecf0f1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                    }
                  }} />
                </div>
              </div>
            </div>
          </div>
        );
      case 'maintenance-info':
        return <InfosMaintenance vehicles={vehicles} />;
      default:
        return null;
    }
  };

  const handleNavClick = (section) => {
    setActiveSection(section);
    setSidebarOpen(false); // Close sidebar on mobile after navigation
    if (section === 'alerts') setUnreadAlerts(0);
  };

  // Helper: center map and add popup/highlight
  const centerAndHighlight = ({ lat, lng, zoom = 13, highlightId = null }) => {
    if (!isFinite(Number(lat)) || !isFinite(Number(lng))) return;
    const nlat = Number(lat);
    const nlng = Number(lng);
    if (!mapRef.current || typeof mapRef.current.flyTo !== 'function') return;
    try {
      mapRef.current.flyTo([nlat, nlng], zoom, { animate: true, duration: 1.0 });
      // open a popup at the location and add a persistent highlight circle
      try {
        const popupContent = `<div><strong>Incident</strong><br/>Lat: ${nlat.toFixed(6)}, Lng: ${nlng.toFixed(6)}</div>`;
        const popup = L.popup({ autoClose: false, closeOnClick: true }).setLatLng([nlat, nlng]).setContent(popupContent);
        popup.openOn(mapRef.current);
        // create a persistent circle highlight keyed by highlightId or coords
        const key = highlightId || `${nlat}:${nlng}`;
        if (highlightRef.current[key]) {
          try { mapRef.current.removeLayer(highlightRef.current[key]); } catch (e) {}
        }
        const circle = L.circle([nlat, nlng], { radius: 40, color: 'red', weight: 2, fillOpacity: 0.2 }).addTo(mapRef.current);
        highlightRef.current[key] = circle;
        setSelectedMarkerKey(key);
      } catch (e) {
        console.error('Error creating popup/highlight:', e);
      }
    } catch (e) {
      console.error('Error centering map:', e);
    }
  };

  const focusOnPosition = (lat, lng, zoom = 13, highlightId = null) => {
    // Accept strings or numbers and validate
    if (!isFinite(Number(lat)) || !isFinite(Number(lng))) return;
    // Ensure tracking tab is active so the map is mounted
    setActiveSection('tracking');
    // Save pending center payload so that when map mounts it will be centered
    setPendingCenter({ lat: Number(lat), lng: Number(lng), zoom, highlightId });
    // If map instance already available, perform immediate centering
    if (mapRef.current && typeof mapRef.current.flyTo === 'function') {
      centerAndHighlight({ lat, lng, zoom, highlightId });
    }
  };

  const clearHighlight = (highlightId, lat, lng) => {
    const key = highlightId || `${lat}:${lng}`;
    if (highlightRef.current && highlightRef.current[key]) {
      try { mapRef.current.removeLayer(highlightRef.current[key]); } catch (e) {}
      delete highlightRef.current[key];
      if (selectedMarkerKey === key) setSelectedMarkerKey(null);
    }
  };

  // If there is a pending center and the map instance becomes available, center the map
  useEffect(() => {
    if (pendingCenter && mapRef.current) {
      try {
        centerAndHighlight(pendingCenter);
      } catch (e) {
        console.error('Error applying pending center', e);
      }
      setPendingCenter(null);
    }
  }, [pendingCenter]);

  return (
    <div className="manager-dashboard">
      {/* Sidebar Navigation */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Fleet Manager</h2>
        </div>
        <ul className="sidebar-menu">
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'home' ? 'active' : ''}`}
              onClick={() => handleNavClick('home')}
            >
              <span className="icon">🏠</span>
              <span className="text">Home</span>
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => handleNavClick('overview')}
            >
              <span className="icon">📊</span>
              <span className="text">Overview</span>
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'vehicles' ? 'active' : ''}`}
              onClick={() => handleNavClick('vehicles')}
            >
              <span className="icon">🚗</span>
              <span className="text">Vehicles</span>
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'drivers' ? 'active' : ''}`}
              onClick={() => handleNavClick('drivers')}
            >
              <span className="icon">👤</span>
              <span className="text">Drivers</span>
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'alerts' ? 'active' : ''}`}
              onClick={() => handleNavClick('alerts')}
            >
              <span className="icon">⚠️</span>
              <span className="text">Alerts</span>
              {unreadAlerts > 0 && <span className="badge">{unreadAlerts}</span>}
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'tracking' ? 'active' : ''}`}
              onClick={() => handleNavClick('tracking')}
            >
              <span className="icon">📍</span>
              <span className="text">Tracking</span>
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'analysis' ? 'active' : ''}`}
              onClick={() => handleNavClick('analysis')}
            >
              <span className="icon">📊</span>
              <span className="text">Analysis</span>
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'maintenance-info' ? 'active' : ''}`}
              onClick={() => handleNavClick('maintenance-info')}
            >
              <span className="icon">🔧</span>
              <span className="text">Infos Maintenance</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Main Content Area */}
      <main className="main-content">
        <header className="content-header">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span className="hamburger"></span>
            <span className="hamburger"></span>
            <span className="hamburger"></span>
          </button>
          <h1>
            {activeSection === 'home' && 'Fleet Management Dashboard'}
            {activeSection === 'overview' && 'Dashboard Overview'}
            {activeSection === 'vehicles' && 'Vehicle Management'}
            {activeSection === 'drivers' && 'Driver Management'}
            {activeSection === 'alerts' && 'System Alerts'}
            {activeSection === 'tracking' && 'Vehicle Tracking'}
            {activeSection === 'analysis' && 'Fleet Analysis'}
            {activeSection === 'maintenance-info' && 'Informations Maintenance'}
          </h1>
          <div style={{ marginLeft: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={notifyEnabled} onChange={(e)=>setNotifyEnabled(e.target.checked)} />
              Notify
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={soundEnabled} onChange={(e)=>setSoundEnabled(e.target.checked)} />
              Sound
            </label>
          </div>
        </header>

        <div className="content-body">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}

export default ManagerDashboard;