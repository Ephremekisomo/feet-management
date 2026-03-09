CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT
);

CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY,
  name TEXT,
  license_number TEXT UNIQUE,
  contact_info TEXT,
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY,
  make TEXT,
  model TEXT,
  year INTEGER,
  license_plate TEXT UNIQUE,
  vin TEXT UNIQUE,
  acquisition_source TEXT,
  supplier TEXT,
  contract_number TEXT,
  acquisition_date TEXT,
  purchase_price REAL,
  currency TEXT,
  engine_number TEXT,
  initial_odometer INTEGER,
  initial_odometer_verified INTEGER DEFAULT 0,
  status TEXT,
  driver_id INTEGER,
  last_lat REAL,
  last_lng REAL,
  last_seen TEXT,
  current_status TEXT,
  fleet_number TEXT,
  documents TEXT,
  insurance_doc TEXT,
  vignette_doc TEXT,
  carte_grise_doc TEXT,
  initial_assignment_type TEXT,
  initial_assigned_driver_id INTEGER,
  initial_assigned_service TEXT,
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS fuel_entries (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER,
  driver_id INTEGER,
  date TEXT,
  liters REAL,
  cost_per_liter REAL,
  total_cost REAL,
  odometer INTEGER,
  fuel_station TEXT,
  timestamp TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

CREATE TABLE IF NOT EXISTS maintenance (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER,
  date TEXT,
  type TEXT,
  description TEXT,
  cost REAL,
  next_service_date TEXT,
  next_service_mileage INTEGER,
  scheduled_date TEXT,
  status TEXT DEFAULT 'planned',
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER,
  driver_id INTEGER,
  start_date TEXT,
  end_date TEXT,
  start_odometer INTEGER,
  end_odometer INTEGER,
  distance REAL,
  purpose TEXT,
  route TEXT,
  status TEXT,
  start_time TEXT,
  end_time TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER,
  type TEXT,
  message TEXT,
  created_date TEXT,
  resolved INTEGER DEFAULT 0,
  level TEXT,
  source TEXT,
  resolved_by INTEGER,
  resolved_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

CREATE TABLE IF NOT EXISTS insurance (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER,
  policy_number TEXT,
  provider TEXT,
  start_date TEXT,
  end_date TEXT,
  premium REAL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- Positions table (history of locations)
CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER,
  driver_id INTEGER,
  trip_id INTEGER,
  lat REAL,
  lng REAL,
  timestamp TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id),
  FOREIGN KEY (trip_id) REFERENCES trips(id)
);

-- Services table (services offered by the company)
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  base_price REAL DEFAULT 0,
  duration_estimate INTEGER,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Service requests table (requests from clients/services)
CREATE TABLE IF NOT EXISTS service_requests (
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
);