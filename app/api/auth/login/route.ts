import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession, setSessionCookie, setRoleCookie } from "@/lib/auth";
import { loginSchema, zodErrorMessage } from "@/lib/validators";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
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
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: zodErrorMessage(result.error) },
        { status: 400 }
      );
    }

    const { username, password } = result.data;
    const db = getDb();
    const user = db
      .prepare(
        "SELECT id, username, password_hash, role, is_active FROM users WHERE username = ?"
      )
      .get(username) as
      | { id: string; username: string; password_hash: string; role: string; is_active: number }
      | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı adı veya şifre hatalı" },
        { status: 401 }
      );
    }

    if (user.is_active !== 1) {
      return NextResponse.json(
        { ok: false, error: "Hesap aktif değil" },
        { status: 403 }
      );
    }

    const { sessionId } = createSession(db, user.id);
    await setSessionCookie(sessionId);
    await setRoleCookie(user.role);

    logAudit(db, {
      actorUserId: user.id,
      action: "login",
      entityType: "session",
      entityId: sessionId,
    });

    return NextResponse.json({ ok: true, data: { username: user.username } });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { ok: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
