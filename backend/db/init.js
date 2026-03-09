const db = require('./connection');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

db.serialize(async () => {
  db.exec(schema, async (err) => {
    if (err) {
      console.error('Error creating tables:', err);
      db.close();
    } else {
      console.log('Database initialized successfully');

      // Run migrations for adding columns to existing DBs
      const columnExists = (table, column) => {
        return new Promise((resolve, reject) => {
          db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
            if (err) return reject(err);
            const exists = rows.some(r => r.name === column);
            resolve(exists);
          });
        });
      };

      const runIfMissing = async (table, column, alterSQL) => {
        try {
          const exists = await columnExists(table, column);
          if (!exists) {
            console.log(`Adding column ${column} to ${table}`);
            db.run(alterSQL, (err) => {
              if (err) console.error(`Error adding column ${column} to ${table}:`, err);
            });
          }
        } catch (e) {
          console.error('Migration error:', e);
        }
      };

      // Columns to add if missing
      await runIfMissing('vehicles', 'last_lat', 'ALTER TABLE vehicles ADD COLUMN last_lat REAL;');
      await runIfMissing('vehicles', 'last_lng', 'ALTER TABLE vehicles ADD COLUMN last_lng REAL;');
      await runIfMissing('vehicles', 'last_seen', 'ALTER TABLE vehicles ADD COLUMN last_seen TEXT;');
      await runIfMissing('vehicles', 'current_status', "ALTER TABLE vehicles ADD COLUMN current_status TEXT;");

      await runIfMissing('trips', 'route', "ALTER TABLE trips ADD COLUMN route TEXT;");
      await runIfMissing('trips', 'status', "ALTER TABLE trips ADD COLUMN status TEXT;");
      await runIfMissing('trips', 'start_time', "ALTER TABLE trips ADD COLUMN start_time TEXT;");
      await runIfMissing('trips', 'end_time', "ALTER TABLE trips ADD COLUMN end_time TEXT;");

      await runIfMissing('alerts', 'level', "ALTER TABLE alerts ADD COLUMN level TEXT;");
      await runIfMissing('alerts', 'source', "ALTER TABLE alerts ADD COLUMN source TEXT;");
      await runIfMissing('alerts', 'resolved_by', "ALTER TABLE alerts ADD COLUMN resolved_by INTEGER;");
      await runIfMissing('alerts', 'resolved_at', "ALTER TABLE alerts ADD COLUMN resolved_at TEXT;");
      // Add driver and position columns to alerts if missing
      await runIfMissing('alerts', 'driver_id', "ALTER TABLE alerts ADD COLUMN driver_id INTEGER;");
      await runIfMissing('alerts', 'lat', "ALTER TABLE alerts ADD COLUMN lat REAL;");
      await runIfMissing('alerts', 'lng', "ALTER TABLE alerts ADD COLUMN lng REAL;");

      await runIfMissing('fuel_entries', 'driver_id', "ALTER TABLE fuel_entries ADD COLUMN driver_id INTEGER;");
      await runIfMissing('fuel_entries', 'timestamp', "ALTER TABLE fuel_entries ADD COLUMN timestamp TEXT;");

      // Add user_id to drivers if missing
      await runIfMissing('drivers', 'user_id', "ALTER TABLE drivers ADD COLUMN user_id INTEGER;");

      // Add acquisition and initial odometer fields to vehicles if missing
      await runIfMissing('vehicles', 'acquisition_source', "ALTER TABLE vehicles ADD COLUMN acquisition_source TEXT;");
      await runIfMissing('vehicles', 'supplier', "ALTER TABLE vehicles ADD COLUMN supplier TEXT;");
      await runIfMissing('vehicles', 'contract_number', "ALTER TABLE vehicles ADD COLUMN contract_number TEXT;");
      await runIfMissing('vehicles', 'acquisition_date', "ALTER TABLE vehicles ADD COLUMN acquisition_date TEXT;");
      await runIfMissing('vehicles', 'purchase_price', "ALTER TABLE vehicles ADD COLUMN purchase_price REAL;");
      await runIfMissing('vehicles', 'currency', "ALTER TABLE vehicles ADD COLUMN currency TEXT;");
      await runIfMissing('vehicles', 'engine_number', "ALTER TABLE vehicles ADD COLUMN engine_number TEXT;");
      await runIfMissing('vehicles', 'initial_odometer', "ALTER TABLE vehicles ADD COLUMN initial_odometer INTEGER;");
      await runIfMissing('vehicles', 'initial_odometer_verified', "ALTER TABLE vehicles ADD COLUMN initial_odometer_verified INTEGER DEFAULT 0;");
      await runIfMissing('vehicles', 'fleet_number', "ALTER TABLE vehicles ADD COLUMN fleet_number TEXT;");
      await runIfMissing('vehicles', 'documents', "ALTER TABLE vehicles ADD COLUMN documents TEXT;");
      await runIfMissing('vehicles', 'insurance_doc', "ALTER TABLE vehicles ADD COLUMN insurance_doc TEXT;");
      await runIfMissing('vehicles', 'vignette_doc', "ALTER TABLE vehicles ADD COLUMN vignette_doc TEXT;");
      await runIfMissing('vehicles', 'carte_grise_doc', "ALTER TABLE vehicles ADD COLUMN carte_grise_doc TEXT;");
      await runIfMissing('vehicles', 'initial_assignment_type', "ALTER TABLE vehicles ADD COLUMN initial_assignment_type TEXT;");
      await runIfMissing('vehicles', 'initial_assigned_driver_id', "ALTER TABLE vehicles ADD COLUMN initial_assigned_driver_id INTEGER;");
      await runIfMissing('vehicles', 'initial_assigned_service', "ALTER TABLE vehicles ADD COLUMN initial_assigned_service TEXT;");

      // Ensure positions table exists (schema contains CREATE TABLE IF NOT EXISTS positions ...)

      // Services and service_requests tables (from schema.sql)
      // Migration for services table - add if not exists check
      db.run(`CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        base_price REAL DEFAULT 0,
        duration_estimate INTEGER,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error('Error creating services table:', err);
      });

      db.run(`CREATE TABLE IF NOT EXISTS service_requests (
        id INTEGER PRIMARY KEY,
        service_id INTEGER,
        vehicle_id INTEGER,
        driver_id INTEGER,
        requester_name TEXT,
        requester_contact TEXT,
        pickup_location TEXT,
        pickup_lat REAL,
        pickup_lng REAL,
        dropoff_location TEXT,
        dropoff_lat REAL,
        dropoff_lng REAL,
        scheduled_date TEXT,
        scheduled_time TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'normal',
        notes TEXT,
        estimated_price REAL,
        final_price REAL,
        assigned_dispatcher_id INTEGER,
        assigned_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
      )`, (err) => {
        if (err) console.error('Error creating service_requests table:', err);
      });

      // Insert test users
      const users = [
        { username: 'admin', password: 'admin123', role: 'admin' },
        { username: 'manager', password: 'manager123', role: 'manager' },
        { username: 'driver', password: 'driver123', role: 'driver' },
        { username: 'direction', password: 'direction123', role: 'direction' },
        { username: 'dispatcher', password: 'dispatcher123', role: 'dispatcher' },
        { username: 'service', password: 'service123', role: 'service' }
      ];
      for (const user of users) {
        const hashed = await bcrypt.hash(user.password, 10);
        db.run('INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)', [user.username, hashed, user.role]);
      }
      console.log('Test users inserted');

      // Insert default services for CICR company
      const services = [
        { name: 'Transport Personnel', description: 'Transport de personnel vers les sites', category: 'transport', base_price: 15000, duration_estimate: 60 },
        { name: 'Transport Marchandises', description: 'Transport de marchandises légères', category: 'transport', base_price: 25000, duration_estimate: 120 },
        { name: 'Location Véhicule avec Chauffeur', description: 'Location avec chauffeur pour missions spéciales', category: 'rental', base_price: 35000, duration_estimate: 240 },
        { name: 'Urgence Médicale', description: 'Transport d\'urgence médicale', category: 'emergency', base_price: 50000, duration_estimate: 30 },
        { name: 'Formation Conduite', description: 'Formation de conduite pour employés', category: 'formation', base_price: 80000, duration_estimate: 480 },
        { name: 'Maintenance Mobile', description: 'Service de maintenance sur site', category: 'maintenance', base_price: 20000, duration_estimate: 90 }
      ];
      for (const service of services) {
        db.run('INSERT OR IGNORE INTO services (name, description, category, base_price, duration_estimate) VALUES (?, ?, ?, ?, ?)', 
          [service.name, service.description, service.category, service.base_price, service.duration_estimate]);
      }
      console.log('Default services inserted');
      db.close();
    }
  });
});