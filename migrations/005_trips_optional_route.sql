-- Make route_id optional in trips (for free-text Ek Mesai entries)
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS trips_new (
  id TEXT PRIMARY KEY,
  trip_date TEXT NOT NULL,
  route_id TEXT REFERENCES routes(id),
  vehicle_id TEXT REFERENCES vehicles(id),
  direction TEXT NOT NULL DEFAULT 'morning',
  planned_departure TEXT,
  actual_departure TEXT,
  planned_arrival TEXT,
  actual_arrival TEXT,
  passenger_count INTEGER DEFAULT 0,
  status_code TEXT NOT NULL DEFAULT 'planned',
  delay_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO trips_new SELECT * FROM trips;
DROP TABLE trips;
ALTER TABLE trips_new RENAME TO trips;

PRAGMA foreign_keys = ON;
