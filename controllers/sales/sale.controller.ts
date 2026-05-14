import { calculateSaleTotals } from "@/models/sales/sale.model";
import {
  createOrderRefundRpcSchema,
  createPosOrderRpcSchema,
  type CreateOrderRefundRpcInput,
  type CreatePosOrderRpcInput,
} from "@/schemas/order-rpc.schema";
import { createSaleSchema, type CreateSaleInput } from "@/schemas/sale.schema";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export async function createSale(input: CreateSaleInput) {
  const payload = createSaleSchema.parse(input);
  const totals = calculateSaleTotals(payload);

  return {
    payload,
    totals,
    status: "draft" as const,
  };
}

export async function createPosOrder(input: CreatePosOrderRpcInput) {
  const payload = createPosOrderRpcSchema.parse(input);
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc("create_pos_order", {
    p_store_id: payload.storeId,
    p_customer_id: payload.customerId ?? null,
    p_discount_id: payload.discountId ?? null,
    p_items: payload.items,
    p_payments: payload.payments,
    p_notes: payload.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function createOrderRefund(input: CreateOrderRefundRpcInput) {
  const payload = createOrderRefundRpcSchema.parse(input);
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc("create_order_refund", {
    p_order_id: payload.orderId,
    p_amount: payload.amount,
    p_reason: payload.reason,
    p_method: payload.method,
    p_metadata: payload.metadata ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}
