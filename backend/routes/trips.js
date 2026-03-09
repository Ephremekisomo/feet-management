const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET all trips
router.get('/', (req, res) => {
  db.all('SELECT * FROM trips', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ trips: rows });
  });
});

// GET trip by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM trips WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json({ trip: row });
  });
});

// GET positions for a trip
router.get('/:id/positions', (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM positions WHERE trip_id = ? ORDER BY timestamp ASC', [id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ positions: rows });
  });
});

// POST create trip
router.post('/', (req, res) => {
  const { vehicle_id, driver_id, start_date, end_date, start_odometer, end_odometer, distance, purpose } = req.body;
  db.run('INSERT INTO trips (vehicle_id, driver_id, start_date, end_date, start_odometer, end_odometer, distance, purpose) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [vehicle_id, driver_id, start_date, end_date, start_odometer, end_odometer, distance, purpose], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

// PUT update trip
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { vehicle_id, driver_id, start_date, end_date, start_odometer, end_odometer, distance, purpose } = req.body;
  db.run('UPDATE trips SET vehicle_id = ?, driver_id = ?, start_date = ?, end_date = ?, start_odometer = ?, end_odometer = ?, distance = ?, purpose = ? WHERE id = ?',
    [vehicle_id, driver_id, start_date, end_date, start_odometer, end_odometer, distance, purpose, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// PUT end trip
router.put('/:id/end', (req, res) => {
  const { id } = req.params;
  const { end_odometer } = req.body;
  const endTime = new Date().toISOString();

  // Update trip with end details
  db.run('UPDATE trips SET end_date = ?, end_time = ?, status = ?, end_odometer = ? WHERE id = ?',
    [endTime, endTime, 'completed', end_odometer || null, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    // Emit real-time event via socket.io
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('trip:end', { trip_id: Number(id), end_time: endTime, end_odometer: end_odometer || null });
      }
    } catch (e) {
      console.error('Socket emit error (trip:end):', e);
    }

    res.json({ changes: this.changes });
  });
});

// DELETE trip
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM trips WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

module.exports = router;