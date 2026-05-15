import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { CreateRefundInput } from "@/schemas/refunds/refund.schema";

export async function createRefund(input: CreateRefundInput, metadata: Record<string, unknown> | null, ip: string | null) {
  const supabase = createSupabaseAdminClient();

  return supabase.rpc("create_order_refund_v2", {
    p_order_id: input.orderId,
    p_amount: input.amount,
    p_reason: input.reason,
    p_method: input.method,
    p_items: input.items,
    p_metadata: metadata,
    p_ip: ip,
  });
}
