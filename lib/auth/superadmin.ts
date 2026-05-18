import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

type SupabaseCookieSession = {
  access_token?: string;
};

type SessionCookie = {
  name: string;
  value: string;
};

export async function requireSuperAdminFromRequest(request?: NextRequest) {
  const accessToken = getAccessTokenFromHeader(request) ?? getAccessTokenFromCookies();
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

function getAccessTokenFromHeader(request?: NextRequest) {
  const value = request?.headers.get("authorization");
  if (!value?.toLowerCase().startsWith("bearer ")) return null;
  return value.slice("bearer ".length).trim() || null;
}

function getAccessTokenFromCookies() {
  const allCookies = cookies().getAll();
  const authCookie = findSupabaseAuthCookie(allCookies);
  if (!authCookie) return null;

  try {
    const rawValue = authCookie.startsWith("base64-")
      ? Buffer.from(authCookie.slice("base64-".length), "base64").toString("utf8")
      : decodeURIComponent(authCookie);
    const session = JSON.parse(rawValue) as SupabaseCookieSession | [string, string];

    if (Array.isArray(session)) return session[0] ?? null;
    return session.access_token ?? null;
  } catch {
    return null;
  }
}

function findSupabaseAuthCookie(allCookies: SessionCookie[]) {
  const directCookie = allCookies.find((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"));
  if (directCookie?.value) return directCookie.value;

  const chunks = allCookies
    .filter((cookie) => /^sb-.+-auth-token\.\d+$/.test(cookie.name))
    .sort((a, b) => Number(a.name.split(".").at(-1)) - Number(b.name.split(".").at(-1)));

  if (chunks.length === 0) return null;
  return chunks.map((chunk) => chunk.value).join("");
}
