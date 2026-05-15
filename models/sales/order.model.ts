import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { TerminalOrderInput } from "@/schemas/terminal-order.schema";

export async function validateStock(input: TerminalOrderInput) {
  const supabase = createSupabaseAdminClient();
  const productIds = input.items.map((item) => item.productId);

  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, product_id, store_id, quantity, products(name, sku)")
    .eq("store_id", input.storeId)
    .in("product_id", productIds)
    .is("deleted_at", null);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const byProduct = new Map((data ?? []).map((item) => [item.product_id, item]));

  for (const item of input.items) {
    const inventory = byProduct.get(item.productId);

    if (!inventory) {
      return { ok: false as const, error: `No inventory record found for ${item.name}` };
    }

    if (inventory.quantity < item.quantity) {
      return {
        ok: false as const,
        error: `${item.name} has only ${inventory.quantity} in stock`,
      };
    }
  }

  return { ok: true as const };
}

export async function findReceipt(orderId: string) {
  const supabase = createSupabaseAdminClient();

  return supabase
    .from("orders")
    .select("*, order_items(*), payments(*), customers(*), stores(*)")
    .eq("id", orderId)
    .single();
}

export async function createPendingPhonePeOrder(input: TerminalOrderInput, totalDiscount: number) {
  const supabase = createSupabaseAdminClient();

  return supabase.rpc("create_pending_phonepe_order", {
    p_store_id: input.storeId,
    p_customer_id: input.customerId ?? null,
    p_discount_id: null,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      variant_id: item.variantId ?? null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      tax_rate: item.taxRate,
      discount: item.discount ?? 0,
    })),
    p_notes: input.notes ?? null,
    p_discount_amount: totalDiscount,
  });
}

export async function findById(orderId: string) {
  const supabase = createSupabaseAdminClient();

  return supabase.from("orders").select("*").eq("id", orderId).single();
}
