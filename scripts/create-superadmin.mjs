import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

loadEnvFile(".env.local");

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const email = args.get("--email") ?? process.env.SUPERADMIN_EMAIL;
const password = args.get("--password") ?? process.env.SUPERADMIN_PASSWORD;
const name = args.get("--name") ?? process.env.SUPERADMIN_NAME ?? "Super Admin";
const storeId = args.get("--store-id") ?? process.env.SUPERADMIN_STORE_ID ?? null;

if (!email) fail("Missing --email or SUPERADMIN_EMAIL");
if (!password || password.length < 8) fail("Missing --password/SUPERADMIN_PASSWORD, or password is shorter than 8 characters");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) fail("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) fail("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const existing = await supabase.auth.admin.listUsers();
if (existing.error) throw existing.error;

let user = existing.data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());

if (!user) {
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { app_role: "SUPER_ADMIN" },
    user_metadata: { name },
  });
  if (created.error) throw created.error;
  user = created.data.user;
} else {
  const updated = await supabase.auth.admin.updateUserById(user.id, {
    password,
    app_metadata: { app_role: "SUPER_ADMIN" },
    user_metadata: { name },
  });
  if (updated.error) throw updated.error;
}

const profile = await supabase
  .from("profiles")
  .update({
    name,
    role: "SUPER_ADMIN",
    store_id: storeId,
    is_active: true,
    deleted_at: null,
  })
  .eq("id", user.id)
  .select("id, name, role")
  .single();

if (profile.error) throw profile.error;

console.log(`Superadmin ready: ${email}`);

function loadEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] ??= value;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
