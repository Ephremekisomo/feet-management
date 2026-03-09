const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET all fuel entries
router.get('/', (req, res) => {
  db.all('SELECT * FROM fuel_entries', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ fuel_entries: rows });
  });
});

// GET fuel entry by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM fuel_entries WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Fuel entry not found' });
      return;
    }
    res.json({ fuel_entry: row });
  });
});

// POST create fuel entry (supports driver_id and timestamp) 
router.post('/', (req, res) => {
  const { vehicle_id, driver_id, date, liters, cost_per_liter, total_cost, odometer, fuel_station, timestamp } = req.body;
  const ts = timestamp || new Date().toISOString();
  db.run('INSERT INTO fuel_entries (vehicle_id, driver_id, date, liters, cost_per_liter, total_cost, odometer, fuel_station, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [vehicle_id, driver_id, date, liters, cost_per_liter, total_cost, odometer, fuel_station, ts], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Emit real-time event via socket.io
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('fuel:added', { id: this.lastID, vehicle_id, driver_id, date, liters, cost_per_liter, total_cost, odometer, fuel_station, timestamp: ts });
      }
    } catch (e) {
      console.error('Socket emit error (fuel:added):', e);
    }

    res.json({ id: this.lastID });
  });
});

// PUT update fuel entry
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { vehicle_id, date, liters, cost_per_liter, total_cost, odometer, fuel_station } = req.body;
  db.run('UPDATE fuel_entries SET vehicle_id = ?, date = ?, liters = ?, cost_per_liter = ?, total_cost = ?, odometer = ?, fuel_station = ? WHERE id = ?',
    [vehicle_id, date, liters, cost_per_liter, total_cost, odometer, fuel_station, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// DELETE fuel entry
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM fuel_entries WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

module.exports = router;