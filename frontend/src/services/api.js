const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';

export const api = {
  // Vehicles
  getVehicles: () => fetch(`${API_BASE}/vehicles`).then(res => res.json()),
  getVehicle: (id) => fetch(`${API_BASE}/vehicles/${id}`).then(res => res.json()),
  createVehicle: (data) => fetch(`${API_BASE}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateVehicle: (id, data) => fetch(`${API_BASE}/vehicles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteVehicle: (id) => fetch(`${API_BASE}/vehicles/${id}`, { method: 'DELETE' }).then(res => res.json()),

  // Drivers
  getDrivers: () => fetch(`${API_BASE}/drivers`).then(res => res.json()),
  getDriver: (id) => fetch(`${API_BASE}/drivers/${id}`).then(res => res.json()),
  createDriver: (data) => fetch(`${API_BASE}/drivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateDriver: (id, data) => fetch(`${API_BASE}/drivers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteDriver: (id) => fetch(`${API_BASE}/drivers/${id}`, { method: 'DELETE' }).then(res => res.json()),

  // Fuel
  getFuelEntries: () => fetch(`${API_BASE}/fuel`).then(res => res.json()),
  getFuelEntry: (id) => fetch(`${API_BASE}/fuel/${id}`).then(res => res.json()),
  createFuelEntry: (data) => fetch(`${API_BASE}/fuel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateFuelEntry: (id, data) => fetch(`${API_BASE}/fuel/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteFuelEntry: (id) => fetch(`${API_BASE}/fuel/${id}`, { method: 'DELETE' }).then(res => res.json()),
  // Driver location (fallback)
  sendDriverLocation: (driverId, data) => fetch(`${API_BASE}/drivers/${driverId}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),

  // Maintenance
  getMaintenance: () => fetch(`${API_BASE}/maintenance`).then(res => res.json()),
  getMaintenanceEntry: (id) => fetch(`${API_BASE}/maintenance/${id}`).then(res => res.json()),
  createMaintenance: (data) => fetch(`${API_BASE}/maintenance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateMaintenance: (id, data) => fetch(`${API_BASE}/maintenance/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteMaintenance: (id) => fetch(`${API_BASE}/maintenance/${id}`, { method: 'DELETE' }).then(res => res.json()),

  // Trips
  getTrips: () => fetch(`${API_BASE}/trips`).then(res => res.json()),
  getTrip: (id) => fetch(`${API_BASE}/trips/${id}`).then(res => res.json()),
  createTrip: (data) => fetch(`${API_BASE}/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  getTripPositions: (id) => fetch(`${API_BASE}/trips/${id}/positions`).then(res => res.json()),
  updateTrip: (id, data) => fetch(`${API_BASE}/trips/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteTrip: (id) => fetch(`${API_BASE}/trips/${id}`, { method: 'DELETE' }).then(res => res.json()),

  // Alerts
  getAlerts: () => fetch(`${API_BASE}/alerts`).then(res => res.json()),
  getAlert: (id) => fetch(`${API_BASE}/alerts/${id}`).then(res => res.json()),
  createAlert: (data) => fetch(`${API_BASE}/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateAlert: (id, data) => fetch(`${API_BASE}/alerts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteAlert: (id) => fetch(`${API_BASE}/alerts/${id}`, { method: 'DELETE' }).then(res => res.json()),
  resolveAlert: (id, data) => fetch(`${API_BASE}/alerts/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  }).then(res => res.json()),
  getUnresolvedAlerts: () => fetch(`${API_BASE}/alerts?unresolved=true`).then(res => res.json()),

  // Insurance
  getInsurance: () => fetch(`${API_BASE}/insurance`).then(res => res.json()),
  getInsuranceEntry: (id) => fetch(`${API_BASE}/insurance/${id}`).then(res => res.json()),
  createInsuranceEntry: (data) => fetch(`${API_BASE}/insurance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateInsuranceEntry: (id, data) => fetch(`${API_BASE}/insurance/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteInsuranceEntry: (id) => fetch(`${API_BASE}/insurance/${id}`, { method: 'DELETE' }).then(res => res.json()),

  // Incidents
  getIncidents: () => fetch(`${API_BASE}/incidents`).then(res => res.json()),
  createIncident: (data) => fetch(`${API_BASE}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateIncident: (id, data) => fetch(`${API_BASE}/incidents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),

  getUsers: () => fetch(`${API_BASE}/users`).then(res => res.json()),
  getUser: (id) => fetch(`${API_BASE}/users/${id}`).then(res => res.json()),
  createUser: (data) => fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateUser: (id, data) => fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteUser: (id) => fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' }).then(res => res.json()),
  login: (data) => fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),

  // Services
  getServices: () => fetch(`${API_BASE}/services`).then(res => res.json()),
  getService: (id) => fetch(`${API_BASE}/services/${id}`).then(res => res.json()),
  createService: (data) => fetch(`${API_BASE}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateService: (id, data) => fetch(`${API_BASE}/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteService: (id) => fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' }).then(res => res.json()),

  // Service Requests
  getServiceRequests: () => fetch(`${API_BASE}/service-requests`).then(res => res.json()),
  getServiceRequest: (id) => fetch(`${API_BASE}/service-requests/${id}`).then(res => res.json()),
  createServiceRequest: (data) => fetch(`${API_BASE}/service-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateServiceRequest: (id, data) => fetch(`${API_BASE}/service-requests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  assignServiceRequest: (id, data) => fetch(`${API_BASE}/service-requests/${id}/assign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  updateServiceRequestStatus: (id, data) => fetch(`${API_BASE}/service-requests/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  deleteServiceRequest: (id) => fetch(`${API_BASE}/service-requests/${id}`, { method: 'DELETE' }).then(res => res.json()),
  getServiceRequestStats: () => fetch(`${API_BASE}/service-requests/stats/summary`).then(res => res.json()),
};
