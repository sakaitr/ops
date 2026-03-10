import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canViewTicket, isAtLeast } from "@/lib/permissions";
import { nowIso, addMinutes } from "@/lib/time";
import { nextTicketNo } from "@/lib/ticketNo";
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
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedTo = searchParams.get("assignedTo");
    const slaBreach = searchParams.get("slaBreach") === "true";

    let sql = `SELECT tickets.*, a.full_name as assigned_name, c.full_name as creator_name
               FROM tickets
               LEFT JOIN users a ON a.id = tickets.assigned_to
               LEFT JOIN users c ON c.id = tickets.created_by
               WHERE 1=1`;
    const params: unknown[] = [];

    if (!isAtLeast(user.role, "yetkili")) {
      sql +=
        " AND (tickets.assigned_to = ? OR tickets.created_by = ?)";
      params.push(user.id, user.id);
    } else if (assignedTo) {
      sql += " AND tickets.assigned_to = ?";
      params.push(assignedTo);
    }

    if (status) {
      sql += " AND tickets.status_code = ?";
      params.push(status);
    }

    if (priority) {
      sql += " AND tickets.priority_code = ?";
      params.push(priority);
    }

    if (slaBreach) {
      sql += " AND tickets.sla_due_at IS NOT NULL AND tickets.sla_due_at < ?";
      params.push(nowIso());
    }

    sql += " ORDER BY tickets.created_at DESC";

    const rows = db.prepare(sql).all(...params);
    return NextResponse.json({ ok: true, data: rows });
  } catch (error) {
    console.error("Tickets list error:", error);
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

    if (!isAtLeast(user.role, "yetkili")) {
      return NextResponse.json(
        { ok: false, error: "Sorun oluşturma yetkiniz yok" },
        { status: 403 }
      );
    }

    const db = getDb();
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
    const {
      title,
      description,
      category_id,
      priority_code,
      tag_ids,
      assigned_to,
      department_id,
    } = body;

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Başlık gerekli" },
        { status: 400 }
      );
    }

    const ticketNo = nextTicketNo(db);
    const id = uuidv4();
    const now = nowIso();

    let slaDueAt: string | null = null;
    if (priority_code) {
      const slaRule = db
        .prepare(
          "SELECT due_minutes FROM config_sla_rules WHERE priority_code = ? AND is_active = 1"
        )
        .get(priority_code) as { due_minutes: number } | undefined;
      if (slaRule) {
        slaDueAt = addMinutes(new Date(), slaRule.due_minutes).toISOString();
      }
    }

    const tagIdsStr = Array.isArray(tag_ids) ? tag_ids.join(",") : tag_ids;

    db.prepare(
      `INSERT INTO tickets (id, ticket_no, title, description, category_id, priority_code, status_code, tag_ids, sla_due_at, created_by, assigned_to, department_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      ticketNo,
      title,
      description || null,
      category_id || null,
      priority_code || null,
      tagIdsStr || null,
      slaDueAt,
      user.id,
      assigned_to || null,
      department_id || null,
      now,
      now
    );

    logAudit(db, {
      actorUserId: user.id,
      action: "ticket_create",
      entityType: "ticket",
      entityId: id,
      details: { ticket_no: ticketNo },
    });

    const created = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Ticket create error:", error);
    return NextResponse.json(
      { ok: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

