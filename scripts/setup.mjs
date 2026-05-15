import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const envExamplePath = path.join(root, ".env.example");
const envLocalPath = path.join(root, ".env.local");
const lockfilePath = path.join(root, "package-lock.json");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

main();

function main() {
  console.log("Setting up POS project...");
  ensureEnvFile();
  installDependencies();
  runDatabaseSetupWhenConfigured();
  console.log("\nSetup complete. Start the app with: npm run dev");
}

function ensureEnvFile() {
  if (fs.existsSync(envLocalPath)) {
    console.log("env: .env.local already exists");
    return;
  }

  if (!fs.existsSync(envExamplePath)) {
    console.log("env: .env.example not found, skipping .env.local creation");
    return;
  }

  fs.copyFileSync(envExamplePath, envLocalPath);
  console.log("env: created .env.local from .env.example");
}

function installDependencies() {
  const command = fs.existsSync(lockfilePath) ? "ci" : "install";
  console.log(`deps: running npm ${command}`);
  run(npmCommand, [command]);
}

function runDatabaseSetupWhenConfigured() {
  const env = readEnvFile(envLocalPath);
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl || isPlaceholder(databaseUrl)) {
    console.log("db: DATABASE_URL is not configured, skipping migrations and seed");
    return;
  }

  console.log("db: running migrations and seed");
  run(process.execPath, [path.join("scripts", "run-supabase-migrations.mjs")]);
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function isPlaceholder(value) {
  return (
    value.includes("your-") ||
    value.includes("example") ||
    value.includes("localhost") ||
    value.includes("127.0.0.1")
  );
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
