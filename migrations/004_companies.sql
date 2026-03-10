-- Firmalar (Companies)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Firma Araçları (Company Vehicles)
CREATE TABLE IF NOT EXISTS company_vehicles (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  plate TEXT NOT NULL,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(company_id, plate)
);

-- Araç Gelişleri (Vehicle Arrivals)
CREATE TABLE IF NOT EXISTS vehicle_arrivals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  vehicle_id TEXT NOT NULL REFERENCES company_vehicles(id),
  arrival_date TEXT NOT NULL,
  arrived_at TEXT NOT NULL,
  recorded_by TEXT NOT NULL REFERENCES users(id),
  latitude REAL,
  longitude REAL,
  created_at TEXT NOT NULL,
  UNIQUE(vehicle_id, arrival_date)
);
