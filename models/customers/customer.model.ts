import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function findAll(search?: string) {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("customers")
    .select("id, name, email, phone, loyalty_points, tier")
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(100);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  return query;
}
