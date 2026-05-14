import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CategoryQuery, CreateCategoryInput, UpdateCategoryInput } from "@/schemas/category.schema";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export async function findAll(filters: CategoryQuery) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("categories")
    .select("*, parent:categories!parent_id(id,name,slug)")
    .order("name", { ascending: true });

  if (!filters.includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
  }

  if (filters.parentId !== undefined) {
    query = filters.parentId ? query.eq("parent_id", filters.parentId) : query.is("parent_id", null);
  }

  return query;
}

export async function findById(id: string) {
  const supabase = createSupabaseServerClient();

  return supabase
    .from("categories")
    .select("*, parent:categories!parent_id(id,name,slug)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

export async function findBySlug(slug: string) {
  const supabase = createSupabaseServerClient();

  return supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
}

export async function create(input: CreateCategoryInput) {
  const supabase = createSupabaseServerClient();

  return supabase.from("categories").insert(input).select("*").single();
}

export async function update(id: string, input: UpdateCategoryInput) {
  const supabase = createSupabaseServerClient();

  return supabase
    .from("categories")
    .update(input)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();
}

export async function softDelete(id: string) {
  const supabase = createSupabaseServerClient();

  return supabase
    .from("categories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();
}
