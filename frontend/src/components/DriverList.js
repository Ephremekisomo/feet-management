import React from 'react';

function DriverList({ drivers, onEdit, onDelete }) {
  return (
    <div>
      <h2>Drivers</h2>
      <ul>
        {drivers.map(driver => (
          <li key={driver.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{driver.name}</strong> — {driver.license_number}
                {driver.username ? <div style={{ color: '#9aa7b2', fontSize: '0.9em' }}>Login: {driver.username}</div> : null}
              </div>
              <div>
                <button className="edit-btn" onClick={() => onEdit(driver)}>Edit</button>
                <button className="delete-btn" onClick={() => onDelete(driver.id)}>Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DriverList;