import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isAtLeast } from "@/lib/permissions";
import { v4 as uuidv4 } from "uuid";
import { nowIso } from "@/lib/time";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    const db = getDb();
    // Restrict to allowed companies if set (admins bypass)
    const allowedIds: string[] | null =
      user.role !== "admin" && user.allowed_companies
        ? JSON.parse(user.allowed_companies)
        : null;

    let query = `
      SELECT c.*, COUNT(cv.id) as vehicle_count
      FROM companies c
      LEFT JOIN company_vehicles cv ON cv.company_id = c.id AND cv.is_active = 1
      WHERE c.is_active = 1`;
    const qParams: any[] = [];
    if (allowedIds && allowedIds.length > 0) {
      query += ` AND c.id IN (${allowedIds.map(() => "?").join(",")})`;
      qParams.push(...allowedIds);
    } else if (allowedIds && allowedIds.length === 0) {
      return NextResponse.json({ ok: true, data: [] });
    }
    query += " GROUP BY c.id ORDER BY c.name ASC";
    const data = db.prepare(query).all(...qParams);
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    if (!isAtLeast(user.role, "yonetici"))
      return NextResponse.json({ ok: false, error: "Yetersiz yetki" }, { status: 403 });
    const { name, notes } = await req.json();
    if (!name?.trim()) return NextResponse.json({ ok: false, error: "Firma adı zorunlu" }, { status: 400 });
    const db = getDb();
    const now = nowIso();
    const id = uuidv4();
    db.prepare(
      "INSERT INTO companies (id, name, notes, is_active, created_by, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)"
    ).run(id, name.trim(), notes || null, user.id, now, now);
    return NextResponse.json({ ok: true, data: { id } });
  } catch (e: any) {
    if (e?.message?.includes("UNIQUE")) return NextResponse.json({ ok: false, error: "Bu firma zaten kayıtlı" }, { status: 409 });
    return NextResponse.json({ ok: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
