import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { runMigrations } from "./migrate";

let dbInstance: Database.Database | null = null;
let migrationsRun = false;

// Proje kökünü bul: bu dosya lib/ altında, bir üst dizin proje köküdür.
// Standalone build veya cPanel gibi ortamlarda process.cwd() güvenilir olmayabileceğinden
// önce __dirname bazlı yolu dene, yoksa process.cwd() bazlı yolu kullan.
function findProjectRoot(): string {
  // __dirname: derleme sonrasında lib/ (veya Next.js bundler eşdeğeri)
  const fromDirname = path.resolve(__dirname, "..");
  // process.cwd() bazlı
  const fromCwd = process.cwd();

  // Proje kökünü belirlemek için package.json varlığını kontrol et
  for (const candidate of [fromDirname, fromCwd]) {
    try {
      if (fs.existsSync(path.join(candidate, "package.json"))) {
        return candidate;
      }
    } catch { /* ignore */ }
  }
  return fromCwd;
}

function resolveDatabasePath() {
  const raw = process.env.DATABASE_PATH;

  if (raw) {
    // Kullanıcı tarafından verilmişse: mutlaksa kullan, göreceliyse proje kökünden çöz
    const absolutePath = path.isAbsolute(raw)
      ? raw
      : path.join(findProjectRoot(), raw);
    const dir = path.dirname(absolutePath);
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (error) {
      console.error("Failed to create database directory:", error);
      throw new Error(`Database directory creation failed: ${dir}`);
    }
    console.log("[DB] DATABASE_PATH (env):", absolutePath);
    return absolutePath;
  }

  // Varsayılan: proje köküne göre data/opsdesk.sqlite
  const projectRoot = findProjectRoot();
  const absolutePath = path.join(projectRoot, "data", "opsdesk.sqlite");
  const dir = path.dirname(absolutePath);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    console.error("Failed to create database directory:", error);
    throw new Error(`Database directory creation failed: ${dir}`);
  }
  console.log("[DB] DATABASE_PATH (default, project root):", absolutePath);
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
