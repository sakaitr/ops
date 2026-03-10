import type Database from "better-sqlite3";

export function nextTicketNo(db: Database.Database) {
  const tx = db.transaction(() => {
    const row = db
      .prepare("SELECT value FROM counters WHERE name = 'ticket_no'")
      .get() as { value: number } | undefined;
    const current = row?.value ?? 0;
    const next = current + 1;
    db.prepare("UPDATE counters SET value = ? WHERE name = 'ticket_no'").run(
      next
    );
    return `OPS-${String(next).padStart(6, "0")}`;
  });

  return tx();
}
