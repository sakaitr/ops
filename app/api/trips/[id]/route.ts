import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isAtLeast } from "@/lib/permissions";
import { nowIso } from "@/lib/time";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const db = getDb();
    const now = nowIso();
    const fields = ["vehicle_id", "direction", "actual_departure", "actual_arrival", "passenger_count", "status_code", "delay_minutes", "notes"];
    const sets = fields.filter(f => body[f] !== undefined).map(f => `${f} = ?`);
    const vals = fields.filter(f => body[f] !== undefined).map(f => body[f]);
    if (sets.length === 0) return NextResponse.json({ ok: false, error: "Güncellenecek alan yok" }, { status: 400 });
    db.prepare(`UPDATE trips SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`).run(...vals, now, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    const { id } = await params;
    const db = getDb();
    const trip = db.prepare("SELECT created_by FROM trips WHERE id = ?").get(id) as { created_by: string } | undefined;
    if (!trip) return NextResponse.json({ ok: false, error: "Bulunamadı" }, { status: 404 });
    if (trip.created_by !== user.id && !isAtLeast(user.role, "yetkili")) {
      return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 403 });
    }
    db.prepare("DELETE FROM trips WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
