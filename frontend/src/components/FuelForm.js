import React, { useState, useEffect } from 'react';

function FuelForm({ onSubmit, initialData, vehicles }) {
  const [formData, setFormData] = useState({
    vehicle_id: '',
    date: '',
    liters: '',
    cost_per_liter: '',
    total_cost: '',
    odometer: '',
    fuel_station: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        vehicle_id: '',
        date: '',
        liters: '',
        cost_per_liter: '',
        total_cost: '',
        odometer: '',
        fuel_station: ''
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'liters' || name === 'cost_per_liter') {
        const liters = parseFloat(newData.liters) || 0;
        const costPerLiter = parseFloat(newData.cost_per_liter) || 0;
        newData.total_cost = (liters * costPerLiter).toFixed(2);
      }
      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    if (!initialData) {
      setFormData({
        vehicle_id: '',
        date: '',
        liters: '',
        cost_per_liter: '',
        total_cost: '',
        odometer: '',
        fuel_station: ''
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{initialData ? 'Edit Fuel Entry' : 'Add Fuel Entry'}</h2>
      <select name="vehicle_id" value={formData.vehicle_id} onChange={handleChange} required>
        <option value="">Select Vehicle</option>
        {vehicles.map(vehicle => (
          <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} - {vehicle.license_plate}</option>
        ))}
      </select>
      <input name="date" type="date" value={formData.date} onChange={handleChange} required />
      <input name="liters" type="number" step="0.01" value={formData.liters} onChange={handleChange} placeholder="Liters" required />
      <input name="cost_per_liter" type="number" step="0.01" value={formData.cost_per_liter} onChange={handleChange} placeholder="Cost per Liter" required />
      <input name="total_cost" type="number" step="0.01" value={formData.total_cost} onChange={handleChange} placeholder="Total Cost" readOnly />
      <input name="odometer" type="number" value={formData.odometer} onChange={handleChange} placeholder="Odometer" required />
      <input name="fuel_station" value={formData.fuel_station} onChange={handleChange} placeholder="Fuel Station" />
      <button type="submit">{initialData ? 'Update' : 'Add'}</button>
    </form>
  );
}

export default FuelForm;