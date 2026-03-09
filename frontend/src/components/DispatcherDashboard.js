import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';

function DispatcherDashboard({ user, vehicles, drivers }) {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const socketRef = useRef(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);

  // Assignment form state
  const [assignmentForm, setAssignmentForm] = useState({
    vehicle_id: '',
    driver_id: '',
    final_price: ''
  });

  useEffect(() => {
    loadData();
    initSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const initSocket = () => {
    try {
      const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
      const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Dispatcher socket connected');
      });

      socket.on('service_request:created', (request) => {
        setServiceRequests(prev => [request, ...prev]);
      });

      socket.on('service_request:assigned', (request) => {
        setServiceRequests(prev => prev.map(r => r.id === request.id ? request : r));
      });

      socket.on('service_request:updated', (request) => {
        setServiceRequests(prev => prev.map(r => r.id === request.id ? request : r));
      });
    } catch (e) {
      console.error('Socket error:', e);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsRes, statsRes] = await Promise.all([
        api.getServiceRequests(),
        api.getServiceRequestStats()
      ]);
      setServiceRequests(requestsRes.service_requests || []);
      setStats(statsRes.stats || {});
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (requestId) => {
    if (!assignmentForm.vehicle_id || !assignmentForm.driver_id) {
      alert('Veuillez selectionner un vehicule et un chauffeur');
      return;
    }

    try {
      await api.assignServiceRequest(requestId, {
        vehicle_id: parseInt(assignmentForm.vehicle_id),
        driver_id: parseInt(assignmentForm.driver_id),
        assigned_dispatcher_id: user?.id
      });
      alert('Demande assignee avec succes');
      setAssignmentForm({ vehicle_id: '', driver_id: '', final_price: '' });
      setSelectedRequest(null);
      loadData();
    } catch (error) {
      console.error('Error assigning request:', error);
      alert('Erreur lors de l\'assignation');
    }
  };

  const handleUpdateStatus = async (requestId, newStatus, finalPrice = null) => {
    try {
      await api.updateServiceRequestStatus(requestId, {
        status: newStatus,
        final_price: finalPrice
      });
      alert('Statut mis a jour');
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise a jour du statut');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { class: 'status-pending', label: 'En attente' },
      assigned: { class: 'status-assigned', label: 'Assigne' },
      in_progress: { class: 'status-progress', label: 'En cours' },
      completed: { class: 'status-completed', label: 'Termine' },
      cancelled: { class: 'status-cancelled', label: 'Annule' }
    };
    const s = statusMap[status] || { class: '', label: status };
    return <span className={`status-badge ${s.class}`}>{s.label}</span>;
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      high: { class: 'priority-high', label: 'Urgence' },
      normal: { class: 'priority-normal', label: 'Normal' },
      low: { class: 'priority-low', label: 'Basse' }
    };
    const p = priorityMap[priority] || { class: '', label: priority };
    return <span className={`priority-badge ${p.class}`}>{p.label}</span>;
  };

  // Filter requests
  const filteredRequests = serviceRequests.filter(req => {
    const matchesSearch = searchQuery === '' || 
      req.requester_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.pickup_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.dropoff_location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || req.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  // Available vehicles (active status)
  const availableVehicles = vehicles.filter(v => v.status === 'active');
  // Available drivers
  const availableDrivers = drivers;

  if (loading) {
    return <div className="loading">Chargement du dispatcher...</div>;
  }

  return (
    <div className="dispatcher-dashboard">
      <div className="dashboard-header">
        <h2>Tableau de Bord Dispatcher - CICR</h2>
        <button className="btn-secondary" onClick={loadData}>Actualiser</button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>{stats.total || 0}</h3>
            <p>Total demandes</p>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>{stats.pending || 0}</h3>
            <p>En attente</p>
          </div>
        </div>
        <div className="stat-card assigned">
          <div className="stat-icon">🚗</div>
          <div className="stat-info">
            <h3>{stats.assigned || 0}</h3>
            <p>Assignees</p>
          </div>
        </div>
        <div className="stat-card progress">
          <div className="stat-icon">🔄</div>
          <div className="stat-info">
            <h3>{stats.in_progress || 0}</h3>
            <p>En cours</p>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{stats.completed || 0}</h3>
            <p>Terminees</p>
          </div>
        </div>
        <div className="stat-card urgent">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <h3>{stats.high_priority || 0}</h3>
            <p>Urgences</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <input
          type="text"
          placeholder="Rechercher par nom, lieu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="assigned">Assigne</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Termine</option>
          <option value="cancelled">Annule</option>
        </select>
      </div>

      {/* Requests List */}
      <div className="requests-section">
        <h3>Demandes de Services</h3>
        {filteredRequests.length === 0 ? (
          <p className="no-data">Aucune demande trouvee</p>
        ) : (
          <div className="requests-grid">
            {filteredRequests.map(request => (
              <div key={request.id} className={`request-card status-${request.status} priority-${request.priority}`}>
                <div className="request-header">
                  <span className="request-id">#{request.id}</span>
                  {getPriorityBadge(request.priority)}
                  {getStatusBadge(request.status)}
                </div>
                
                <div className="request-body">
                  <h4>{request.service_name || 'Service #' + request.service_id}</h4>
                  <p className="requester">
                    <strong>Demandeur:</strong> {request.requester_name}
                    <br />
                    <small>{request.requester_contact}</small>
                  </p>
                  
                  <div className="location-info">
                    <p><strong>De:</strong> {request.pickup_location || 'Non specifie'}</p>
                    <p><strong>A:</strong> {request.dropoff_location || 'Non specifie'}</p>
                  </div>
                  
                  <p className="schedule">
                    <strong>Date:</strong> {request.scheduled_date || 'Non specifiee'}
                    {request.scheduled_time && ` a ${request.scheduled_time}`}
                  </p>
                  
                  <p className="price">
                    <strong>Prix estime:</strong> {request.estimated_price?.toLocaleString() || 0} CDF
                  </p>
                  
                  {request.vehicle_id && request.driver_id && (
                    <div className="assignment-info">
                      <p><strong>Vehicule:</strong> {request.vehicle_make} {request.license_plate}</p>
                      <p><strong>Chauffeur:</strong> {request.driver_name}</p>
                    </div>
                  )}
                  
                  {request.notes && (
                    <p className="notes"><strong>Notes:</strong> {request.notes}</p>
                  )}
                </div>

                <div className="request-actions">
                  {request.status === 'pending' && (
                    <button 
                      className="btn-primary"
                      onClick={() => setSelectedRequest(request)}
                    >
                      Assigner
                    </button>
                  )}
                  
                  {request.status === 'assigned' && (
                    <button 
                      className="btn-warning"
                      onClick={() => handleUpdateStatus(request.id, 'in_progress')}
                    >
                      Demarrer
                    </button>
                  )}
                  
                  {request.status === 'in_progress' && (
                    <button 
                      className="btn-success"
                      onClick={() => {
                        const price = prompt('Prix final (CDF):', request.estimated_price);
                        if (price) handleUpdateStatus(request.id, 'completed', parseFloat(price));
                      }}
                    >
                      Terminer
                    </button>
                  )}
                  
                  {(request.status === 'pending' || request.status === 'assigned') && (
                    <button 
                      className="btn-danger"
                      onClick={() => setCancelConfirmId(request.id)}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Assigner la demande #{selectedRequest.id}</h3>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>x</button>
            </div>
            
            <div className="modal-body">
              <div className="request-summary">
                <p><strong>Service:</strong> {selectedRequest.service_name}</p>
                <p><strong>Demandeur:</strong> {selectedRequest.requester_name}</p>
                <p><strong>De:</strong> {selectedRequest.pickup_location}</p>
                <p><strong>A:</strong> {selectedRequest.dropoff_location}</p>
              </div>

              <div className="form-group">
                <label>Vehicule *</label>
                <select
                  value={assignmentForm.vehicle_id}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, vehicle_id: e.target.value }))}
                  required
                >
                  <option value="">Selectionner un vehicule</option>
                  {availableVehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} ({vehicle.license_plate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Chauffeur *</label>
                <select
                  value={assignmentForm.driver_id}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, driver_id: e.target.value }))}
                  required
                >
                  <option value="">Selectionner un chauffeur</option>
                  {availableDrivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ({driver.license_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Prix final (CDF)</label>
                <input
                  type="number"
                  value={assignmentForm.final_price}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, final_price: e.target.value }))}
                  placeholder={selectedRequest.estimated_price}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedRequest(null)}>Annuler</button>
              <button className="btn-primary" onClick={() => handleAssign(selectedRequest.id)}>
                Confirmer l'assignation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirmer l'annulation</h3>
              <button className="close-btn" onClick={() => setCancelConfirmId(null)}>x</button>
            </div>
            <div className="modal-body">
              <p>Voulez-vous vraiment annuler cette demande?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setCancelConfirmId(null)}>Non</button>
              <button className="btn-danger" onClick={() => {
                handleUpdateStatus(cancelConfirmId, 'cancelled');
                setCancelConfirmId(null);
              }}>Oui, annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DispatcherDashboard;
