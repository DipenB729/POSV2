"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Edit, Filter, ImagePlus, Layers3, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-shell";

type ApiResponse<T> =
  | { ok: true; data: T; meta?: { total?: number; page?: number; limit?: number } }
  | { ok: false; error: string };

type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
};

type ProductVariant = {
  id?: string;
  name: string;
  sku: string;
  barcode: string | null;
  price_modifier: number;
  attributes: Record<string, unknown>;
};

type Product = {
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
  categories?: Category | null;
  product_variants?: ProductVariant[];
};

type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  description: string;
  image_url: string;
  category_id: string;
  cost_price: string;
  selling_price: string;
  tax_rate: string;
  discountable: boolean;
  is_active: boolean;
  variants: ProductVariant[];
};

const emptyProductForm: ProductForm = {
  name: "",
  slug: "",
  sku: "",
  barcode: "",
  description: "",
  image_url: "",
  category_id: "",
  cost_price: "0",
  selling_price: "0",
  tax_rate: "0",
  discountable: true,
  is_active: true,
  variants: [],
};

export function ProductsDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", parent_id: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);

  async function loadCategories() {
    const response = await fetch("/api/categories", { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<Category[]>;

    if (payload.ok) {
      setCategories(payload.data);
    }
  }

  async function loadProducts() {
    setIsLoading(true);
    const params = new URLSearchParams({ page: "1", limit: "50" });

    if (search) params.set("search", search);
    if (categoryId) params.set("categoryId", categoryId);
    if (isActive) params.set("isActive", isActive);

    const response = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<Product[]>;

    if (payload.ok) {
      setProducts(payload.data);
      setMessage("");
    } else {
      setMessage(payload.error);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    void loadCategories();
    void loadProducts();
  }, []);

  function openCreateDrawer() {
    setForm({ ...emptyProductForm, category_id: categories[0]?.id ?? "" });
    setIsDrawerOpen(true);
  }

  function openEditDrawer(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      barcode: product.barcode ?? "",
      description: product.description ?? "",
      image_url: product.image_url ?? "",
      category_id: product.category_id,
      cost_price: String(product.cost_price),
      selling_price: String(product.selling_price),
      tax_rate: String(product.tax_rate),
      discountable: product.discountable,
      is_active: product.is_active,
      variants: product.product_variants ?? [],
    });
    setIsDrawerOpen(true);
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isEdit = Boolean(form.id);
    const response = await fetch(isEdit ? `/api/products/${form.id}` : "/api/products", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        sku: form.sku,
        barcode: form.barcode || null,
        description: form.description || null,
        image_url: form.image_url || null,
        category_id: form.category_id,
        supplier_id: null,
        cost_price: Number(form.cost_price),
        selling_price: Number(form.selling_price),
        tax_rate: Number(form.tax_rate),
        discountable: form.discountable,
        is_active: form.is_active,
        variants: form.variants,
      }),
    });
    const payload = (await response.json()) as ApiResponse<Product>;

    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }

    setIsDrawerOpen(false);
    setMessage(isEdit ? "Product updated" : "Product created");
    await loadProducts();
  }

  async function deleteProduct(product: Product) {
    const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    const payload = (await response.json()) as ApiResponse<Product>;

    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }

    setMessage("Product archived");
    await loadProducts();
  }

  async function uploadImage(file: File | null) {
    if (!file || !form.id) return;

    const body = new FormData();
    body.append("file", file);
    const response = await fetch(`/api/products/${form.id}/image`, {
      method: "POST",
      body,
    });
    const payload = (await response.json()) as ApiResponse<Product>;

    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }

    setForm((current) => ({ ...current, image_url: payload.data.image_url ?? "" }));
    setMessage("Image uploaded");
    await loadProducts();
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: categoryForm.name,
        slug: categoryForm.slug,
        parent_id: categoryForm.parent_id || null,
      }),
    });
    const payload = (await response.json()) as ApiResponse<Category>;

    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }

    setCategoryForm({ name: "", slug: "", parent_id: "" });
    setMessage("Category created");
    await loadCategories();
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader
        eyebrow="Catalog Management"
        title="Products"
        action={
          <Button size="lg" onClick={openCreateDrawer}>
            <Plus className="size-4" />
            Add Product
          </Button>
        }
      />

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <form
            className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_220px_180px_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void loadProducts();
            }}
          >
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="Search by name, SKU, or barcode"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              value={isActive}
              onChange={(event) => setIsActive(event.target.value)}
            >
              <option value="">Any status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <Button type="submit" variant="outline" size="lg">
              <Filter className="size-4" />
              Filter
            </Button>
          </form>

          {message ? <div className="rounded-md border bg-white px-4 py-3 text-sm">{message}</div> : null}

          <div className="overflow-hidden rounded-lg border bg-white">
            <div className="grid grid-cols-[1.5fr_120px_140px_110px_120px] border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
              <span>Product</span>
              <span>SKU</span>
              <span>Category</span>
              <span>Price</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="grid grid-cols-[1.5fr_120px_140px_110px_120px] items-center px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border bg-muted">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.image_url} alt="" className="size-full object-cover" />
                      ) : (
                        <Layers3 className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.is_active ? "Active" : "Inactive"} · {product.product_variants?.length ?? 0} variants
                      </p>
                    </div>
                  </div>
                  <span>{product.sku}</span>
                  <span className="truncate">{product.categories?.name ?? "Unassigned"}</span>
                  <span>Rs {product.selling_price}</span>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="icon-sm" onClick={() => openEditDrawer(product)}>
                      <Edit className="size-4" />
                    </Button>
                    <Button variant="destructive" size="icon-sm" onClick={() => void deleteProduct(product)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {products.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading products" : "No products found"}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="h-fit rounded-lg border bg-white p-4">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Nested Categories</p>
            <h2 className="text-base font-semibold">Category Manager</h2>
          </div>
          <form className="space-y-3" onSubmit={(event) => void submitCategory(event)}>
            <input
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Category name"
              value={categoryForm.name}
              onChange={(event) =>
                setCategoryForm((current) => ({
                  ...current,
                  name: event.target.value,
                  slug: slugify(event.target.value),
                }))
              }
            />
            <input
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="category-slug"
              value={categoryForm.slug}
              onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))}
            />
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              value={categoryForm.parent_id}
              onChange={(event) => setCategoryForm((current) => ({ ...current, parent_id: event.target.value }))}
            >
              <option value="">Top level</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            <Button type="submit" className="w-full">
              <Plus className="size-4" />
              Add Category
            </Button>
          </form>
          <div className="mt-5 space-y-2">
            {categoryOptions.map((category) => (
              <div key={category.id} className="rounded-md border px-3 py-2 text-sm">
                {category.label}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 bg-black/30">
          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
            <form className="space-y-5 p-6" onSubmit={(event) => void submitProduct(event)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{form.id ? "Edit Product" : "New Product"}</p>
                  <h2 className="text-xl font-semibold">Catalog Details</h2>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setIsDrawerOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <input className="input" value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
                </Field>
                <Field label="Slug">
                  <input className="input" value={form.slug} onChange={(event) => updateForm("slug", event.target.value)} />
                </Field>
                <Field label="SKU">
                  <input className="input" value={form.sku} onChange={(event) => updateForm("sku", event.target.value)} />
                </Field>
                <Field label="Barcode">
                  <input className="input" value={form.barcode} onChange={(event) => updateForm("barcode", event.target.value)} />
                </Field>
                <Field label="Category">
                  <select className="input" value={form.category_id} onChange={(event) => updateForm("category_id", event.target.value)}>
                    <option value="">Select category</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Image URL">
                  <input className="input" value={form.image_url} onChange={(event) => updateForm("image_url", event.target.value)} />
                </Field>
                <Field label="Cost Price">
                  <input className="input" type="number" min="0" step="0.01" value={form.cost_price} onChange={(event) => updateForm("cost_price", event.target.value)} />
                </Field>
                <Field label="Selling Price">
                  <input className="input" type="number" min="0" step="0.01" value={form.selling_price} onChange={(event) => updateForm("selling_price", event.target.value)} />
                </Field>
                <Field label="Tax Rate">
                  <input className="input" type="number" min="0" step="0.01" value={form.tax_rate} onChange={(event) => updateForm("tax_rate", event.target.value)} />
                </Field>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.discountable} onChange={(event) => updateForm("discountable", event.target.checked)} />
                    Discountable
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.is_active} onChange={(event) => updateForm("is_active", event.target.checked)} />
                    Active
                  </label>
                </div>
              </div>

              <Field label="Description">
                <textarea className="input min-h-20 py-2" value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
              </Field>

              {form.id ? (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-4 py-5 text-sm">
                  <ImagePlus className="size-4" />
                  Upload product image
                  <input className="hidden" type="file" accept="image/*" onChange={(event) => void uploadImage(event.target.files?.[0] ?? null)} />
                </label>
              ) : null}

              <div className="rounded-lg border">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h3 className="font-medium">Variants</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                    <Plus className="size-4" />
                    Add Variant
                  </Button>
                </div>
                <div className="space-y-3 p-4">
                  {form.variants.map((variant, index) => (
                    <div key={`${variant.sku}-${index}`} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_100px_auto]">
                      <input className="input" placeholder="Name" value={variant.name} onChange={(event) => updateVariant(index, "name", event.target.value)} />
                      <input className="input" placeholder="SKU" value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} />
                      <input className="input" type="number" step="0.01" placeholder="+/- Rs" value={variant.price_modifier} onChange={(event) => updateVariant(index, "price_modifier", Number(event.target.value))} />
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeVariant(index)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {form.variants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No variants configured.</p>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{form.id ? "Save Changes" : "Create Product"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );

  function updateForm<Key extends keyof ProductForm>(key: Key, value: ProductForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addVariant() {
    setForm((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          name: "",
          sku: "",
          barcode: null,
          price_modifier: 0,
          attributes: {},
        },
      ],
    }));
  }

  function updateVariant<Key extends keyof ProductVariant>(index: number, key: Key, value: ProductVariant[Key]) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: value } : variant,
      ),
    }));
  }

  function removeVariant(index: number) {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildCategoryOptions(categories: Category[]) {
  const byParent = new Map<string, Category[]>();

  for (const category of categories) {
    const key = category.parent_id ?? "root";
    byParent.set(key, [...(byParent.get(key) ?? []), category]);
  }

  const result: Array<{ id: string; label: string }> = [];

  function walk(parentId: string, depth: number) {
    const children = byParent.get(parentId) ?? [];

    for (const category of children) {
      result.push({ id: category.id, label: `${"  ".repeat(depth)}${category.name}` });
      walk(category.id, depth + 1);
    }
  }

  walk("root", 0);
  return result;
}
