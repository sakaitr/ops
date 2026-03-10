import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { nowIso } from "@/lib/time";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Yetersiz yetki" }, { status: 403 });

    const { id } = await params;
    const db = getDb();
    const data = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.role, u.is_active,
             u.department_id, d.name as department_name,
             u.allowed_pages, u.allowed_companies,
             u.created_at, u.updated_at
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.id = ?
    `).get(id);
    if (!data) return NextResponse.json({ ok: false, error: "Kullanıcı bulunamadı" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Yetersiz yetki" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { full_name, role, department_id, is_active, password } = body;

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
    if (!existing) return NextResponse.json({ ok: false, error: "Kullanıcı bulunamadı" }, { status: 404 });

    if (role && !["personel", "yetkili", "yonetici", "admin"].includes(role))
      return NextResponse.json({ ok: false, error: "Geçersiz rol" }, { status: 400 });

    const now = nowIso();

    // Build dynamic update
    const fields: string[] = ["updated_at = ?"];
    const values: any[] = [now];

    if (full_name?.trim()) { fields.push("full_name = ?"); values.push(full_name.trim()); }
    if (role) { fields.push("role = ?"); values.push(role); }
    if (department_id !== undefined) { fields.push("department_id = ?"); values.push(department_id || null); }
    if (is_active !== undefined) { fields.push("is_active = ?"); values.push(is_active ? 1 : 0); }
    if ("allowed_pages" in body) {
      fields.push("allowed_pages = ?");
      values.push(body.allowed_pages !== null ? JSON.stringify(body.allowed_pages) : null);
    }
    if ("allowed_companies" in body) {
      fields.push("allowed_companies = ?");
      values.push(body.allowed_companies !== null ? JSON.stringify(body.allowed_companies) : null);
    }
    if (password) {
      if (password.length < 6) return NextResponse.json({ ok: false, error: "Şifre en az 6 karakter olmalı" }, { status: 400 });
      fields.push("password_hash = ?");
      values.push(hashPassword(password));
    }

    values.push(id);
    db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Yetersiz yetki" }, { status: 403 });

    const { id } = await params;
    if (id === user.id) return NextResponse.json({ ok: false, error: "Kendi hesabınızı silemezsiniz" }, { status: 400 });

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
    if (!existing) return NextResponse.json({ ok: false, error: "Kullanıcı bulunamadı" }, { status: 404 });

    // Soft delete
    db.prepare("UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?").run(nowIso(), id);
    // Invalidate sessions
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
