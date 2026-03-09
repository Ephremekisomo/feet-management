import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';

function MaintenanceDashboard({ vehicles, onUpdateVehicle }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [breakdowns, setBreakdowns] = useState([]);
  const [parts, setParts] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [maintenanceForm, setMaintenanceForm] = useState({
    vehicle_id: '',
    type: 'preventive',
    description: '',
    scheduled_date: '',
    status: 'planned'
  });

  const [breakdownForm, setBreakdownForm] = useState({
    vehicle_id: '',
    description: '',
    diagnosis: '',
    status: 'reported',
    photo_url: ''
  });

  const [partForm, setPartForm] = useState({
    name: '',
    reference: '',
    quantity: 0,
    min_quantity: 0,
    unit_price: 0
  });

  useEffect(() => {
    loadData();
    
    // Setup socket connection for real-time alerts
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001');
    
    socket.on('connect', () => {
      console.log('Maintenance dashboard connected to socket with ID:', socket.id);
    });
    
    socket.on('alert:created', (alert) => {
      console.log('New alert received in maintenance dashboard:', alert);
      setAlerts(prev => {
        const updated = [alert, ...prev];
        return updated;
      });
    });
    
    socket.on('alert:resolved', (alert) => {
      console.log('Alert resolved in maintenance dashboard:', alert);
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load alerts
      const alertsRes = await api.getAlerts();
      const alertsData = alertsRes.data?.alerts || alertsRes.data || [];
      setAlerts(alertsData);

      // Load maintenance records
      const maintenanceRes = await api.getMaintenance();
      const maintenanceData = maintenanceRes.maintenance || [];
      setMaintenanceRecords(maintenanceData);

      // Load breakdowns (incidents)
      const incidentsRes = await api.getIncidents();
      const incidentsData = incidentsRes.data?.incidents || incidentsRes.data || [];
      setBreakdowns(incidentsData);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadData();
  };

  // Dashboard statistics
  const technicalAlerts = alerts.filter(a => a.type === 'technical' || a.level === 'critical');
  const brokenVehicles = vehicles.filter(v => v.status === 'broken' || v.status === 'maintenance');
  const todayMaintenance = maintenanceRecords.filter(m => {
    const today = new Date().toISOString().split('T')[0];
    return m.scheduled_date && m.scheduled_date.startsWith(today);
  });

  // Filter vehicles
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = searchQuery === '' || 
      v.license_plate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'good' && v.status === 'active') ||
      (filterStatus === 'broken' && (v.status === 'broken' || v.status === 'maintenance')) ||
      (filterStatus === 'watch' && v.status === 'inactive');
    
    return matchesSearch && matchesFilter;
  });

  // Handle maintenance operations
  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    try {
      console.log('Adding maintenance with data:', maintenanceForm);

      // Prepare the data to send
      const maintenanceData = {
        ...maintenanceForm,
        // If status is completed, set the actual date to today
        date: maintenanceForm.status === 'completed' ? new Date().toISOString().split('T')[0] : null
      };

      console.log('Sending maintenance data:', maintenanceData);
      const response = await api.createMaintenance(maintenanceData);
      console.log('Maintenance creation response:', response);

      // Add the new maintenance to the list immediately
      const newMaintenance = {
        ...maintenanceData,
        id: response.data?.id || response.id || Date.now(),
        created_date: new Date().toISOString().split('T')[0]
      };
      console.log('New maintenance to add:', newMaintenance);
      setMaintenanceRecords(prev => {
        console.log('Previous maintenance records:', prev);
        const updated = [newMaintenance, ...prev];
        console.log('Updated maintenance records:', updated);
        return updated;
      });

      setMaintenanceForm({
        vehicle_id: '',
        type: 'preventive',
        description: '',
        scheduled_date: '',
        status: 'planned'
      });
      refreshData(); // Still refresh to get server data
      alert('Entretien ajouté avec succès');
    } catch (error) {
      console.error('Error adding maintenance:', error);
      alert('Erreur lors de l\'ajout de l\'entretien: ' + error.message);
    }
  };

  const handleUpdateMaintenance = async (id, updates) => {
    try {
      await api.updateMaintenance(id, updates);
      refreshData();
      alert('Entretien mis à jour');
    } catch (error) {
      console.error('Error updating maintenance:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteMaintenance = async (id) => {
    if (!window.confirm('Confirmer la suppression ?')) return;
    try {
      await api.deleteMaintenance(id);
      refreshData();
      alert('Entretien supprimé');
    } catch (error) {
      console.error('Error deleting maintenance:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Handle breakdown operations
  const handleReportBreakdown = async (e) => {
    e.preventDefault();
    try {
      console.log('Reporting breakdown with data:', breakdownForm);
      const response = await api.createIncident({
        ...breakdownForm,
        type: 'breakdown',
        level: 'high'
      });
      console.log('Breakdown creation response:', response);
      
      // Add the new breakdown to the list immediately
      const newBreakdown = {
        ...breakdownForm,
        id: response.data?.id || response.id || Date.now(),
        created_date: new Date().toISOString().split('T')[0],
        type: 'breakdown',
        level: 'high'
      };
      console.log('New breakdown to add:', newBreakdown);
      setBreakdowns(prev => {
        console.log('Previous breakdowns:', prev);
        const updated = [newBreakdown, ...prev];
        console.log('Updated breakdowns:', updated);
        return updated;
      });
      
      setBreakdownForm({
        vehicle_id: '',
        description: '',
        diagnosis: '',
        status: 'reported',
        photo_url: ''
      });
      refreshData(); // Still refresh to get server data
      alert('Panne signalée avec succès');
    } catch (error) {
      console.error('Error reporting breakdown:', error);
      alert('Erreur lors du signalement: ' + error.message);
    }
  };

  const handleUpdateBreakdown = async (id, updates) => {
    try {
      await api.updateIncident(id, updates);
      refreshData();
      alert('Réparation mise à jour');
    } catch (error) {
      console.error('Error updating breakdown:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  // Handle vehicle status changes
  const handleImmobilizeVehicle = async (vehicleId) => {
    if (!window.confirm('Confirmer l\'immobilisation du véhicule ?')) return;
    try {
      await onUpdateVehicle(vehicleId, { status: 'maintenance' });
      refreshData();
      alert('Véhicule immobilisé');
    } catch (error) {
      console.error('Error immobilizing vehicle:', error);
      alert('Erreur lors de l\'immobilisation');
    }
  };

  const handleReactivateVehicle = async (vehicleId) => {
    if (!window.confirm('Confirmer la remise en service ?')) return;
    try {
      await onUpdateVehicle(vehicleId, { status: 'active' });
      refreshData();
      alert('Véhicule remis en service');
    } catch (error) {
      console.error('Error reactivating vehicle:', error);
      alert('Erreur lors de la remise en service');
    }
  };

  // Handle alert operations
  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await api.resolveAlert(alertId, { acknowledged: true });
      refreshData();
      alert('Alerte accusée réception');
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      alert('Erreur lors de l\'accusé de réception');
    }
  };

  const handleScheduleIntervention = async (alertId) => {
    const date = prompt('Date d\'intervention (YYYY-MM-DD):');
    if (!date) return;
    try {
      await api.resolveAlert(alertId, { scheduled_date: date });
      refreshData();
      alert('Intervention programmée');
    } catch (error) {
      console.error('Error scheduling intervention:', error);
      alert('Erreur lors de la programmation');
    }
  };

  // Render sections
  const renderDashboard = () => (
    <div className="maintenance-dashboard-home">
      <div className="dashboard-actions">
        <button className="action-btn primary" onClick={() => setActiveSection('alerts')}>
          ⚠️ Voir alertes ({technicalAlerts.length})
        </button>
        <button className="action-btn danger" onClick={() => setActiveSection('vehicles')}>
          🚫 Voir véhicules en panne ({brokenVehicles.length})
        </button>
        <button className="action-btn info" onClick={() => setActiveSection('maintenance')}>
          📅 Entretiens du jour ({todayMaintenance.length})
        </button>
        <button className="action-btn" onClick={refreshData}>
          🔄 Actualiser
        </button>
      </div>

      <div className="quick-stats">
        <div className="stat-card alert">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <h3>{technicalAlerts.length}</h3>
            <p>Alertes techniques</p>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon">🚫</div>
          <div className="stat-info">
            <h3>{brokenVehicles.length}</h3>
            <p>Véhicules en panne</p>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <h3>{todayMaintenance.length}</h3>
            <p>Entretiens aujourd'hui</p>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{vehicles.filter(v => v.status === 'active').length}</h3>
            <p>Véhicules opérationnels</p>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Activité récente</h3>
        <div className="activity-list">
          {maintenanceRecords.slice(0, 5).map(m => (
            <div key={m.id} className="activity-item">
              <span className="activity-icon">🔧</span>
              <span className="activity-text">
                Entretien {m.type} - Véhicule #{m.vehicle_id} - {m.status}
              </span>
              <span className="activity-date">{m.scheduled_date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderVehicleList = () => (
    <div className="vehicle-list-section">
      <div className="list-controls">
        <input
          type="text"
          placeholder="Rechercher par immatriculation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
          <option value="all">Tous</option>
          <option value="good">Bon état</option>
          <option value="broken">En panne</option>
          <option value="watch">À surveiller</option>
        </select>
      </div>

      <div className="vehicle-grid">
        {filteredVehicles.map(vehicle => (
          <div key={vehicle.id} className={`vehicle-card status-${vehicle.status}`}>
            <div className="vehicle-header">
              <h4>{vehicle.make} {vehicle.model}</h4>
              <span className={`status-badge ${vehicle.status}`}>{vehicle.status}</span>
            </div>
            <div className="vehicle-info">
              <p><strong>Immatriculation:</strong> {vehicle.license_plate}</p>
              <p><strong>Année:</strong> {vehicle.year}</p>
              <p><strong>Kilométrage:</strong> {vehicle.mileage || 'N/A'} km</p>
            </div>
            <div className="vehicle-actions">
              <button onClick={() => { setSelectedVehicle(vehicle); setActiveSection('vehicle-detail'); }} className="btn-small">
                📋 Voir fiche
              </button>
              <button onClick={() => { setBreakdownForm({ ...breakdownForm, vehicle_id: vehicle.id }); setActiveSection('breakdowns'); }} className="btn-small danger">
                🚫 Signaler panne
              </button>
              <button onClick={() => { setSelectedVehicle(vehicle); setActiveSection('vehicle-detail'); }} className="btn-small info">
                🔍 Diagnostiquer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVehicleDetail = () => {
    if (!selectedVehicle) return <p>Aucun véhicule sélectionné</p>;

    const vehicleMaintenances = maintenanceRecords.filter(m => m.vehicle_id === selectedVehicle.id);
    const vehicleBreakdowns = breakdowns.filter(b => b.vehicle_id === selectedVehicle.id);

    return (
      <div className="vehicle-detail-section">
        <button onClick={() => setActiveSection('vehicles')} className="back-btn">← Retour</button>
        
        <div className="vehicle-detail-header">
          <h2>{selectedVehicle.make} {selectedVehicle.model}</h2>
          <span className={`status-badge ${selectedVehicle.status}`}>{selectedVehicle.status}</span>
        </div>

        <div className="vehicle-detail-info">
          <div className="info-group">
            <h3>Informations techniques</h3>
            <p><strong>Immatriculation:</strong> {selectedVehicle.license_plate}</p>
            <p><strong>Année:</strong> {selectedVehicle.year}</p>
            <p><strong>Kilométrage:</strong> {selectedVehicle.mileage || 'N/A'} km</p>
            <p><strong>Statut:</strong> {selectedVehicle.status}</p>
          </div>
        </div>

        <div className="vehicle-actions-panel">
          <button onClick={() => { setMaintenanceForm({ ...maintenanceForm, vehicle_id: selectedVehicle.id }); setActiveSection('maintenance'); }} className="action-btn">
            📅 Planifier entretien
          </button>
          <button onClick={() => { setMaintenanceForm({ ...maintenanceForm, vehicle_id: selectedVehicle.id }); setActiveSection('maintenance'); }} className="action-btn">
            ✅ Enregistrer entretien
          </button>
          <button onClick={() => { setBreakdownForm({ ...breakdownForm, vehicle_id: selectedVehicle.id }); setActiveSection('breakdowns'); }} className="action-btn danger">
            🚫 Signaler panne
          </button>
          {selectedVehicle.status !== 'maintenance' ? (
            <button onClick={() => handleImmobilizeVehicle(selectedVehicle.id)} className="action-btn danger">
              🔒 Immobiliser véhicule
            </button>
          ) : (
            <button onClick={() => handleReactivateVehicle(selectedVehicle.id)} className="action-btn success">
              ✅ Remettre en service
            </button>
          )}
        </div>

        <div className="vehicle-history">
          <h3>Historique des entretiens</h3>
          <div className="history-list">
            {vehicleMaintenances.length > 0 ? vehicleMaintenances.map(m => (
              <div key={m.id} className="history-item">
                <span className="history-date">{m.scheduled_date}</span>
                <span className="history-type">{m.type}</span>
                <span className="history-desc">{m.description}</span>
                <span className={`history-status ${m.status}`}>{m.status}</span>
              </div>
            )) : <p>Aucun historique d'entretien</p>}
          </div>

          <h3>Historique des pannes</h3>
          <div className="history-list">
            {vehicleBreakdowns.length > 0 ? vehicleBreakdowns.map(b => (
              <div key={b.id} className="history-item">
                <span className="history-date">{b.created_date}</span>
                <span className="history-desc">{b.description}</span>
                <span className={`history-status ${b.status}`}>{b.status}</span>
              </div>
            )) : <p>Aucune panne enregistrée</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderMaintenance = () => (
    <div className="maintenance-section">
      <h2>Gestion des entretiens</h2>
      
      <form onSubmit={handleAddMaintenance} className="maintenance-form">
        <h3>Ajouter un entretien</h3>
        <select
          value={maintenanceForm.vehicle_id}
          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vehicle_id: e.target.value })}
          required
        >
          <option value="">Sélectionner un véhicule</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>{v.license_plate} - {v.make} {v.model}</option>
          ))}
        </select>
        <select
          value={maintenanceForm.type}
          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
        >
          <option value="preventive">Préventif</option>
          <option value="corrective">Correctif</option>
          <option value="inspection">Inspection</option>
        </select>
        <textarea
          placeholder="Description"
          value={maintenanceForm.description}
          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
          required
        />
        <input
          type="date"
          value={maintenanceForm.scheduled_date}
          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, scheduled_date: e.target.value })}
          required
        />
        <select
          value={maintenanceForm.status}
          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, status: e.target.value })}
        >
          <option value="planned">Planifié</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminé</option>
        </select>
        <button type="submit" className="submit-btn">Ajouter entretien</button>
      </form>

      <div className="maintenance-list">
        <h3>Liste des entretiens</h3>
        {maintenanceRecords && maintenanceRecords.length > 0 ? (
          maintenanceRecords.map(m => {
            const vehicle = vehicles.find(v => v.id === m.vehicle_id);
            return (
              <div key={m.id} className={`maintenance-item status-${m.status}`}>
                <div className="maintenance-info">
                  <h4>{vehicle ? `${vehicle.license_plate} - ${vehicle.make} ${vehicle.model}` : `Véhicule #${m.vehicle_id}`}</h4>
                  <p><strong>Type:</strong> {m.type}</p>
                  <p><strong>Description:</strong> {m.description}</p>
                  <p><strong>Date prévue:</strong> {m.scheduled_date}</p>
                  <span className={`status-badge ${m.status}`}>{m.status}</span>
                </div>
                <div className="maintenance-actions">
                  <button onClick={() => handleUpdateMaintenance(m.id, { status: 'in_progress' })} className="btn-small">
                    ▶️ Démarrer
                  </button>
                  <button onClick={() => handleUpdateMaintenance(m.id, { status: 'completed' })} className="btn-small success">
                    ✅ Valider
                  </button>
                  <button onClick={() => {
                    const newDate = prompt('Nouvelle date (YYYY-MM-DD):', m.scheduled_date);
                    if (newDate) handleUpdateMaintenance(m.id, { scheduled_date: newDate });
                  }} className="btn-small info">
                    📅 Reporter
                  </button>
                  <button onClick={() => handleDeleteMaintenance(m.id)} className="btn-small danger">
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="no-data">Aucun entretien planifié</p>
        )}
      </div>
    </div>
  );

  const renderBreakdowns = () => (
    <div className="breakdowns-section">
      <h2>Gestion des pannes et réparations</h2>
      
      <form onSubmit={handleReportBreakdown} className="breakdown-form">
        <h3>Signaler une panne</h3>
        <select
          value={breakdownForm.vehicle_id}
          onChange={(e) => setBreakdownForm({ ...breakdownForm, vehicle_id: e.target.value })}
          required
        >
          <option value="">Sélectionner un véhicule</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>{v.license_plate} - {v.make} {v.model}</option>
          ))}
        </select>
        <textarea
          placeholder="Description de la panne"
          value={breakdownForm.description}
          onChange={(e) => setBreakdownForm({ ...breakdownForm, description: e.target.value })}
          required
        />
        <textarea
          placeholder="Diagnostic (optionnel)"
          value={breakdownForm.diagnosis}
          onChange={(e) => setBreakdownForm({ ...breakdownForm, diagnosis: e.target.value })}
        />
        <input
          type="text"
          placeholder="URL photo (optionnel)"
          value={breakdownForm.photo_url}
          onChange={(e) => setBreakdownForm({ ...breakdownForm, photo_url: e.target.value })}
        />
        <button type="submit" className="submit-btn danger">Signaler panne</button>
      </form>

      <div className="breakdown-list">
        <h3>Liste des pannes</h3>
        {breakdowns.map(b => {
          const vehicle = vehicles.find(v => v.id === b.vehicle_id);
          return (
            <div key={b.id} className={`breakdown-item status-${b.status}`}>
              <div className="breakdown-info">
                <h4>{vehicle ? `${vehicle.license_plate} - ${vehicle.make} ${vehicle.model}` : `Véhicule #${b.vehicle_id}`}</h4>
                <p><strong>Description:</strong> {b.description}</p>
                {b.diagnosis && <p><strong>Diagnostic:</strong> {b.diagnosis}</p>}
                <p><strong>Date:</strong> {b.created_date}</p>
                <span className={`status-badge ${b.status}`}>{b.status}</span>
              </div>
              <div className="breakdown-actions">
                <button onClick={() => {
                  const diagnosis = prompt('Diagnostic:', b.diagnosis || '');
                  if (diagnosis !== null) handleUpdateBreakdown(b.id, { diagnosis });
                }} className="btn-small">
                  🔍 Diagnostiquer
                </button>
                <button onClick={() => handleUpdateBreakdown(b.id, { status: 'in_progress' })} className="btn-small info">
                  ▶️ Démarrer réparation
                </button>
                <button onClick={() => handleUpdateBreakdown(b.id, { status: 'resolved' })} className="btn-small success">
                  ✅ Clôturer
                </button>
                {vehicle && vehicle.status !== 'maintenance' && (
                  <button onClick={() => handleImmobilizeVehicle(vehicle.id)} className="btn-small danger">
                    🔒 Immobiliser
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="alerts-section">
      <h2>Alertes techniques</h2>
      <div className="alerts-list">
        {technicalAlerts.length > 0 ? technicalAlerts.map(alert => {
          const vehicle = vehicles.find(v => v.id === alert.vehicle_id);
          return (
            <div key={alert.id} className={`alert-item level-${alert.level}`}>
              <div className="alert-header">
                <span className={`alert-level ${alert.level}`}>{alert.level}</span>
                <span className="alert-type">{alert.type}</span>
              </div>
              <div className="alert-content">
                <p><strong>Message:</strong> {alert.message}</p>
                {vehicle && <p><strong>Véhicule:</strong> {vehicle.license_plate} - {vehicle.make} {vehicle.model}</p>}
                <p><strong>Date:</strong> {alert.created_date}</p>
              </div>
              <div className="alert-actions">
                <button onClick={() => handleAcknowledgeAlert(alert.id)} className="btn-small">
                  ✅ Accuser réception
                </button>
                <button onClick={() => handleScheduleIntervention(alert.id)} className="btn-small info">
                  📅 Programmer intervention
                </button>
                <button onClick={() => {
                  const reason = prompt('Raison du report:');
                  if (reason) handleAcknowledgeAlert(alert.id);
                }} className="btn-small">
                  ⏰ Reporter
                </button>
              </div>
            </div>
          );
        }) : <p className="no-data">Aucune alerte technique</p>}
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="reports-section">
      <h2>Rapports techniques</h2>
      <div className="report-actions">
        <button className="action-btn" onClick={() => alert('Génération du rapport...')}>
          📊 Générer rapport
        </button>
        <button className="action-btn" onClick={() => alert('Export PDF...')}>
          📄 Exporter PDF
        </button>
        <button className="action-btn" onClick={() => alert('Export Excel...')}>
          📊 Exporter Excel
        </button>
        <button className="action-btn" onClick={() => window.print()}>
          🖨️ Imprimer
        </button>
      </div>

      <div className="report-summary">
        <h3>Résumé des statistiques</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <h4>Total véhicules</h4>
            <p className="stat-value">{vehicles.length}</p>
          </div>
          <div className="stat-item">
            <h4>Véhicules en panne</h4>
            <p className="stat-value danger">{brokenVehicles.length}</p>
          </div>
          <div className="stat-item">
            <h4>Entretiens planifiés</h4>
            <p className="stat-value">{maintenanceRecords.filter(m => m.status === 'planned').length}</p>
          </div>
          <div className="stat-item">
            <h4>Alertes actives</h4>
            <p className="stat-value alert">{technicalAlerts.length}</p>
          </div>
          <div className="stat-item">
            <h4>Entretiens terminés</h4>
            <p className="stat-value success">{maintenanceRecords.filter(m => m.status === 'completed').length}</p>
          </div>
          <div className="stat-item">
            <h4>Réparations en cours</h4>
            <p className="stat-value info">{breakdowns.filter(b => b.status === 'in_progress').length}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'vehicles':
        return renderVehicleList();
      case 'vehicle-detail':
        return renderVehicleDetail();
      case 'maintenance':
        return renderMaintenance();
      case 'breakdowns':
        return renderBreakdowns();
      case 'alerts':
        return renderAlerts();
      case 'reports':
        return renderReports();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="maintenance-dashboard">
      {/* Sidebar Navigation */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>🔧 Maintenancier</h2>
        </div>
        <ul className="sidebar-menu">
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveSection('dashboard'); setSidebarOpen(false); }}
            >
              <span className="icon">🏠</span>
              <span className="text">Tableau de bord</span>
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'vehicles' ? 'active' : ''}`}
              onClick={() => { setActiveSection('vehicles'); setSidebarOpen(false); }}
            >
              <span className="icon">🚗</span>
              <span className="text">Véhicules</span>
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'maintenance' ? 'active' : ''}`}
              onClick={() => { setActiveSection('maintenance'); setSidebarOpen(false); }}
            >
              <span className="icon">🔧</span>
              <span className="text">Entretiens</span>
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'breakdowns' ? 'active' : ''}`}
              onClick={() => { setActiveSection('breakdowns'); setSidebarOpen(false); }}
            >
              <span className="icon">🚫</span>
              <span className="text">Réparations / Pannes</span>
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'alerts' ? 'active' : ''}`}
              onClick={() => { setActiveSection('alerts'); setSidebarOpen(false); }}
            >
              <span className="icon">⚠️</span>
              <span className="text">Alertes</span>
              {technicalAlerts.length > 0 && <span className="badge">{technicalAlerts.length}</span>}
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${activeSection === 'reports' ? 'active' : ''}`}
              onClick={() => { setActiveSection('reports'); setSidebarOpen(false); }}
            >
              <span className="icon">📊</span>
              <span className="text">Rapports</span>
            </button>
          </li>
          <li>
            <button
              className="sidebar-btn"
              onClick={() => {
                if (window.confirm('Déconnexion ?')) {
                  localStorage.removeItem('token');
                  window.location.reload();
                }
              }}
            >
              <span className="icon">🚪</span>
              <span className="text">Déconnexion</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Main Content */}
      <main className="main-content">
        <header className="content-header">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span className="hamburger"></span>
            <span className="hamburger"></span>
            <span className="hamburger"></span>
          </button>
          <h1>
            {activeSection === 'dashboard' && 'Tableau de bord maintenancier'}
            {activeSection === 'vehicles' && 'Liste des véhicules'}
            {activeSection === 'vehicle-detail' && 'Fiche technique du véhicule'}
            {activeSection === 'maintenance' && 'Gestion des entretiens'}
            {activeSection === 'breakdowns' && 'Gestion des pannes'}
            {activeSection === 'alerts' && 'Alertes techniques'}
            {activeSection === 'reports' && 'Rapports techniques'}
          </h1>
        </header>

        <div className="content-body">
          {loading ? <div className="loading">Chargement...</div> : renderSection()}
        </div>
      </main>
    </div>
  );
}

export default MaintenanceDashboard;
