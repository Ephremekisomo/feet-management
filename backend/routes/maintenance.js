const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET all maintenance
router.get('/', (req, res) => {
  db.all('SELECT * FROM maintenance', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ maintenance: rows });
  });
});

// GET maintenance by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM maintenance WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Maintenance not found' });
      return;
    }
    res.json({ maintenance: row });
  });
});

// POST create maintenance
router.post('/', (req, res) => {
  const { vehicle_id, date, type, description, cost, next_service_date, next_service_mileage, scheduled_date, status } = req.body;
  db.run('INSERT INTO maintenance (vehicle_id, date, type, description, cost, next_service_date, next_service_mileage, scheduled_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [vehicle_id, date, type, description, cost, next_service_date, next_service_mileage, scheduled_date, status || 'planned'], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Get the created maintenance record
    db.get('SELECT * FROM maintenance WHERE id = ?', [this.lastID], (err, row) => {
      if (!err && row) {
        // Emit socket event to notify clients
        const io = req.app.get('io');
        io.emit('maintenance:created', row);
      }
    });

    res.json({ id: this.lastID });
  });
});

// PUT update maintenance
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { vehicle_id, date, type, description, cost, next_service_date, next_service_mileage, scheduled_date, status } = req.body;
  db.run('UPDATE maintenance SET vehicle_id = ?, date = ?, type = ?, description = ?, cost = ?, next_service_date = ?, next_service_mileage = ?, scheduled_date = ?, status = ? WHERE id = ?',
    [vehicle_id, date, type, description, cost, next_service_date, next_service_mileage, scheduled_date, status, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Get the updated maintenance record
    db.get('SELECT * FROM maintenance WHERE id = ?', [id], (err, row) => {
      if (!err && row) {
        // Emit socket event to notify clients
        const io = req.app.get('io');
        io.emit('maintenance:updated', row);
      }
    });

    res.json({ changes: this.changes });
  });
});

// DELETE maintenance
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM maintenance WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Emit socket event to notify clients
    const io = req.app.get('io');
    io.emit('maintenance:deleted', parseInt(id));

    res.json({ changes: this.changes });
  });
});

module.exports = router;