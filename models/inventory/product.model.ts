import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { CreateProductInput, ProductQuery, UpdateProductInput } from "@/schemas/product.schema";

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  image_url: string | null;
  category_id: string;
  supplier_id: string | null;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  discountable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  categories?: unknown;
  suppliers?: unknown;
  inventory_items?: unknown[];
  product_variants?: unknown[];
};

export async function findAll(filters: ProductQuery) {
  const supabase = createSupabaseAdminClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("products")
    .select("*, categories(*), suppliers(*), inventory_items(*), product_variants(*)", {
      count: "exact",
    })
    .is("deleted_at", null)
    .range(from, to)
    .order("created_at", { ascending: false });

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (typeof filters.isActive === "boolean") {
    query = query.eq("is_active", filters.isActive);
  }

  return query;
}

export async function findById(id: string) {
  const supabase = createSupabaseAdminClient();

  return supabase
    .from("products")
    .select("*, categories(*), suppliers(*), inventory_items(*), product_variants(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

export async function findBySku(sku: string) {
  const supabase = createSupabaseAdminClient();

  return supabase
    .from("products")
    .select("*, categories(*), suppliers(*), inventory_items(*), product_variants(*)")
    .eq("sku", sku)
    .is("deleted_at", null)
    .maybeSingle();
}

export async function create(input: CreateProductInput) {
  const supabase = createSupabaseAdminClient();
  const { variants, ...product } = input;

  const created = await supabase.from("products").insert(product).select("*").single();

  if (created.error || variants.length === 0) {
    return created;
  }

  const variantRows = variants.map((variant) => ({
    ...variant,
    product_id: created.data.id,
  }));

  const variantsResult = await supabase.from("product_variants").insert(variantRows);

  if (variantsResult.error) {
    return { data: null, error: variantsResult.error };
  }

  return findById(created.data.id);
}

export async function update(id: string, input: UpdateProductInput) {
  const supabase = createSupabaseAdminClient();
  const { variants, ...product } = input;

  const updated = await supabase
    .from("products")
    .update(product)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (updated.error || variants === undefined) {
    return updated;
  }

  const deleteVariants = await supabase.from("product_variants").delete().eq("product_id", id);

  if (deleteVariants.error) {
    return { data: null, error: deleteVariants.error };
  }

  if (variants.length > 0) {
    const variantRows = variants.map(({ id: _id, ...variant }) => ({
      ...variant,
      product_id: id,
    }));
    const variantResult = await supabase.from("product_variants").insert(variantRows);

    if (variantResult.error) {
      return { data: null, error: variantResult.error };
    }
  }

  return findById(id);
}

export async function softDelete(id: string) {
  const supabase = createSupabaseAdminClient();

  return supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();
}

export async function updateImage(id: string, imageUrl: string) {
  const supabase = createSupabaseAdminClient();

  return supabase
    .from("products")
    .update({ image_url: imageUrl })
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();
}
