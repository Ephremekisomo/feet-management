import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function DriverDashboard({ user, vehicles }) {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [tripId, setTripId] = useState(null);
  const [tripStatus, setTripStatus] = useState('idle'); // idle, ongoing
  const [currentPos, setCurrentPos] = useState(null);
  const [tripPath, setTripPath] = useState([]);
  const [watchId, setWatchId] = useState(null);
  const [fuelForm, setFuelForm] = useState({ liters: '', cost_per_liter: '', odometer: '', fuel_station: '' });
  const [incidentForm, setIncidentForm] = useState({ type: '', message: '' });
  const [myTrips, setMyTrips] = useState([]);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [destination, setDestination] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [routePolyline, setRoutePolyline] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);
  const socketRef = useRef(null);

  // Get driver's assigned vehicle
  const assignedVehicle = vehicles.find(v => v.driver_id === user.driver_id);

  // Initialize socket connection
  useEffect(() => {
    const base = (process.env.REACT_APP_API_BASE || 'http://localhost:3001/api').replace('/api', '');
    const { io } = require('socket.io-client');
    socketRef.current = io(base);

    socketRef.current.on('connect', () => {
      console.log('Driver socket connected', socketRef.current.id);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Load driver's trips
  useEffect(() => {
    loadMyTrips();
  }, [user]);

  const loadMyTrips = async () => {
    try {
      const data = await api.getTrips();
      const driverTrips = (data.trips || []).filter(t => t.driver_id === user.driver_id);
      setMyTrips(driverTrips);
    } catch (error) {
      console.error('Error loading trips:', error);
    }
  };

  const startSharing = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const payload = {
          driver_id: user.driver_id || user.id,
          vehicle_id: selectedVehicle || (assignedVehicle ? assignedVehicle.id : null),
          lat,
          lng,
          timestamp: new Date().toISOString()
        };
        setCurrentPos({ lat, lng });

        // attach trip id when available
        if (tripId) payload.trip_id = tripId;

        // emit via socket
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('location:update', payload);
        }

        // fallback: persist via API
        api.sendDriverLocation(user.driver_id || user.id, payload).catch(err => console.error('Persist location error', err));

        // update map marker and polyline
        if (mapInstanceRef.current) {
          if (!markerRef.current) {
            markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
          } else {
            markerRef.current.setLatLng([lat, lng]);
          }

          mapInstanceRef.current.setView([lat, lng], 15);

          setTripPath(prev => {
            const next = [...prev, { lat, lng }];
            const latLngs = next.map(p => [p.lat, p.lng]);
            if (polylineRef.current) {
              polylineRef.current.setLatLngs(latLngs);
            } else {
              polylineRef.current = L.polyline(latLngs, { color: '#007bff', weight: 3 }).addTo(mapInstanceRef.current);
            }
            return next;
          });
        }
      },
      (err) => {
        console.error('Geo error', err);
        if (err.code === 3) {
          alert('Geolocation timeout. Please try again or check your location settings.');
        } else {
          alert('Geolocation error: ' + err.message + '. Please ensure GPS is enabled.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
      }
    );

    setWatchId(id);
  };

  const stopSharing = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  const startTrip = async () => {
    const vehicleId = selectedVehicle || (assignedVehicle ? assignedVehicle.id : null);
    if (!vehicleId) {
      alert('Please select a vehicle first');
      return;
    }

    try {
      const trip = await api.createTrip({
        vehicle_id: vehicleId,
        driver_id: user.driver_id || user.id,
        start_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toISOString(),
        status: 'ongoing',
        purpose: 'Driver trip'
      });
      setTripId(trip.id);
      setTripStatus('ongoing');
      setTripPath([]);
      startSharing();
      loadMyTrips();
    } catch (error) {
      console.error('Error starting trip:', error);
      alert('Failed to start trip');
    }
  };

  const endTrip = async () => {
    if (!tripId) return;

    try {
      await api.updateTrip(tripId, {
        end_date: new Date().toISOString().split('T')[0],
        end_time: new Date().toISOString(),
        status: 'completed'
      });
      stopSharing();
      setTripId(null);
      setTripStatus('idle');
      setTripPath([]);
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      loadMyTrips();
    } catch (error) {
      console.error('Error ending trip:', error);
      alert('Failed to end trip');
    }
  };

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    const vehicleId = selectedVehicle || (assignedVehicle ? assignedVehicle.id : null);
    if (!vehicleId) {
      alert('Please select a vehicle first');
      return;
    }

    try {
      const payload = {
        vehicle_id: vehicleId,
        driver_id: user.driver_id || user.id,
        date: new Date().toISOString().split('T')[0],
        liters: parseFloat(fuelForm.liters),
        cost_per_liter: parseFloat(fuelForm.cost_per_liter),
        total_cost: parseFloat(fuelForm.liters) * parseFloat(fuelForm.cost_per_liter),
        odometer: parseInt(fuelForm.odometer),
        fuel_station: fuelForm.fuel_station,
        timestamp: new Date().toISOString()
      };
      await api.createFuelEntry(payload);

      // Emit via socket
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('fuel:added', payload);
      }

      setFuelForm({ liters: '', cost_per_liter: '', odometer: '', fuel_station: '' });
      setShowFuelForm(false);
      alert('Fuel entry recorded successfully!');
    } catch (error) {
      console.error('Error recording fuel:', error);
      alert('Failed to record fuel entry');
    }
  };

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    const vehicleId = selectedVehicle || (assignedVehicle ? assignedVehicle.id : null);

    try {
      // Create incident first
      const incidentPayload = {
        vehicle_id: vehicleId,
        driver_id: user.driver_id || user.id,
        type: incidentForm.type,
        message: incidentForm.message,
        timestamp: new Date().toISOString()
      };
      await api.createIncident(incidentPayload);

      // Also create alert for maintenance team
      const alertPayload = {
        vehicle_id: vehicleId,
        driver_id: user.driver_id || user.id,
        type: incidentForm.type,
        message: incidentForm.message,
        level: 'high',
        created_date: new Date().toISOString(),
        resolved: 0
      };
      await api.createAlert(alertPayload);

      // Emit via socket
      if (socketRef.current && socketRef.current.connected) {
        console.log('Emitting alert:created from driver:', alertPayload);
        socketRef.current.emit('incident:reported', incidentPayload);
        socketRef.current.emit('alert:created', alertPayload);
        console.log('Alert emitted successfully');
      } else {
        console.log('Socket not connected, cannot emit alert');
      }

      setIncidentForm({ type: '', message: '' });
      setShowIncidentForm(false);
      alert('Incident reported successfully! Maintenance team has been notified.');
    } catch (error) {
      console.error('Error reporting incident:', error);
      alert('Failed to report incident');
    }
  };

  const handlePlanRoute = async (e) => {
    e.preventDefault();
    if (!currentPos) {
      alert('Current position not available. Please enable location sharing.');
      return;
    }
    if (!destination.trim()) {
      alert('Please enter a destination.');
      return;
    }

    try {
      // Geocode destination using Nominatim (free)
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`;
      const geocodeRes = await fetch(geocodeUrl);
      const geocodeData = await geocodeRes.json();
      if (!geocodeData.length) {
        alert('Destination not found. Please try a different address.');
        return;
      }
      const destLat = parseFloat(geocodeData[0].lat);
      const destLng = parseFloat(geocodeData[0].lon);

      // Get directions using OSRM (free, no API key required)
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${currentPos.lng},${currentPos.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const osrmRes = await fetch(osrmUrl);
      const osrmData = await osrmRes.json();
      
      if (osrmData.code !== 'Ok' || !osrmData.routes || !osrmData.routes.length) {
        alert('Could not calculate route. Please try again.');
        return;
      }

      const route = osrmData.routes[0];
      const distanceKm = route.distance / 1000; // meters to km
      const durationSec = route.duration; // seconds
      const durationMin = Math.round(durationSec / 60);
      
      // Get vehicle fuel consumption rate (default 8L/100km if not specified)
      const vehicleId = selectedVehicle || (assignedVehicle ? assignedVehicle.id : null);
      const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
      const fuelRate = vehicle?.fuel_consumption || 8; // L per 100km
      const fuelConsumption = (distanceKm * fuelRate) / 100;

      const routeCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // swap lng/lat to lat/lng
      
      // Store route data in database
      try {
        await api.createTrip({
          vehicle_id: vehicleId,
          driver_id: user.driver_id || user.id,
          start_date: new Date().toISOString().split('T')[0],
          status: 'planned',
          purpose: `Route to ${destination}`,
          route: JSON.stringify({
            destination: destination,
            dest_lat: destLat,
            dest_lng: destLng,
            distance_km: distanceKm,
            duration_min: durationMin,
            fuel_liters: fuelConsumption,
            geometry: route.geometry
          })
        });
      } catch (err) {
        console.error('Error saving route:', err);
      }

      setRouteData({
        distance: distanceKm.toFixed(1),
        duration: durationMin,
        fuel: fuelConsumption.toFixed(1),
        destination: destination
      });

      // Clear previous route
      if (routePolyline) {
        mapInstanceRef.current.removeLayer(routePolyline);
      }

      // Draw new route
      const newPolyline = L.polyline(routeCoords, { color: '#28a745', weight: 4, opacity: 0.8 }).addTo(mapInstanceRef.current);
      setRoutePolyline(newPolyline);

      // Fit map to route bounds
      const bounds = L.latLngBounds(routeCoords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });

      // Add destination marker
      L.marker([destLat, destLng], { title: destination }).addTo(mapInstanceRef.current);

    } catch (error) {
      console.error('Error planning route:', error);
      alert('Failed to plan route. Please try again.');
    }
  };

  return (
    <div className="driver-dashboard">
      <h2>🚗 Driver Dashboard</h2>
      
      <div className="dashboard-grid">
        {/* Vehicle Selection */}
        <div className="section">
          <h3>🚙 Vehicle Assignment</h3>
          {assignedVehicle ? (
            <div className="vehicle-info-card">
              <div className="vehicle-icon">🚚</div>
              <div className="vehicle-details">
                <h4>{assignedVehicle.make} {assignedVehicle.model}</h4>
                <p className="license-plate">{assignedVehicle.license_plate}</p>
                <p className="vehicle-status">Status: <span className="active">Active</span></p>
              </div>
            </div>
          ) : (
            <div className="vehicle-selection">
              <label>Select a vehicle for your trip:</label>
              <select 
                value={selectedVehicle} 
                onChange={(e) => setSelectedVehicle(e.target.value)}
              >
                <option value="">-- Select a vehicle --</option>
                {vehicles.filter(v => v.status === 'active').map(v => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.license_plate})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Trip Controls */}
        <div className="section trip-section">
          <h3>🛣️ Trip Management</h3>
          <div className="trip-controls">
            {tripStatus === 'idle' ? (
              <button className="btn-primary" onClick={startTrip}>
                <span className="btn-icon">🚗</span>
                <span>Start Trip</span>
              </button>
            ) : (
              <button className="btn-danger" onClick={endTrip}>
                <span className="btn-icon">🛑</span>
                <span>End Trip</span>
              </button>
            )}
            <div className="trip-status">
              <span className={`status-badge ${tripStatus}`}>
                {tripStatus === 'ongoing' ? '🟢 On Trip' : '⚪ Idle'}
              </span>
            </div>
          </div>
          {currentPos && (
            <div className="position-info">
              <h4>📍 Current Position</h4>
              <p className="coordinates">
                {currentPos.lat.toFixed(6)}, {currentPos.lng.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="section map-section">
          <h3>🗺️ Live Tracking</h3>
          <div 
            ref={mapContainerRef} 
            style={{ height: '350px', width: '100%', borderRadius: '12px' }}
            className="map-container"
          ></div>
        </div>

        {/* Quick Actions */}
        <div className="section actions-section">
          <h3>⚡ Quick Actions</h3>
          <div className="action-buttons">
            <button className="btn-secondary" onClick={() => setShowFuelForm(!showFuelForm)}>
              <span className="btn-icon">⛽</span>
              <span>Report Fuel</span>
            </button>
            <button className="btn-warning" onClick={() => setShowIncidentForm(!showIncidentForm)}>
              <span className="btn-icon">⚠️</span>
              <span>Report Incident</span>
            </button>
          </div>
        </div>

        {/* Plan Route */}
        <div className="section route-section">
          <h3>🗺️ Route Planning</h3>
          <form onSubmit={handlePlanRoute} className="route-form">
            <div className="form-group">
              <label>📍 Destination Address</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter destination address"
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                <span className="btn-icon">🗺️</span>
                <span>Plan Route</span>
              </button>
            </div>
          </form>
          {routeData && (
            <div className="route-info">
              <h4>📍 Route to {routeData.destination}</h4>
              <div className="route-stats">
                <div className="stat-item">
                  <span className="stat-icon">📏</span>
                  <span className="stat-value">{routeData.distance} km</span>
                  <span className="stat-label">Distance</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">⏱️</span>
                  <span className="stat-value">{routeData.duration} min</span>
                  <span className="stat-label">Duration</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">⛽</span>
                  <span className="stat-value">{routeData.fuel} L</span>
                  <span className="stat-label">Fuel Needed</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Forms */}
        <div className="forms-container">
          {/* Fuel Form */}
          {showFuelForm && (
            <div className="section form-section fuel-form">
              <h3>⛽ Report Fuel Entry</h3>
              <form onSubmit={handleFuelSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>⛽ Liters</label>
                    <input
                      type="number"
                      step="0.01"
                      value={fuelForm.liters}
                      onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>💰 Cost per Liter</label>
                    <input
                      type="number"
                      step="0.01"
                      value={fuelForm.cost_per_liter}
                      onChange={(e) => setFuelForm({ ...fuelForm, cost_per_liter: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>📊 Odometer (km)</label>
                    <input
                      type="number"
                      value={fuelForm.odometer}
                      onChange={(e) => setFuelForm({ ...fuelForm, odometer: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>⛽ Fuel Station</label>
                    <input
                      type="text"
                      value={fuelForm.fuel_station}
                      onChange={(e) => setFuelForm({ ...fuelForm, fuel_station: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    <span className="btn-icon">✅</span>
                    <span>Submit</span>
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setShowFuelForm(false)}>
                    <span className="btn-icon">❌</span>
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Incident Form */}
          {showIncidentForm && (
            <div className="section form-section incident-form">
              <h3>⚠️ Report Incident</h3>
              <form onSubmit={handleIncidentSubmit}>
                <div className="form-group">
                  <label>⚠️ Incident Type</label>
                  <select
                    value={incidentForm.type}
                    onChange={(e) => setIncidentForm({ ...incidentForm, type: e.target.value })}
                    required
                  >
                    <option value="">-- Select type --</option>
                    <option value="breakdown">🔧 Breakdown</option>
                    <option value="accident">🚗 Accident</option>
                    <option value="flat_tire">🛞 Flat Tire</option>
                    <option value="fuel_issue">⛽ Fuel Issue</option>
                    <option value="other">📋 Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>📝 Description</label>
                  <textarea
                    value={incidentForm.message}
                    onChange={(e) => setIncidentForm({ ...incidentForm, message: e.target.value })}
                    rows="4"
                    placeholder="Describe the incident in detail..."
                    required
                  ></textarea>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-warning">
                    <span className="btn-icon">📢</span>
                    <span>Report</span>
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setShowIncidentForm(false)}>
                    <span className="btn-icon">❌</span>
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Recent Trips */}
        <div className="section trips-section">
          <h3>📊 Recent Trips</h3>
          {myTrips.length === 0 ? (
            <div className="no-data">
              <span className="no-data-icon">🚗</span>
              <p>No trips recorded yet.</p>
            </div>
          ) : (
            <div className="trips-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>📅 Date</th>
                    <th>📊 Status</th>
                    <th>🎯 Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {myTrips.slice(0, 5).map(trip => (
                    <tr key={trip.id}>
                      <td>{trip.start_date}</td>
                      <td>
                        <span className={`status-badge ${trip.status || 'completed'}`}>
                          {trip.status || 'completed'}
                        </span>
                      </td>
                      <td>{trip.purpose || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DriverDashboard;
