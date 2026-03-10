import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isAtLeast } from "@/lib/permissions";
import { v4 as uuidv4 } from "uuid";
import { nowIso } from "@/lib/time";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    const { id } = await params;

    // A-3: allowed_companies enforcement
    if (user.allowed_companies) {
      const allowed: string[] = JSON.parse(user.allowed_companies);
      if (!allowed.includes(id)) {
        return NextResponse.json({ ok: false, error: "Bu firmaya erişim yetkiniz yok" }, { status: 403 });
      }
    }

    const db = getDb();
    const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(id);
    if (!company) return NextResponse.json({ ok: false, error: "Firma bulunamadı" }, { status: 404 });
    const vehicles = db.prepare("SELECT * FROM company_vehicles WHERE company_id = ? AND is_active = 1 ORDER BY plate ASC").all(id);
    return NextResponse.json({ ok: true, data: { ...company as object, vehicles } });
  } catch {
    return NextResponse.json({ ok: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    if (!isAtLeast(user.role, "yonetici"))
      return NextResponse.json({ ok: false, error: "Yetersiz yetki" }, { status: 403 });
    const { id } = await params;
    const { name, notes, is_active } = await req.json();
    if (!name?.trim()) return NextResponse.json({ ok: false, error: "Firma adı zorunlu" }, { status: 400 });
    const db = getDb();
    const now = nowIso();
    db.prepare("UPDATE companies SET name = ?, notes = ?, is_active = ?, updated_at = ? WHERE id = ?")
      .run(name, notes || null, is_active ?? 1, now, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    if (user.role !== "admin")
      return NextResponse.json({ ok: false, error: "Yetersiz yetki" }, { status: 403 });
    const { id } = await params;
    const db = getDb();
    const now = nowIso();
    db.prepare("UPDATE companies SET is_active = 0, updated_at = ? WHERE id = ?").run(now, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
