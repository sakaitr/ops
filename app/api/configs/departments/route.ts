import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageConfigs } from "@/lib/permissions";
import { nowIso } from "@/lib/time";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    let sql = "SELECT * FROM departments WHERE 1=1";
    if (activeOnly) {
      sql += " AND is_active = 1";
    }
    sql += " ORDER BY name ASC";

    const rows = db.prepare(sql).all();
    return NextResponse.json({ ok: true, data: rows });
  } catch (error) {
    console.error("Departments list error:", error);
    return NextResponse.json(
      { ok: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    if (!canManageConfigs(user.role)) {
      return NextResponse.json(
        { ok: false, error: "Yetersiz yetki" },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Invalid JSON in request:", parseError);
      return NextResponse.json(
        { ok: false, error: "Geçersiz JSON" },
        { status: 400 }
      );
    }
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Departman adı gerekli" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = uuidv4();
    const now = nowIso();

    db.prepare(
      "INSERT INTO departments (id, name, is_active, created_at, updated_at) VALUES (?, ?, 1, ?, ?)"
    ).run(id, name, now, now);

    logAudit(db, {
      actorUserId: user.id,
      action: "department_create",
      entityType: "department",
      entityId: id,
      details: { name },
    });

    const created = db.prepare("SELECT * FROM departments WHERE id = ?").get(id);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Department create error:", error);
    return NextResponse.json(
      { ok: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    if (!canManageConfigs(user.role)) {
      return NextResponse.json(
        { ok: false, error: "Yetersiz yetki" },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Invalid JSON in request:", parseError);
      return NextResponse.json(
        { ok: false, error: "Geçersiz JSON" },
        { status: 400 }
      );
    }
    const { id, name, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Departman ID gerekli" },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = nowIso();

    let sql = "UPDATE departments SET updated_at = ?";
    const params: unknown[] = [now];

    if (name !== undefined) {
      sql += ", name = ?";
      params.push(name);
    }

    if (is_active !== undefined) {
      sql += ", is_active = ?";
      params.push(is_active ? 1 : 0);
    }

    sql += " WHERE id = ?";
    params.push(id);

    db.prepare(sql).run(...params);

    logAudit(db, {
      actorUserId: user.id,
      action: "department_update",
      entityType: "department",
      entityId: id,
      details: { name, is_active },
    });

    const updated = db.prepare("SELECT * FROM departments WHERE id = ?").get(id);
    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Department update error:", error);
    return NextResponse.json(
      { ok: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

