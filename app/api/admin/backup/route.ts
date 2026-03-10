import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import path from "path";
import fs from "fs";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 403 });
    }

    const dbPath = path.resolve(process.cwd(), "data", "opsdesk.sqlite");

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ ok: false, error: "Veritabanı dosyası bulunamadı" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `opsdesk_backup_${dateStr}.sqlite`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (err) {
    console.error("Backup error:", err);
    return NextResponse.json({ ok: false, error: "Yedek alınamadı" }, { status: 500 });
  }
}
