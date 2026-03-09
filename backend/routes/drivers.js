const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// haversine distance (km)
function haversine(lat1, lon1, lat2, lon2) {
  function toRad(x) { return x * Math.PI / 180; }
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// GET all drivers
router.get('/', (req, res) => {
  // include linked username when available
  db.all('SELECT d.*, u.username AS username FROM drivers d LEFT JOIN users u ON d.user_id = u.id', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ drivers: rows });
  });
});

// GET driver by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT d.*, u.username AS username FROM drivers d LEFT JOIN users u ON d.user_id = u.id WHERE d.id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }
    res.json({ driver: row });
  });
});

// POST create driver (optionally link to a user via user_id)
router.post('/', (req, res) => {
  const { name, license_number, contact_info, user_id } = req.body;
  db.run('INSERT INTO drivers (name, license_number, contact_info, user_id) VALUES (?, ?, ?, ?)',
    [name, license_number, contact_info, user_id || null], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

// POST driver location (used by driver app to send GPS updates)
router.post('/:id/location', (req, res) => {
  const { id } = req.params;
  const { lat, lng, timestamp, vehicle_id, trip_id } = req.body;
  const ts = timestamp || new Date().toISOString();

  const insertPosition = (vehicleId) => {
    // If trip_id provided, compute incremental distance from last position in that trip
    if (trip_id) {
      db.get('SELECT lat, lng FROM positions WHERE trip_id = ? ORDER BY timestamp DESC LIMIT 1', [trip_id], (err, lastPos) => {
        if (err) {
          // continue with insert even if distance calc fails
          console.error('Error fetching last position for trip', err.message);
          doInsert(0);
          return;
        }
        const deltaKm = lastPos ? haversine(lastPos.lat, lastPos.lng, lat, lng) : 0;
        doInsert(deltaKm);
      });
    } else {
      doInsert(0);
    }

    function doInsert(deltaKm) {
      db.run('INSERT INTO positions (vehicle_id, driver_id, trip_id, lat, lng, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [vehicleId, id, trip_id || null, lat, lng, ts], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        // Update last known position on vehicle (if vehicle known)
        if (vehicleId) {
          db.run('UPDATE vehicles SET last_lat = ?, last_lng = ?, last_seen = ? WHERE id = ?', [lat, lng, ts, vehicleId]);
        }

        // If part of a trip, update trips.distance and end_odometer (if start_odometer known)
        if (trip_id && deltaKm >= 0) {
          db.get('SELECT distance, start_odometer FROM trips WHERE id = ?', [trip_id], (err, tripRow) => {
            if (err) {
              console.error('Error fetching trip for distance update', err.message);
            } else {
              const prev = tripRow && tripRow.distance ? tripRow.distance : 0;
              const newDist = prev + deltaKm;
              if (tripRow && tripRow.start_odometer) {
                const endOdo = Math.round((tripRow.start_odometer || 0) + newDist);
                db.run('UPDATE trips SET distance = ?, end_odometer = ? WHERE id = ?', [newDist, endOdo, trip_id]);
              } else {
                db.run('UPDATE trips SET distance = ? WHERE id = ?', [newDist, trip_id]);
              }
            }
          });
        }

        // Emit real-time update via socket.io
        const io = req.app.get('io');
        if (io) {
          io.emit('location:update', { driver_id: Number(id), vehicle_id: vehicleId, trip_id: trip_id || null, lat, lng, timestamp: ts });
        }

        res.json({ id: this.lastID });
      });
    }
  };

  if (vehicle_id) {
    insertPosition(vehicle_id);
  } else {
    // Try to find assigned vehicle for this driver
    db.get('SELECT id FROM vehicles WHERE driver_id = ?', [id], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const vehicleId = row ? row.id : null;
      insertPosition(vehicleId);
    });
  }
});

// PUT update driver (can update user_id as well)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, license_number, contact_info, user_id } = req.body;
  db.run('UPDATE drivers SET name = ?, license_number = ?, contact_info = ?, user_id = ? WHERE id = ?',
    [name, license_number, contact_info, user_id || null, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// DELETE driver
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM drivers WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

module.exports = router;