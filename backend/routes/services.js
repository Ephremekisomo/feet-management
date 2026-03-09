const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET all services
router.get('/', (req, res) => {
  db.all('SELECT * FROM services WHERE active = 1 ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ services: rows });
  });
});

// GET service by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM services WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    res.json({ service: row });
  });
});

// POST create service
router.post('/', (req, res) => {
  const { name, description, category, base_price, duration_estimate, active } = req.body;
  
  const sql = `INSERT INTO services (name, description, category, base_price, duration_estimate, active) 
               VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [name, description, category, base_price || 0, duration_estimate, active !== undefined ? active : 1];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Service created successfully' });
  });
});

// PUT update service
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, category, base_price, duration_estimate, active } = req.body;

  const sql = `UPDATE services SET 
               name = COALESCE(?, name), 
               description = COALESCE(?, description), 
               category = COALESCE(?, category), 
               base_price = COALESCE(?, base_price), 
               duration_estimate = COALESCE(?, duration_estimate), 
               active = COALESCE(?, active) 
               WHERE id = ?`;
  const params = [name, description, category, base_price, duration_estimate, active, id];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// DELETE service (soft delete - set active = 0)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('UPDATE services SET active = 0 WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// GET service categories
router.get('/categories/list', (req, res) => {
  db.all('SELECT DISTINCT category FROM services WHERE active = 1', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ categories: rows.map(r => r.category) });
  });
});

module.exports = router;
