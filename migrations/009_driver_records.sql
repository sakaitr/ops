-- Şöför Sicil Kayıtları (Driver Incident Records)
CREATE TABLE IF NOT EXISTS driver_records (
  id TEXT PRIMARY KEY,
  driver_name TEXT NOT NULL,           -- free text; pulled from vehicles.driver_name or manual
  vehicle_id TEXT REFERENCES vehicles(id),
  vehicle_plate TEXT,                  -- denormalized for fast display
  incident_date TEXT NOT NULL,         -- YYYY-MM-DD
  category TEXT NOT NULL DEFAULT 'diger', -- kaza | sikayet | gecikme | ihlal | davranis | hasar | diger
  severity INTEGER NOT NULL DEFAULT 1, -- 1=küçük(-5pt) 2=orta(-15pt) 3=büyük(-25pt) 4=kritik(-40pt)
  description TEXT NOT NULL,
  action_taken TEXT,
  reported_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_driver_records_driver ON driver_records(driver_name);
CREATE INDEX IF NOT EXISTS idx_driver_records_vehicle ON driver_records(vehicle_id);
