const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET all alerts
router.get('/', (req, res) => {
  db.all('SELECT * FROM alerts', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ alerts: rows });
  });
});

// GET alert by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM alerts WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.json({ alert: row });
  });
});

// POST create alert
router.post('/', (req, res) => {
  const { vehicle_id, type, message, created_date, resolved, driver_id, level } = req.body;
  db.run('INSERT INTO alerts (vehicle_id, type, message, created_date, resolved, driver_id, level) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [vehicle_id, type, message, created_date, resolved, driver_id, level], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const newAlertId = this.lastID;
    console.log('New alert created with ID:', newAlertId);
    console.log('Alert data:', { vehicle_id, type, message, created_date, resolved, driver_id, level });
    
    try {
      const io = req.app.get('io');
      if (io) {
        console.log('Emitting alert:created event from alerts route');
        io.emit('alert:created', {
          id: newAlertId,
          vehicle_id,
          type,
          message,
          created_date,
          resolved,
          driver_id,
          level
        });
        console.log('Alert:created event emitted successfully');
      } else {
        console.log('Socket.io not available in alerts route');
      }
    } catch (e) {
      console.error('Socket emit error (alert:created):', e);
    }
    res.json({ id: newAlertId });
  });
});

// PUT update alert
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { vehicle_id, type, message, created_date, resolved, driver_id, level } = req.body;
  db.run('UPDATE alerts SET vehicle_id = ?, type = ?, message = ?, created_date = ?, resolved = ?, driver_id = ?, level = ? WHERE id = ?',
    [vehicle_id, type, message, created_date, resolved, driver_id, level, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// DELETE alert
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM alerts WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// POST resolve alert
router.post('/:id/resolve', (req, res) => {
  const { id } = req.params;
  const { resolved_by } = req.body;
  const resolved_at = new Date().toISOString();
  db.run('UPDATE alerts SET resolved = 1, resolved_by = ?, resolved_at = ? WHERE id = ?', [resolved_by || null, resolved_at, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // emit socket event to notify clients
    try {
      const io = req.app.get('io');
      if (io) io.emit('alert:resolved', { id: Number(id), resolved_by: resolved_by || null, resolved_at });
    } catch (e) {
      console.error('Socket emit error (alert:resolved):', e);
    }
    res.json({ changes: this.changes, resolved_at });
  });
});

module.exports = router;