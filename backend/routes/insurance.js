const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET all insurance
router.get('/', (req, res) => {
  db.all('SELECT * FROM insurance', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ insurance: rows });
  });
});

// GET insurance by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM insurance WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Insurance not found' });
      return;
    }
    res.json({ insurance: row });
  });
});

// POST create insurance
router.post('/', (req, res) => {
  const { vehicle_id, policy_number, provider, start_date, end_date, premium } = req.body;
  db.run('INSERT INTO insurance (vehicle_id, policy_number, provider, start_date, end_date, premium) VALUES (?, ?, ?, ?, ?, ?)',
    [vehicle_id, policy_number, provider, start_date, end_date, premium], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

// PUT update insurance
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { vehicle_id, policy_number, provider, start_date, end_date, premium } = req.body;
  db.run('UPDATE insurance SET vehicle_id = ?, policy_number = ?, provider = ?, start_date = ?, end_date = ?, premium = ? WHERE id = ?',
    [vehicle_id, policy_number, provider, start_date, end_date, premium, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// DELETE insurance
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM insurance WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

module.exports = router;