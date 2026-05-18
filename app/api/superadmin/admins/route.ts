import { NextRequest } from "next/server";

import { fail, ok } from "@/controllers/http";
import { requireRole } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const supabase = createSupabaseAdminClient();

    const [profiles, stores] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, role, store_id, is_active, created_at, stores(name)")
        .eq("role", "ADMIN")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("stores").select("id, name").is("deleted_at", null).order("name"),
    ]);

    if (profiles.error) throw profiles.error;
    if (stores.error) throw stores.error;

    return ok({
      admins: profiles.data ?? [],
      stores: stores.data ?? [],
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      storeId?: string | null;
    };

    if (!body.name?.trim()) return fail(new Error("Name is required"), 400);
    if (!body.email?.trim()) return fail(new Error("Email is required"), 400);
    if (!body.password || body.password.length < 8) return fail(new Error("Password must be at least 8 characters"), 400);

    const supabase = createSupabaseAdminClient();
    const created = await supabase.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      email_confirm: true,
      user_metadata: {
        name: body.name.trim(),
      },
    });

    if (created.error) throw created.error;
    if (!created.data.user) return fail(new Error("Unable to create admin user"), 400);

    const { data, error } = await supabase
      .from("profiles")
      .update({
        name: body.name.trim(),
        role: "ADMIN",
        store_id: body.storeId || null,
        is_active: true,
      })
      .eq("id", created.data.user.id)
      .select("id, name, role, store_id, is_active, created_at, stores(name)")
      .single();

    if (error) throw error;

    return ok(data, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
