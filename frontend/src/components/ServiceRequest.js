import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

function ServiceRequest({ user, vehicles }) {
  const [services, setServices] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    service_id: '',
    requester_name: user?.username || '',
    requester_contact: '',
    pickup_location: '',
    pickup_lat: '',
    pickup_lng: '',
    dropoff_location: '',
    dropoff_lat: '',
    dropoff_lng: '',
    scheduled_date: '',
    scheduled_time: '',
    priority: 'normal',
    notes: '',
    vehicle_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [servicesRes, requestsRes] = await Promise.all([
        api.getServices(),
        api.getServiceRequests()
      ]);
      setServices(servicesRes.services || []);
      setMyRequests((requestsRes.service_requests || []).slice(0, 10));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceChange = (e) => {
    const serviceId = e.target.value;
    const service = services.find(s => s.id === parseInt(serviceId));
    setFormData(prev => ({
      ...prev,
      service_id: serviceId
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess('');

    try {
      const payload = {
        ...formData,
        pickup_lat: formData.pickup_lat ? parseFloat(formData.pickup_lat) : null,
        pickup_lng: formData.pickup_lng ? parseFloat(formData.pickup_lng) : null,
        dropoff_lat: formData.dropoff_lat ? parseFloat(formData.dropoff_lat) : null,
        dropoff_lng: formData.dropoff_lng ? parseFloat(formData.dropoff_lng) : null,
        vehicle_id: formData.vehicle_id || null
      };

      await api.createServiceRequest(payload);
      setSuccess('Demande de service envoyee avec succes au dispatcher!');
      setFormData({
        service_id: '',
        requester_name: user?.username || '',
        requester_contact: '',
        pickup_location: '',
        pickup_lat: '',
        pickup_lng: '',
        dropoff_location: '',
        dropoff_lat: '',
        dropoff_lng: '',
        scheduled_date: '',
        scheduled_time: '',
        priority: 'normal',
        notes: '',
        vehicle_id: ''
      });
      loadData();
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Erreur lors de l\'envoi de la demande');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return <div className="loading">Chargement des services...</div>;
  }

  return (
    <div className="service-request-dashboard">
      <div className="dashboard-header">
        <h2>Demandes de Services - CICR</h2>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Annuler' : 'Nouvelle Demande'}
        </button>
      </div>

      {success && (
        <div className="alert-success">
          {success}
          <button onClick={() => setSuccess('')}>x</button>
        </div>
      )}

      {showForm && (
        <div className="request-form-section">
          <h3>Nouvelle Demande de Service</h3>
          <form onSubmit={handleSubmit} className="service-form">
            <div className="form-row">
              <div className="form-group">
                <label>Service requis *</label>
                <select
                  name="service_id"
                  value={formData.service_id}
                  onChange={handleServiceChange}
                  required
                >
                  <option value="">Selectionner un service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Priorite</label>
                <select name="priority" value={formData.priority} onChange={handleChange}>
                  <option value="low">Basse</option>
                  <option value="normal">Normal</option>
                  <option value="high">Urgence</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nom du demandeur</label>
                <input
                  type="text"
                  name="requester_name"
                  value={formData.requester_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact (Telephone/Email)</label>
                <input
                  type="text"
                  name="requester_contact"
                  value={formData.requester_contact}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-section-title">Lieu de depart</div>
            <div className="form-row">
              <div className="form-group">
                <label>Adresse de ramassage</label>
                <input
                  type="text"
                  name="pickup_location"
                  value={formData.pickup_location}
                  onChange={handleChange}
                  placeholder="Ex: Siege CICR, Goma"
                />
              </div>

              <div className="form-group">
                <label>Vehicule requis (optionnel)</label>
                <select name="vehicle_id" value={formData.vehicle_id} onChange={handleChange}>
                  <option value="">Aucun vehicule specifique</option>
                  {vehicles.filter(v => v.status === 'active').map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} ({vehicle.license_plate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  name="pickup_lat"
                  value={formData.pickup_lat}
                  onChange={handleChange}
                  placeholder="Ex: -1.6787"
                />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  name="pickup_lng"
                  value={formData.pickup_lng}
                  onChange={handleChange}
                  placeholder="Ex: 29.2350"
                />
              </div>
            </div>

            <div className="form-section-title">Lieu de destination</div>
            <div className="form-row">
              <div className="form-group">
                <label>Adresse de destination</label>
                <input
                  type="text"
                  name="dropoff_location"
                  value={formData.dropoff_location}
                  onChange={handleChange}
                  placeholder="Ex: Aeroport de Goma"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Latitude destination</label>
                <input
                  type="number"
                  step="any"
                  name="dropoff_lat"
                  value={formData.dropoff_lat}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Longitude destination</label>
                <input
                  type="number"
                  step="any"
                  name="dropoff_lng"
                  value={formData.dropoff_lng}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date prevue</label>
                <input
                  type="date"
                  name="scheduled_date"
                  value={formData.scheduled_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Heure prevue</label>
                <input
                  type="time"
                  name="scheduled_time"
                  value={formData.scheduled_time}
                  onChange={handleChange}
                />
              </div>
            </div>



            <div className="form-group">
              <label>Notes supplementaires</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Informations complementaires..."
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Envoi en cours...' : 'Envoyer la demande'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="requests-list-section">
        <h3>Mes demandes de services</h3>
        {myRequests.length === 0 ? (
          <p className="no-data">Aucune demande de service. Cliquez sur "Nouvelle Demande" pour commencer.</p>
        ) : (
          <div className="requests-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Service</th>
                  <th>Date prevue</th>
                  <th>Statut</th>
                  <th>Priorite</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map(request => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>
                    <td>{request.service_name || 'Service #' + request.service_id}</td>
                    <td>
                      {request.scheduled_date ? (
                        <>{request.scheduled_date}{request.scheduled_time && ` a ${request.scheduled_time}`}</>
                      ) : '-'}
                    </td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>{getPriorityBadge(request.priority)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ServiceRequest;
