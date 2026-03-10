import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { nowIso } from "@/lib/time";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Görev ID gerekli" },
        { status: 400 }
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
    const { comment } = body;

    if (!comment) {
      return NextResponse.json(
        { ok: false, error: "Yorum gerekli" },
        { status: 400 }
      );
    }

    const db = getDb();
    const commentId = uuidv4();
    const now = nowIso();

    db.prepare(
      "INSERT INTO todo_comments (id, todo_id, user_id, comment, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(commentId, id, user.id, comment, now);

    const created = db
      .prepare(
        `SELECT todo_comments.*, users.full_name as user_name
         FROM todo_comments
         JOIN users ON users.id = todo_comments.user_id
         WHERE todo_comments.id = ?`
      )
      .get(commentId);

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Todo comment error:", error);
    return NextResponse.json(
      { ok: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

