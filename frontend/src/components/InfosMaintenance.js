import React, { useState, useEffect } from 'react';
import { Pie, Bar, Line } from 'react-chartjs-2';
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
  ArcElement,
} from 'chart.js';
import { api } from '../services/api';
import io from 'socket.io-client';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function InfosMaintenance({ vehicles }) {
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    loadMaintenanceData();

    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Listen for maintenance updates
    newSocket.on('maintenance:updated', (updatedMaintenance) => {
      setMaintenanceData(prevData => {
        const existingIndex = prevData.findIndex(m => m.id === updatedMaintenance.id);
        if (existingIndex >= 0) {
          // Update existing maintenance
          const newData = [...prevData];
          newData[existingIndex] = updatedMaintenance;
          return newData;
        } else {
          // Add new maintenance
          return [...prevData, updatedMaintenance];
        }
      });
    });

    newSocket.on('maintenance:created', (newMaintenance) => {
      setMaintenanceData(prevData => [...prevData, newMaintenance]);
    });

    newSocket.on('maintenance:deleted', (deletedId) => {
      setMaintenanceData(prevData => prevData.filter(m => m.id !== deletedId));
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const loadMaintenanceData = async () => {
    try {
      const response = await api.get('/maintenance');
      setMaintenanceData(response.data.maintenance || []);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate maintenance statistics
  const getMaintenanceStats = () => {
    const total = maintenanceData.length;
    const completed = maintenanceData.filter(m => m.status === 'completed').length;
    const planned = maintenanceData.filter(m => m.status === 'planned').length;
    const inProgress = maintenanceData.filter(m => m.status === 'in_progress').length;
    const overdue = maintenanceData.filter(m => {
      if (!m.scheduled_date) return false;
      return new Date(m.scheduled_date) < new Date() && m.status !== 'completed';
    }).length;

    return { total, completed, planned, inProgress, overdue };
  };

  // Get vehicle status based on maintenance
  const getVehicleMaintenanceStatus = () => {
    const vehicleStatus = vehicles.map(vehicle => {
      const vehicleMaintenance = maintenanceData.filter(m => m.vehicle_id === vehicle.id);
      const hasOverdue = vehicleMaintenance.some(m => {
        if (!m.scheduled_date) return false;
        return new Date(m.scheduled_date) < new Date() && m.status !== 'completed';
      });
      const hasInProgress = vehicleMaintenance.some(m => m.status === 'in_progress');
      
      return {
        vehicle: `${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`,
        status: hasOverdue ? 'En panne' : hasInProgress ? 'En maintenance' : 'Opérationnel',
        maintenanceCount: vehicleMaintenance.length
      };
    });

    return vehicleStatus;
  };

  // Maintenance type distribution
  const getMaintenanceTypeData = () => {
    const types = {};
    maintenanceData.forEach(m => {
      const type = m.type || 'Autre';
      types[type] = (types[type] || 0) + 1;
    });

    return {
      labels: Object.keys(types),
      datasets: [{
        data: Object.values(types),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ],
        borderWidth: 1
      }]
    };
  };

  // Monthly maintenance cost trend
  const getMonthlyCostData = () => {
    const monthlyCosts = {};
    const currentYear = new Date().getFullYear();
    
    maintenanceData.forEach(m => {
      if (m.cost && m.date) {
        const date = new Date(m.date);
        if (date.getFullYear() === currentYear) {
          const month = date.toLocaleDateString('fr-FR', { month: 'short' });
          monthlyCosts[month] = (monthlyCosts[month] || 0) + parseFloat(m.cost || 0);
        }
      }
    });

    return {
      labels: Object.keys(monthlyCosts),
      datasets: [{
        label: 'Coût de maintenance (€)',
        data: Object.values(monthlyCosts),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    };
  };

  const stats = getMaintenanceStats();
  const vehicleStatus = getVehicleMaintenanceStatus();
  const maintenanceTypeData = getMaintenanceTypeData();
  const monthlyCostData = getMonthlyCostData();

  // Pie chart options
  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#ecf0f1',
          padding: 20
        }
      },
      title: {
        display: true,
        text: 'Répartition des statuts de maintenance',
        color: '#ecf0f1',
        font: {
          size: 16
        }
      }
    }
  };

  // Bar chart options
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Statut des véhicules',
        color: '#ecf0f1',
        font: {
          size: 16
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#ecf0f1'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        ticks: {
          color: '#ecf0f1'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  // Line chart options
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: '#ecf0f1'
        }
      },
      title: {
        display: true,
        text: 'Coûts de maintenance mensuels',
        color: '#ecf0f1',
        font: {
          size: 16
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#ecf0f1'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        ticks: {
          color: '#ecf0f1'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  if (loading) {
    return <div className="loading">Chargement des données de maintenance...</div>;
  }

  return (
    <div className="infos-maintenance">
      <div className="maintenance-header">
        <h2>Informations de Maintenance</h2>
        <button onClick={loadMaintenanceData} className="refresh-btn" disabled={loading}>
          {loading ? '🔄 Chargement...' : '🔄 Actualiser'}
        </button>
      </div>
      
      {/* Statistics Cards */}
      <div className="maintenance-stats">
        <div className="stat-card">
          <div className="stat-icon">🔧</div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total maintenances</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{stats.completed}</h3>
            <p>Complétées</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>{stats.planned}</h3>
            <p>Planifiées</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔴</div>
          <div className="stat-info">
            <h3>{stats.overdue}</h3>
            <p>En retard</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="maintenance-charts">
        {/* Status Distribution Pie Chart */}
        <div className="chart-item">
          <Pie 
            data={{
              labels: ['Complétées', 'Planifiées', 'En cours', 'En retard'],
              datasets: [{
                data: [stats.completed, stats.planned, stats.inProgress, stats.overdue],
                backgroundColor: [
                  '#4BC0C0',
                  '#36A2EB',
                  '#FFCE56',
                  '#FF6384'
                ],
                borderWidth: 1
              }]
            }}
            options={pieOptions}
          />
        </div>

        {/* Maintenance Type Distribution */}
        {maintenanceTypeData.labels.length > 0 && (
          <div className="chart-item">
            <Pie data={maintenanceTypeData} options={{
              ...pieOptions,
              plugins: {
                ...pieOptions.plugins,
                title: {
                  ...pieOptions.plugins.title,
                  text: 'Types de maintenance'
                }
              }
            }} />
          </div>
        )}

        {/* Monthly Cost Trend */}
        {monthlyCostData.labels.length > 0 && (
          <div className="chart-item">
            <Line data={monthlyCostData} options={lineOptions} />
          </div>
        )}
      </div>

      {/* Vehicle Status List */}
      <div className="vehicle-status-section">
        <h3>Statut des véhicules</h3>
        <div className="vehicle-status-list">
          {vehicleStatus.map((item, index) => (
            <div key={index} className={`vehicle-status-item ${item.status.toLowerCase().replace(' ', '-')}`}>
              <div className="vehicle-info">
                <strong>{item.vehicle}</strong>
                <span className={`status-badge ${item.status.toLowerCase().replace(' ', '-')}`}>
                  {item.status}
                </span>
              </div>
              <div className="maintenance-count">
                {item.maintenanceCount} maintenance(s)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Maintenance */}
      <div className="recent-maintenance">
        <h3>Maintenances récentes</h3>
        <div className="maintenance-list">
          {maintenanceData
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5)
            .map((maintenance) => {
              const vehicle = vehicles.find(v => v.id === maintenance.vehicle_id);
              return (
                <div key={maintenance.id} className="maintenance-item">
                  <div className="maintenance-header">
                    <strong>{vehicle ? `${vehicle.make} ${vehicle.model}` : `Véhicule ${maintenance.vehicle_id}`}</strong>
                    <span className={`status-badge ${maintenance.status}`}>
                      {maintenance.status}
                    </span>
                  </div>
                  <div className="maintenance-details">
                    <p><strong>Type:</strong> {maintenance.type}</p>
                    <p><strong>Date:</strong> {new Date(maintenance.date).toLocaleDateString('fr-FR')}</p>
                    {maintenance.cost && <p><strong>Coût:</strong> {maintenance.cost}€</p>}
                    {maintenance.description && <p><strong>Description:</strong> {maintenance.description}</p>}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default InfosMaintenance;
