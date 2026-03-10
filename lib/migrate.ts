import fs from "fs";
import path from "path";
import type Database from "better-sqlite3";

const MIGRATIONS_TABLE = "migrations";

function ensureMigrationsTable(db: Database.Database) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`
  );
}

function listMigrationFiles(migrationsDir: string) {
  if (!fs.existsSync(migrationsDir)) {
    return [] as string[];
  }
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

export function runMigrations(db: Database.Database, baseDir: string) {
  const migrationsDir = path.join(baseDir, "migrations");
  ensureMigrationsTable(db);
  const appliedRows = db
    .prepare(`SELECT id FROM ${MIGRATIONS_TABLE}`)
    .all() as { id: string }[];
  const applied = new Set(appliedRows.map((row) => row.id));

  const files = listMigrationFiles(migrationsDir);
  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    try {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      if (!sql || sql.trim().length === 0) {
        console.warn(`Migration file ${file} is empty, skipping`);
        continue;
      }
      const now = new Date().toISOString();

      const tx = db.transaction(() => {
        db.exec(sql);
        db.prepare(
          `INSERT INTO ${MIGRATIONS_TABLE} (id, applied_at) VALUES (?, ?)`
        ).run(file, now);
      });

      tx();
      console.log(`Migration ${file} applied successfully`);
    } catch (error) {
      console.error(`Migration ${file} failed:`, error);
      throw new Error(`Migration failed: ${file}`);
    }
  }
}
