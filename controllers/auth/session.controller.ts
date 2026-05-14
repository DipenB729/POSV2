import { createSupabaseServerClient } from "@/server/db/supabase-server";

export async function getCurrentSession() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}
