const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET all service requests
router.get('/', (req, res) => {
  const { status, priority, vehicle_id, driver_id } = req.query;
  
  let sql = `
    SELECT 
      sr.*,
      s.name as service_name,
      s.description as service_description,
      s.category as service_category,
      v.make as vehicle_make,
      v.model as vehicle_model,
      v.license_plate,
      d.name as driver_name,
      d.license_number
    FROM service_requests sr
    LEFT JOIN services s ON sr.service_id = s.id
    LEFT JOIN vehicles v ON sr.vehicle_id = v.id
    LEFT JOIN drivers d ON sr.driver_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND sr.status = ?';
    params.push(status);
  }
  if (priority) {
    sql += ' AND sr.priority = ?';
    params.push(priority);
  }
  if (vehicle_id) {
    sql += ' AND sr.vehicle_id = ?';
    params.push(vehicle_id);
  }
  if (driver_id) {
    sql += ' AND sr.driver_id = ?';
    params.push(driver_id);
  }

  sql += ' ORDER BY sr.created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ service_requests: rows });
  });
});

// GET service request by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const sql = `
    SELECT 
      sr.*,
      s.name as service_name,
      s.description as service_description,
      v.make as vehicle_make,
      v.model as vehicle_model,
      v.license_plate,
      d.name as driver_name
    FROM service_requests sr
    LEFT JOIN services s ON sr.service_id = s.id
    LEFT JOIN vehicles v ON sr.vehicle_id = v.id
    LEFT JOIN drivers d ON sr.driver_id = d.id
    WHERE sr.id = ?
  `;
  
  db.get(sql, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Service request not found' });
      return;
    }
    res.json({ service_request: row });
  });
});

// POST create service request
router.post('/', (req, res) => {
  const {
    service_id,
    vehicle_id,
    driver_id,
    requester_name,
    requester_contact,
    pickup_location,
    pickup_lat,
    pickup_lng,
    dropoff_location,
    dropoff_lat,
    dropoff_lng,
    scheduled_date,
    scheduled_time,
    priority,
    notes,
    estimated_price
  } = req.body;

  const sql = `INSERT INTO service_requests (
    service_id, vehicle_id, driver_id, requester_name, requester_contact,
    pickup_location, pickup_lat, pickup_lng, dropoff_location, dropoff_lat, dropoff_lng,
    scheduled_date, scheduled_time, priority, notes, estimated_price, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`;

  const params = [
    service_id, vehicle_id, driver_id, requester_name, requester_contact,
    pickup_location, pickup_lat, pickup_lng, dropoff_location, dropoff_lat, dropoff_lng,
    scheduled_date, scheduled_time, priority || 'normal', notes, estimated_price
  ];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Get the created request
    db.get('SELECT * FROM service_requests WHERE id = ?', [this.lastID], (err2, row) => {
      if (err2) {
        res.json({ id: this.lastID, message: 'Service request created' });
        return;
      }
      
      // Emit socket event for real-time update
      try {
        const io = req.app.get('io');
        if (io) {
          io.emit('service_request:created', row);
        }
      } catch (e) {}
      
      res.json({ id: this.lastID, service_request: row });
    });
  });
});

// PUT update service request
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    service_id, vehicle_id, driver_id, requester_name, requester_contact,
    pickup_location, pickup_lat, pickup_lng, dropoff_location, dropoff_lat, dropoff_lng,
    scheduled_date, scheduled_time, status, priority, notes, estimated_price, final_price
  } = req.body;

  const sql = `UPDATE service_requests SET 
    service_id = COALESCE(?, service_id),
    vehicle_id = COALESCE(?, vehicle_id),
    driver_id = COALESCE(?, driver_id),
    requester_name = COALESCE(?, requester_name),
    requester_contact = COALESCE(?, requester_contact),
    pickup_location = COALESCE(?, pickup_location),
    pickup_lat = COALESCE(?, pickup_lat),
    pickup_lng = COALESCE(?, pickup_lng),
    dropoff_location = COALESCE(?, dropoff_location),
    dropoff_lat = COALESCE(?, dropoff_lat),
    dropoff_lng = COALESCE(?, dropoff_lng),
    scheduled_date = COALESCE(?, scheduled_date),
    scheduled_time = COALESCE(?, scheduled_time),
    status = COALESCE(?, status),
    priority = COALESCE(?, priority),
    notes = COALESCE(?, notes),
    estimated_price = COALESCE(?, estimated_price),
    final_price = COALESCE(?, final_price)
  WHERE id = ?`;

  const params = [
    service_id, vehicle_id, driver_id, requester_name, requester_contact,
    pickup_location, pickup_lat, pickup_lng, dropoff_location, dropoff_lat, dropoff_lng,
    scheduled_date, scheduled_time, status, priority, notes, estimated_price, final_price, id
  ];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// PUT assign vehicle and driver to service request (dispatcher action)
router.put('/:id/assign', (req, res) => {
  const { id } = req.params;
  const { vehicle_id, driver_id, assigned_dispatcher_id } = req.body;

  const sql = `UPDATE service_requests SET 
    vehicle_id = COALESCE(?, vehicle_id),
    driver_id = COALESCE(?, driver_id),
    assigned_dispatcher_id = COALESCE(?, assigned_dispatcher_id),
    assigned_at = datetime('now'),
    status = 'assigned'
  WHERE id = ?`;

  const params = [vehicle_id, driver_id, assigned_dispatcher_id, id];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Get updated request
    db.get('SELECT * FROM service_requests WHERE id = ?', [id], (err2, row) => {
      if (err2) {
        res.json({ changes: this.changes });
        return;
      }
      
      // Emit socket event
      try {
        const io = req.app.get('io');
        if (io) {
          io.emit('service_request:assigned', row);
        }
      } catch (e) {}
      
      res.json({ changes: this.changes, service_request: row });
    });
  });
});

// PUT update status of service request
router.put('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, final_price } = req.body;

  let sql = 'UPDATE service_requests SET status = ?';
  const params = [status];

  if (final_price !== undefined) {
    sql += ', final_price = ?';
    params.push(final_price);
  }

  if (status === 'completed') {
    sql += ", completed_at = datetime('now')";
  }

  sql += ' WHERE id = ?';
  params.push(id);

  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Get updated request
    db.get('SELECT * FROM service_requests WHERE id = ?', [id], (err2, row) => {
      if (err2) {
        res.json({ changes: this.changes });
        return;
      }
      
      // Emit socket event
      try {
        const io = req.app.get('io');
        if (io) {
          io.emit('service_request:updated', row);
        }
      } catch (e) {}
      
      res.json({ changes: this.changes, service_request: row });
    });
  });
});

// DELETE service request
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM service_requests WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
});

// GET statistics for dispatcher
router.get('/stats/summary', (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN priority = 'high' AND status != 'completed' AND status != 'cancelled' THEN 1 ELSE 0 END) as high_priority
    FROM service_requests
  `;
  
  db.get(sql, [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ stats: row });
  });
});

module.exports = router;
