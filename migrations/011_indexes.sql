-- Performance indexes for frequently queried columns

-- vehicle_arrivals
CREATE INDEX IF NOT EXISTS idx_vehicle_arrivals_company_date ON vehicle_arrivals(company_id, arrival_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_arrivals_vehicle ON vehicle_arrivals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_arrivals_date ON vehicle_arrivals(arrival_date);

-- company_vehicles
CREATE INDEX IF NOT EXISTS idx_company_vehicles_company ON company_vehicles(company_id, is_active);

-- inspections
CREATE INDEX IF NOT EXISTS idx_inspections_company_vehicle ON inspections(company_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON inspections(vehicle_id);

-- trips
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_route ON trips(route_id, trip_date);

-- entry_controls
CREATE INDEX IF NOT EXISTS idx_entry_controls_date ON entry_controls(control_date);
CREATE INDEX IF NOT EXISTS idx_entry_controls_status ON entry_controls(control_date, status_code);
