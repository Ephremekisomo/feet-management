import React from 'react';

function VehicleList({ vehicles, onEdit, onDelete, drivers = [] }) {
  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : '—';
  };

  return (
    <div>
      <h2>Vehicles</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>#</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Make / Model</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Year</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>License</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>VIN</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Acquisition</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Price</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Engine#</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Initial km</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Driver / Fleet</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Docs</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Initial assign.</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v, idx) => (
              <tr key={v.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>{v.make} {v.model}</strong></td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{v.year || '—'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{v.license_plate || '—'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{v.vin || '—'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{v.acquisition_source || '—'} {v.supplier ? `- ${v.supplier}` : ''} {v.acquisition_date ? `(${v.acquisition_date})` : ''}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{v.purchase_price ? `${v.purchase_price} ${v.currency || ''}` : '—'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{v.engine_number || '—'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{v.initial_odometer || '—'} {v.initial_odometer_verified ? '✓' : ''}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{v.status || '—'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{getDriverName(v.driver_id)} / {v.fleet_number || '—'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>Ins: {v.insurance_doc ? 'Yes' : 'No'}<br/>Vig: {v.vignette_doc ? 'Yes' : 'No'}<br/>CG: {v.carte_grise_doc ? 'Yes' : 'No'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{v.initial_assignment_type === 'driver' ? (v.initial_assigned_driver_id ? getDriverName(v.initial_assigned_driver_id) : '—') : (v.initial_assignment_type === 'service' ? v.initial_assigned_service || '—' : '—')}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <button className="edit-btn" onClick={() => onEdit(v)} style={{ marginRight: 8 }}>Edit</button>
                  <button className="delete-btn" onClick={() => onDelete(v.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VehicleList;