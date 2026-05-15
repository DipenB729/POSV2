import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  InventoryAdjustmentInput,
  InventoryQuery,
  MovementHistoryQuery,
} from "@/schemas/inventory.schema";

export type InventoryItemRow = {
  id: string;
  product_id: string;
  store_id: string;
  quantity: number;
  reorder_point: number;
  reorder_qty: number;
  location: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  products?: unknown;
  stores?: unknown;
};

export async function findAll(filters: InventoryQuery) {
  const supabase = createSupabaseAdminClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let matchingProductIds: string[] = [];

  if (filters.search) {
    const { data: products } = await supabase
      .from("products")
      .select("id")
      .or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`)
      .is("deleted_at", null);

    matchingProductIds = (products ?? []).map((product) => product.id);
  }

  let query = supabase
    .from("inventory_items")
    .select("*, products(*, categories(*)), stores(*)", { count: "exact" })
    .is("deleted_at", null)
    .range(from, to)
    .order("updated_at", { ascending: false });

  if (filters.storeId) {
    query = query.eq("store_id", filters.storeId);
  }

  if (filters.search) {
    const productFilter =
      matchingProductIds.length > 0
        ? `product_id.in.(${matchingProductIds.join(",")})`
        : "product_id.is.null";
    query = query.or(`${productFilter},location.ilike.%${filters.search}%`);
  }

  return query;
}

export async function findById(id: string) {
  const supabase = createSupabaseAdminClient();

  return supabase
    .from("inventory_items")
    .select("*, products(*, categories(*)), stores(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

export async function findMovements(filters: MovementHistoryQuery) {
  const supabase = createSupabaseAdminClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("inventory_movements")
    .select("*, inventory_items(*, products(name, sku)), profiles(id, name, role)", { count: "exact" })
    .range(from, to)
    .order("created_at", { ascending: false });

  if (filters.inventoryItemId) {
    query = query.eq("inventory_item_id", filters.inventoryItemId);
  }

  return query;
}

export async function recordMovement(input: InventoryAdjustmentInput, performedById: string) {
  const supabase = createSupabaseAdminClient();

  return supabase.rpc("record_inventory_movement", {
    p_inventory_item_id: input.inventoryItemId,
    p_type: input.type,
    p_quantity: input.quantity,
    p_reason: input.reason,
    p_reference_id: input.referenceId ?? null,
    p_performed_by_id: performedById,
  });
}
