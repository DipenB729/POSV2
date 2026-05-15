import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const migrationsDir = path.join(root, "supabase", "migrations");
const seedPath = path.join(root, "supabase", "seed", "phase_15_seed.sql");

loadEnv(envPath);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in .env.local");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

await client.connect();

try {
  await ensureMigrationTable();

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const alreadyApplied = await hasMigration(file);

    if (alreadyApplied) {
      console.log(`skip ${file}`);
      continue;
    }

    console.log(`apply ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO app_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.log("apply seed/phase_15_seed.sql");
  await client.query(fs.readFileSync(seedPath, "utf8"));

  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log(`tables ${tables.rows.map((row) => row.table_name).join(", ")}`);
} finally {
  await client.end();
}

async function ensureMigrationTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function hasMigration(name) {
  const result = await client.query("SELECT 1 FROM app_migrations WHERE name = $1", [name]);
  return result.rowCount > 0;
}

function loadEnv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] = value;
  }
}
