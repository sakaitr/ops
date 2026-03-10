-- Araçlar (Vehicles)
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  plate TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'minibus', -- minibus, midibus, otobus, sedan
  capacity INTEGER NOT NULL DEFAULT 14,
  brand TEXT,
  model TEXT,
  year INTEGER,
  driver_name TEXT,
  driver_phone TEXT,
  status_code TEXT NOT NULL DEFAULT 'active', -- active, maintenance, inactive
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Güzergahlar (Routes)
CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  direction TEXT NOT NULL DEFAULT 'both', -- morning, evening, both
  morning_departure TEXT, -- HH:MM
  morning_arrival TEXT,   -- HH:MM
  evening_departure TEXT,
  evening_arrival TEXT,
  stops_json TEXT,        -- JSON array [{name, address, order}]
  vehicle_id TEXT REFERENCES vehicles(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Seferler (Trips - daily run records)
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  trip_date TEXT NOT NULL,
  route_id TEXT NOT NULL REFERENCES routes(id),
  vehicle_id TEXT REFERENCES vehicles(id),
  direction TEXT NOT NULL DEFAULT 'morning', -- morning, evening
  planned_departure TEXT,  -- HH:MM
  actual_departure TEXT,
  planned_arrival TEXT,
  actual_arrival TEXT,
  passenger_count INTEGER DEFAULT 0,
  status_code TEXT NOT NULL DEFAULT 'planned', -- planned, departed, arrived, cancelled, delayed
  delay_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Giriş Kontrolleri (Morning entry time checks)
CREATE TABLE IF NOT EXISTS entry_controls (
  id TEXT PRIMARY KEY,
  control_date TEXT NOT NULL,
  route_id TEXT NOT NULL REFERENCES routes(id),
  trip_id TEXT REFERENCES trips(id),
  planned_time TEXT NOT NULL, -- HH:MM
  actual_time TEXT,           -- HH:MM
  delay_minutes INTEGER DEFAULT 0,
  passenger_expected INTEGER DEFAULT 0,
  passenger_actual INTEGER DEFAULT 0,
  status_code TEXT NOT NULL DEFAULT 'pending', -- pending, on_time, delayed, cancelled
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Araç Denetimleri (Vehicle inspections)
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  inspection_date TEXT NOT NULL,
  inspector_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL DEFAULT 'routine', -- routine, pre_trip, complaint, periodic
  result TEXT NOT NULL DEFAULT 'pending', -- pending, pass, fail, conditional
  checklist_json TEXT, -- JSON: [{label, ok, note}]
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
