import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function createPendingPayment(input: {
  orderId: string;
  amount: number;
  merchantTransactionId: string;
}) {
  const supabase = createSupabaseServerClient();

  return supabase
    .from("payments")
    .insert({
      order_id: input.orderId,
      method: "PHONEPE_QR",
      amount: input.amount,
      status: "PENDING",
      reference: input.merchantTransactionId,
      metadata: {
        merchantTransactionId: input.merchantTransactionId,
      },
    })
    .select("*")
    .single();
}

export async function findByMerchantTransactionId(merchantTransactionId: string, useAdmin = false) {
  const supabase = useAdmin ? createSupabaseAdminClient() : createSupabaseServerClient();

  return supabase
    .from("payments")
    .select("*, orders(*)")
    .eq("reference", merchantTransactionId)
    .maybeSingle();
}

export async function markFailed(paymentId: string, metadata?: Record<string, unknown>, useAdmin = false) {
  const supabase = useAdmin ? createSupabaseAdminClient() : createSupabaseServerClient();

  return supabase
    .from("payments")
    .update({
      status: "FAILED",
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .select("*")
    .single();
}

export async function updateMetadata(paymentId: string, metadata: Record<string, unknown>) {
  const supabase = createSupabaseServerClient();

  return supabase
    .from("payments")
    .update({
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .select("*")
    .single();
}

export async function confirmPayment(input: {
  orderId: string;
  paymentId: string;
  reference: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();

  return supabase.rpc("confirm_phonepe_order_payment", {
    p_order_id: input.orderId,
    p_payment_id: input.paymentId,
    p_reference: input.reference,
    p_metadata: input.metadata ?? null,
  });
}
