import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { nowIso } from "@/lib/time";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "yonetici")
      return NextResponse.json({ ok: false, error: "Yetersiz yetki" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "Dosya bulunamadı" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

    // Skip header row; columns: [0]=Firma Adı, [1]=Plaka, [2]=Şöför (opsiyonel)
    // Plaka veya firma boşsa satır atlanır; şöför boş olabilir
    const dataRows = rows.slice(1).filter((r: any[]) => r[1] && String(r[1]).trim());

    const db = getDb();
    const now = nowIso();
    let inserted = 0, skipped = 0, errors: string[] = [];

    const insertCompany = db.prepare(
      "INSERT OR IGNORE INTO companies (id, name, is_active, created_by, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?)"
    );
    const getCompany = db.prepare("SELECT id FROM companies WHERE name = ?");

    // For vehicles master registry
    const upsertVehicle = db.prepare(
      "INSERT OR IGNORE INTO vehicles (id, plate, type, capacity, status_code, driver_name, created_by, created_at, updated_at) VALUES (?, ?, 'minibus', 14, 'active', ?, ?, ?, ?)"
    );
    const updateVehicleDriver = db.prepare(
      "UPDATE vehicles SET driver_name = ?, updated_at = ? WHERE plate = ? AND (driver_name IS NULL OR driver_name = '')"
    );
    const getVehicle = db.prepare("SELECT id FROM vehicles WHERE plate = ?");

    // For company-vehicle assignments
    const insertCompanyVehicle = db.prepare(
      "INSERT OR IGNORE INTO company_vehicles (id, company_id, plate, driver_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)"
    );
    const updateCompanyVehicleDriver = db.prepare(
      "UPDATE company_vehicles SET driver_name = ?, updated_at = ? WHERE company_id = ? AND plate = ? AND (driver_name IS NULL OR driver_name = '')"
    );

    const tx = db.transaction(() => {
      for (const row of dataRows) {
        const companyName = row[0] ? String(row[0]).trim() : "";
        const plate = String(row[1]).trim().toUpperCase();
        const driverName = row[2] ? String(row[2]).trim() : null;
        if (!plate) { skipped++; continue; }
        if (!companyName) { skipped++; continue; }

        // 1. Ensure plate exists in master vehicle registry
        upsertVehicle.run(uuidv4(), plate, driverName, user.id, now, now);
        if (driverName) updateVehicleDriver.run(driverName, now, plate);

        // 2. Ensure company exists
        insertCompany.run(uuidv4(), companyName, user.id, now, now);
        const company = getCompany.get(companyName) as { id: string };
        if (!company) { errors.push(`Firma oluşturulamadı: ${companyName}`); skipped++; continue; }

        // 3. Link vehicle to company
        const result = insertCompanyVehicle.run(uuidv4(), company.id, plate, driverName, now, now);
        if (result.changes > 0) {
          inserted++;
        } else {
          if (driverName) updateCompanyVehicleDriver.run(driverName, now, company.id, plate);
          skipped++;
        }
      }
    });

    tx();

    return NextResponse.json({ ok: true, data: { inserted, skipped, errors } });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ ok: false, error: "Dosya işlenemedi: " + e.message }, { status: 500 });
  }
}
