import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { CreateExpenseInput } from "@/schemas/expenses/expense.schema";

export async function createExpense(input: CreateExpenseInput) {
  const supabase = createSupabaseAdminClient();

  return supabase.rpc("create_expense", {
    p_store_id: input.storeId,
    p_category: input.category,
    p_description: input.description ?? null,
    p_amount: input.amount,
    p_payment_method: input.paymentMethod ?? null,
    p_reference: input.reference ?? null,
    p_incurred_at: input.incurredAt ?? null,
  });
}

export async function findExpenses(filters: { storeId?: string | null; from?: string | null; to?: string | null }) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("expenses")
    .select("*, stores(name), profiles(name, role)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.storeId) query = query.eq("store_id", filters.storeId);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  return query;
}
