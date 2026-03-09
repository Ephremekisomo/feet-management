import React, { useState, useEffect } from 'react';

function VehicleForm({ onSubmit, initialData, drivers = [] }) {
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    license_plate: '',
    vin: '',
    status: 'active',
    driver_id: '',
    acquisition_source: '',
    supplier: '',
    contract_number: '',
    acquisition_date: '',
    purchase_price: '',
    currency: '',
    engine_number: '',
    initial_odometer: '',
    initial_odometer_verified: false,
    fleet_number: '',
    documents: ''
  });
  const [initialAssignment, setInitialAssignment] = useState({ type: 'driver', driver_id: '', service: '' });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setInitialAssignment({
        type: initialData.initial_assignment_type || 'driver',
        driver_id: initialData.initial_assigned_driver_id || '',
        service: initialData.initial_assigned_service || ''
      });
    } else {
      setFormData({
        make: '',
        model: '',
        year: '',
        license_plate: '',
        vin: '',
        status: 'active',
        driver_id: '',
        acquisition_source: '',
        supplier: '',
        contract_number: '',
        acquisition_date: '',
        purchase_price: '',
        currency: '',
        engine_number: '',
        initial_odometer: '',
        initial_odometer_verified: false,
        fleet_number: '',
        documents: ''
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, initial_assignment_type: initialAssignment.type, initial_assigned_driver_id: initialAssignment.driver_id, initial_assigned_service: initialAssignment.service });
    if (!initialData) {
      setFormData({
        make: '',
        model: '',
        year: '',
        license_plate: '',
        vin: '',
        status: 'active',
        driver_id: '',
        acquisition_source: '',
        supplier: '',
        contract_number: '',
        acquisition_date: '',
        purchase_price: '',
        currency: '',
        engine_number: '',
        initial_odometer: '',
        initial_odometer_verified: false,
        fleet_number: '',
        documents: ''
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{initialData ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
      <input name="make" value={formData.make} onChange={handleChange} placeholder="Make" required />
      <input name="model" value={formData.model} onChange={handleChange} placeholder="Model" required />
      <input name="year" type="number" value={formData.year} onChange={handleChange} placeholder="Year" required />
      <input name="license_plate" value={formData.license_plate} onChange={handleChange} placeholder="License Plate" required />
      <input name="vin" value={formData.vin} onChange={handleChange} placeholder="VIN" required />
      <input name="acquisition_source" value={formData.acquisition_source} onChange={handleChange} placeholder="Acquisition source (Achat/Location/Don)" />
      <input name="supplier" value={formData.supplier} onChange={handleChange} placeholder="Supplier / Vendor" />
      <input name="contract_number" value={formData.contract_number} onChange={handleChange} placeholder="Contract number (if rental)" />
      <input name="acquisition_date" type="date" value={formData.acquisition_date} onChange={handleChange} placeholder="Acquisition date" />
      <input name="purchase_price" type="number" value={formData.purchase_price} onChange={handleChange} placeholder="Purchase price" />
      <input name="currency" value={formData.currency} onChange={handleChange} placeholder="Currency" />
      <input name="engine_number" value={formData.engine_number} onChange={handleChange} placeholder="Engine number" />
      <input name="initial_odometer" type="number" value={formData.initial_odometer} onChange={handleChange} placeholder="Initial odometer" />
      <label>
        <input name="initial_odometer_verified" type="checkbox" checked={formData.initial_odometer_verified} onChange={handleChange} /> Initial odometer verified
      </label>
      <input name="fleet_number" value={formData.fleet_number} onChange={handleChange} placeholder="Fleet number" />
      <input name="documents" value={formData.documents} onChange={handleChange} placeholder="Documents (JSON or URLs)" />
      <h4>Documents</h4>
      <input name="insurance_doc" value={formData.insurance_doc || ''} onChange={handleChange} placeholder="Insurance doc URL or JSON" />
      <input name="vignette_doc" value={formData.vignette_doc || ''} onChange={handleChange} placeholder="Vignette doc URL or JSON" />
      <input name="carte_grise_doc" value={formData.carte_grise_doc || ''} onChange={handleChange} placeholder="Carte grise doc URL or JSON" />

      <h4>Affectation initiale</h4>
      <select value={initialAssignment.type} onChange={(e) => setInitialAssignment({ ...initialAssignment, type: e.target.value })}>
        <option value="driver">Chauffeur</option>
        <option value="service">Service</option>
        <option value="none">Aucune</option>
      </select>
      {initialAssignment.type === 'driver' && (
        <select value={initialAssignment.driver_id} onChange={(e) => setInitialAssignment({ ...initialAssignment, driver_id: e.target.value })}>
          <option value="">Aucun</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
      {initialAssignment.type === 'service' && (
        <input value={initialAssignment.service} onChange={(e) => setInitialAssignment({ ...initialAssignment, service: e.target.value })} placeholder="Service name" />
      )}
      <select name="status" value={formData.status} onChange={handleChange}>
        <option value="active">Active</option>
        <option value="maintenance">Maintenance</option>
        <option value="inactive">Inactive</option>
      </select>
      <select name="driver_id" value={formData.driver_id} onChange={handleChange}>
        <option value="">No Driver Assigned</option>
        {drivers.map(driver => (
          <option key={driver.id} value={driver.id}>{driver.name} ({driver.license_number})</option>
        ))}
      </select>
      <button type="submit">{initialData ? 'Update' : 'Add'}</button>
    </form>
  );
}

export default VehicleForm;