const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET incidents (alerts with type 'incident')
router.get('/', (req, res) => {
  db.all("SELECT * FROM alerts WHERE type = 'incident' ORDER BY created_date DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ incidents: rows });
  });
});

// POST create incident (from driver or maintenance)
router.post('/', (req, res) => {
  const { driver_id, vehicle_id, message, photo_url, level, lat: bodyLat, lng: bodyLng, timestamp: bodyTs, description, diagnosis, status } = req.body;
  const ts = bodyTs || new Date().toISOString();
  const lvl = level || 'high';
  
  // Try to get latest position for driver (if any) before inserting if client didn't provide coords
  const getLatestPos = (driverId) => {
    return new Promise((resolve) => {
      if (!driverId) return resolve(null);
      db.get('SELECT lat, lng, vehicle_id, timestamp FROM positions WHERE driver_id = ? ORDER BY timestamp DESC LIMIT 1', [driverId], (err, row) => {
        if (err || !row) return resolve(null);
        resolve(row);
      });
    });
  };

  (async () => {
    const latest = await getLatestPos(driver_id);
    // Prefer coordinates sent by client, fallback to latest in DB
    const lat = (typeof bodyLat !== 'undefined' && bodyLat !== null) ? bodyLat : (latest ? latest.lat : null);
    const lng = (typeof bodyLng !== 'undefined' && bodyLng !== null) ? bodyLng : (latest ? latest.lng : null);
    const posVehicleId = vehicle_id || (latest ? latest.vehicle_id : null);
    
    // Use description or message
    const finalMessage = description || message || 'Incident signalé';

    db.run('INSERT INTO alerts (vehicle_id, driver_id, lat, lng, type, message, created_date, resolved, level, source) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
      [posVehicleId, driver_id, lat, lng, 'incident', finalMessage, ts, lvl, 'maintenance'], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Emit real-time event via socket.io (include lat/lng if present)
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('incident:reported', {
          id: this.lastID,
          vehicle_id: posVehicleId,
          driver_id,
          message: finalMessage,
          description: finalMessage,
          diagnosis,
          status: status || 'reported',
          photo_url,
          timestamp: ts,
          level: lvl,
          lat,
          lng
        });
      }
    } catch (e) {
      console.error('Socket emit error (incident:reported):', e);
    }

    res.json({ id: this.lastID, vehicle_id: posVehicleId, status: status || 'reported' });
  });
  })();
});

// PUT update incident
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { status, diagnosis, message } = req.body;
  
  let updateQuery = 'UPDATE alerts SET ';
  const updateParams = [];
  
  if (status) {
    updateQuery += 'resolved = ?, ';
    updateParams.push(status === 'resolved' ? 1 : 0);
  }
  
  if (message) {
    updateQuery += 'message = ?, ';
    updateParams.push(message);
  }
  
  // Remove trailing comma and space
  updateQuery = updateQuery.slice(0, -2);
  updateQuery += ' WHERE id = ?';
  updateParams.push(id);
  
  db.run(updateQuery, updateParams, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

module.exports = router;