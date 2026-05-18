import { cookies } from "next/headers";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

type SupabaseCookieSession = {
  access_token?: string;
};

export async function requireSuperAdminFromRequest() {
  const accessToken = getAccessTokenFromCookies();
  if (!accessToken) throw new Error("Authentication required");

  const supabase = createSupabaseAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error) throw error;
  if (!user) throw new Error("Authentication required");
  if (user.app_metadata.app_role !== "SUPER_ADMIN") throw new Error("Insufficient permissions");

  return user;
}

function getAccessTokenFromCookies() {
  const authCookie = cookies()
    .getAll()
    .find((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"));

  if (!authCookie?.value) return null;

  try {
    const rawValue = authCookie.value.startsWith("base64-")
      ? Buffer.from(authCookie.value.slice("base64-".length), "base64").toString("utf8")
      : decodeURIComponent(authCookie.value);
    const session = JSON.parse(rawValue) as SupabaseCookieSession | [string, string];

    if (Array.isArray(session)) return session[0] ?? null;
    return session.access_token ?? null;
  } catch {
    return null;
  }
}
