import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "CASHIER" | "INVENTORY_CLERK";

export async function getCurrentProfile() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, role, store_id")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    name: string;
    role: AppRole;
    store_id: string | null;
  };
}

export async function requireRole(roles: AppRole[]) {
  const profile = await getCurrentProfile();

  if (!roles.includes(profile.role)) {
    throw new Error("Insufficient permissions");
  }

  return profile;
}

export function resolveScopedStore(profile: { role: AppRole; store_id: string | null }, requestedStoreId?: string | null) {
  if (profile.role === "SUPER_ADMIN") {
    return requestedStoreId ?? profile.store_id;
  }

  return profile.store_id;
}
