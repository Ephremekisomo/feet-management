const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET all vehicles
router.get('/', (req, res) => {
  db.all('SELECT * FROM vehicles', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ vehicles: rows });
  });
});

// GET vehicle by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM vehicles WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    res.json({ vehicle: row });
  });
});

// POST create vehicle
router.post('/', (req, res) => {
  const {
    make, model, year, license_plate, vin,
    acquisition_source, supplier, contract_number, acquisition_date,
    purchase_price, currency, engine_number,
    initial_odometer, initial_odometer_verified,
    status, driver_id, fleet_number, documents,
    insurance_doc, vignette_doc, carte_grise_doc,
    initial_assignment_type, initial_assigned_driver_id, initial_assigned_service
  } = req.body;

  const sql = `INSERT INTO vehicles (
    make, model, year, license_plate, vin,
    acquisition_source, supplier, contract_number, acquisition_date,
    purchase_price, currency, engine_number,
    initial_odometer, initial_odometer_verified,
    status, driver_id, fleet_number, documents,
    insurance_doc, vignette_doc, carte_grise_doc,
    initial_assignment_type, initial_assigned_driver_id, initial_assigned_service
  ) VALUES (${new Array(24).fill('?').join(', ')})`;

  const params = [
    make, model, year, license_plate, vin,
    acquisition_source, supplier, contract_number, acquisition_date,
    purchase_price, currency, engine_number,
    initial_odometer, initial_odometer_verified,
    status, driver_id, fleet_number, documents,
    insurance_doc, vignette_doc, carte_grise_doc,
    initial_assignment_type, initial_assigned_driver_id, initial_assigned_service
  ];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const createdId = this.lastID;
    db.get('SELECT * FROM vehicles WHERE id = ?', [createdId], (err2, row) => {
      if (!err2 && row) {
        try {
          const io = req.app.get('io');
          if (io) io.emit('vehicle_created', row);
        } catch (e) {}
      }
      res.json({ id: createdId });
    });
  });
});

// PUT update vehicle
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    make, model, year, license_plate, vin,
    acquisition_source, supplier, contract_number, acquisition_date,
    purchase_price, currency, engine_number,
    initial_odometer, initial_odometer_verified,
    status, driver_id, fleet_number, documents,
    insurance_doc, vignette_doc, carte_grise_doc,
    initial_assignment_type, initial_assigned_driver_id, initial_assigned_service
  } = req.body;

  const sql = `UPDATE vehicles SET
    make = ?, model = ?, year = ?, license_plate = ?, vin = ?,
    acquisition_source = ?, supplier = ?, contract_number = ?, acquisition_date = ?,
    purchase_price = ?, currency = ?, engine_number = ?,
    initial_odometer = ?, initial_odometer_verified = ?,
    status = ?, driver_id = ?, fleet_number = ?, documents = ?,
    insurance_doc = ?, vignette_doc = ?, carte_grise_doc = ?,
    initial_assignment_type = ?, initial_assigned_driver_id = ?, initial_assigned_service = ?
    WHERE id = ?`;

  const params = [
    make, model, year, license_plate, vin,
    acquisition_source, supplier, contract_number, acquisition_date,
    purchase_price, currency, engine_number,
    initial_odometer, initial_odometer_verified,
    status, driver_id, fleet_number, documents,
    insurance_doc, vignette_doc, carte_grise_doc,
    initial_assignment_type, initial_assigned_driver_id, initial_assigned_service,
    id
  ];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    db.get('SELECT * FROM vehicles WHERE id = ?', [id], (err2, row) => {
      if (!err2 && row) {
        try {
          const io = req.app.get('io');
          if (io) io.emit('vehicle_updated', row);
        } catch (e) {}
      }
      res.json({ changes: this.changes });
    });
  });
});

// DELETE vehicle
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM vehicles WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

module.exports = router;