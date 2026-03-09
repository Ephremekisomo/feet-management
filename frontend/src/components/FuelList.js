import React from 'react';

function FuelList({ fuelEntries, onEdit, onDelete }) {
  return (
    <div>
      <h2>Fuel Entries</h2>
      <ul>
        {fuelEntries.map(entry => (
          <li key={entry.id}>
            Vehicle {entry.vehicle_id}: {entry.liters}L on {entry.date} - {entry.total_cost}€
            <div>
              <button className="edit-btn" onClick={() => onEdit(entry)}>Edit</button>
              <button className="delete-btn" onClick={() => onDelete(entry.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FuelList;