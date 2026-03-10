-- Add company_vehicle_id to inspections for company vehicles tracking
ALTER TABLE inspections ADD COLUMN company_vehicle_id TEXT REFERENCES company_vehicles(id);
ALTER TABLE inspections ADD COLUMN company_vehicle_plate TEXT;
