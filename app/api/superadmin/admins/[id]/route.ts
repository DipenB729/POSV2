import { NextRequest } from "next/server";

import { fail, ok } from "@/controllers/http";
import { requireRole } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const body = (await request.json()) as {
      name?: string;
      storeId?: string | null;
      isActive?: boolean;
    };

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        ...(body.storeId !== undefined ? { store_id: body.storeId || null } : {}),
        ...(body.isActive !== undefined ? { is_active: body.isActive } : {}),
      })
      .eq("id", params.id)
      .eq("role", "ADMIN")
      .select("id, name, role, store_id, is_active, created_at, stores(name)")
      .single();

    if (error) throw error;

    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
