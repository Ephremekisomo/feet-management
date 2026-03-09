const cron = require('node-cron');
const db = require('./db/connection');

function initScheduler(io) {
  // Run daily at midnight
  cron.schedule('0 0 * * *', () => {
    console.log('Running daily alert check');
    checkMaintenanceAlerts(io);
    checkInsuranceAlerts(io);
  });
}

function checkMaintenanceAlerts(io) {
  const leadDays = 30;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + leadDays);
  const futureStr = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD

  db.all("SELECT * FROM maintenance WHERE next_service_date <= ? AND next_service_date >= date('now')", [futureStr], (err, rows) => {
    if (err) {
      console.error('Error checking maintenance alerts', err);
      return;
    }
    rows.forEach(m => {
      // Check if alert already exists
      db.get("SELECT id FROM alerts WHERE vehicle_id = ? AND type = 'maintenance' AND message LIKE ?", [m.vehicle_id, `%${m.next_service_date}%`], (err2, alertRow) => {
        if (err2) {
          console.error('Error checking existing alert', err2);
          return;
        }
        if (!alertRow) {
          // Create alert
          const message = `Maintenance due on ${m.next_service_date} for ${m.type}`;
          db.run('INSERT INTO alerts (vehicle_id, type, message, created_date, level, source) VALUES (?, ?, ?, ?, ?, ?)',
            [m.vehicle_id, 'maintenance', message, new Date().toISOString(), 'warning', 'scheduler'], function(err3) {
            if (err3) {
              console.error('Error creating maintenance alert', err3);
              return;
            }
            // Emit
            try {
              if (io) {
                io.emit('alert:created', { alert_id: this.lastID, type: 'maintenance', level: 'warning', vehicle_id: m.vehicle_id, message });
              }
            } catch (e) {
              console.error('Socket emit error (alert:created):', e);
            }
          });
        }
      });
    });
  });
}

function checkInsuranceAlerts(io) {
  const leadDays = 30;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + leadDays);
  const futureStr = futureDate.toISOString().split('T')[0];

  db.all("SELECT * FROM insurance WHERE end_date <= ? AND end_date >= date('now')", [futureStr], (err, rows) => {
    if (err) {
      console.error('Error checking insurance alerts', err);
      return;
    }
    rows.forEach(i => {
      db.get("SELECT id FROM alerts WHERE vehicle_id = ? AND type = 'insurance' AND message LIKE ?", [i.vehicle_id, `%${i.end_date}%`], (err2, alertRow) => {
        if (err2) {
          console.error('Error checking existing insurance alert', err2);
          return;
        }
        if (!alertRow) {
          const message = `Insurance expires on ${i.end_date} for policy ${i.policy_number}`;
          db.run('INSERT INTO alerts (vehicle_id, type, message, created_date, level, source) VALUES (?, ?, ?, ?, ?, ?)',
            [i.vehicle_id, 'insurance', message, new Date().toISOString(), 'warning', 'scheduler'], function(err3) {
            if (err3) {
              console.error('Error creating insurance alert', err3);
              return;
            }
            try {
              if (io) {
                io.emit('alert:created', { alert_id: this.lastID, type: 'insurance', level: 'warning', vehicle_id: i.vehicle_id, message });
              }
            } catch (e) {
              console.error('Socket emit error (alert:created):', e);
            }
          });
        }
      });
    });
  });
}

module.exports = { initScheduler };