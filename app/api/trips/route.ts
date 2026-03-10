import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { nowIso } from "@/lib/time";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const db = getDb();
    let data;
    if (date) {
      data = db.prepare(
        `SELECT t.*, u.full_name as creator_name
         FROM trips t
         LEFT JOIN users u ON u.id = t.created_by
         WHERE t.trip_date = ?
         ORDER BY t.created_at DESC`
      ).all(date);
    } else {
      data = db.prepare(
        `SELECT t.*, u.full_name as creator_name
         FROM trips t
         LEFT JOIN users u ON u.id = t.created_by
         ORDER BY t.created_at DESC`
      ).all();
    }
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    const body = await req.json();
    const { trip_date, route_id, vehicle_id, direction, planned_departure, planned_arrival, passenger_count, notes } = body;
    if (!trip_date) return NextResponse.json({ ok: false, error: "Tarih zorunlu" }, { status: 400 });
    const db = getDb();
    const now = nowIso();
    const id = uuidv4();
    db.prepare(
      `INSERT INTO trips (id, trip_date, route_id, vehicle_id, direction, planned_departure, planned_arrival, passenger_count, status_code, delay_minutes, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned', 0, ?, ?, ?, ?)`
    ).run(id, trip_date, route_id || null, vehicle_id || null, direction || "morning",
      planned_departure || null, planned_arrival || null, passenger_count || 0,
      notes || null, user.id, now, now);
    return NextResponse.json({ ok: true, data: { id } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
