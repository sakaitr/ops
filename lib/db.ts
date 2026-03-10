import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { runMigrations } from "./migrate";

let dbInstance: Database.Database | null = null;
let migrationsRun = false;

function resolveDatabasePath() {
  const raw = process.env.DATABASE_PATH || "./data/opsdesk.sqlite";
  const absolutePath = path.isAbsolute(raw)
    ? raw
    : path.join(process.cwd(), raw);
  const dir = path.dirname(absolutePath);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    console.error("Failed to create database directory:", error);
    throw new Error(`Database directory creation failed: ${dir}`);
  }
  return absolutePath;
}

export function getDb() {
  if (!dbInstance) {
    try {
      const dbPath = resolveDatabasePath();
      dbInstance = new Database(dbPath);
      dbInstance.pragma("journal_mode = WAL");
      dbInstance.pragma("foreign_keys = ON");
    } catch (error) {
      console.error("Database initialization failed:", error);
      throw new Error("Failed to initialize database");
    }
  }

  if (!migrationsRun) {
    try {
      runMigrations(dbInstance, process.cwd());
      migrationsRun = true;
    } catch (error) {
      console.error("Migration execution failed:", error);
      throw new Error("Database migrations failed");
    }
  }

  return dbInstance;
}
