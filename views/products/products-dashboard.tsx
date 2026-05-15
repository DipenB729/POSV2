"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Edit, Filter, ImagePlus, Layers3, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppHeader, AppShell } from "@/components/app-shell";
import { PageLoader } from "@/components/page-loader";

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
    <AppShell>
<AppHeader
        eyebrow="Catalog"
        title="Products"
        action={
          <Button size="lg" className="gap-2 bg-slate-900 hover:bg-slate-800" onClick={openCreateDrawer}>
            <Plus className="size-4" />
            Add Product
          </Button>
        }
      />

<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <form
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-[1fr_220px_180px_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void loadProducts();
            }}
          >
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
                placeholder="Search by name, SKU, or barcode"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
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
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
              value={isActive}
              onChange={(event) => setIsActive(event.target.value)}
            >
              <option value="">Any status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <Button type="submit" variant="outline" size="lg" className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900">
              <Filter className="size-4" />
              Filter
            </Button>
          </form>

          {message ? <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">{message}</div> : null}

          {isLoading ? <PageLoader label="Loading products" /> : null}

          <div className={isLoading ? "hidden" : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"}>
            <div className="grid grid-cols-[1.5fr_120px_140px_110px_120px] border-b border-slate-100 bg-slate-50/50 px-4 py-3 text-xs font-bold uppercase text-slate-500">
              <span>Product</span>
              <span>SKU</span>
              <span>Category</span>
              <span>Price</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-slate-50">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="grid grid-cols-[1.5fr_120px_140px_110px_120px] items-center px-4 py-3 text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.image_url} alt="" className="size-full object-cover" />
                      ) : (
                        <Layers3 className="size-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-500">
                        {product.is_active ? "Active" : "Inactive"} · {product.product_variants?.length ?? 0} variants
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-600">{product.sku}</span>
                  <span className="truncate text-slate-600">{product.categories?.name ?? "Unassigned"}</span>
                  <span className="font-semibold text-slate-900">Rs {product.selling_price}</span>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="icon-sm" className="border-slate-200 hover:bg-slate-100" onClick={() => openEditDrawer(product)}>
                      <Edit className="size-4" />
                    </Button>
                    <Button variant="destructive" size="icon-sm" onClick={() => void deleteProduct(product)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {products.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">
                  {isLoading ? "Loading products" : "No products found"}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Manage</p>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Categories</h2>
          </div>
          <form className="space-y-3" onSubmit={(event) => void submitCategory(event)}>
            <input
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
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
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
              placeholder="category-slug"
              value={categoryForm.slug}
              onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))}
            />
            <select
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
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
            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800">
              <Plus className="size-4" />
              Add Category
            </Button>
          </form>
          <div className="mt-5 space-y-2">
            {categoryOptions.map((category) => (
              <div key={category.id} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                {category.label}
              </div>
            ))}
          </div>
        </aside>
      </div>

{isDrawerOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm">
          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <form className="space-y-6 p-6" onSubmit={(event) => void submitProduct(event)}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{form.id ? "Edit" : "Create"}</p>
                  <h2 className="text-xl font-bold text-slate-900">Product Details</h2>
                </div>
                <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600" onClick={() => setIsDrawerOpen(false)}>
                  <X className="size-5" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="flex items-end gap-6">
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                    <input type="checkbox" className="rounded border-slate-300" checked={form.discountable} onChange={(event) => updateForm("discountable", event.target.checked)} />
                    Discountable
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                    <input type="checkbox" className="rounded border-slate-300" checked={form.is_active} onChange={(event) => updateForm("is_active", event.target.checked)} />
                    Active
                  </label>
                </div>
              </div>

              <Field label="Description">
                <textarea className="input min-h-24 py-2.5 resize-none" value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
              </Field>

              {form.id ? (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition-all">
                  <ImagePlus className="size-5" />
                  Upload product image
                  <input className="hidden" type="file" accept="image/*" onChange={(event) => void uploadImage(event.target.files?.[0] ?? null)} />
                </label>
              ) : null}

              <div className="rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                  <h3 className="font-bold text-slate-900">Product Variants</h3>
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addVariant}>
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
                <div className="space-y-3 p-4">
                  {form.variants.map((variant, index) => (
                    <div key={`${variant.sku}-${index}`} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_100px_auto]">
                      <input className="input bg-white" placeholder="Name" value={variant.name} onChange={(event) => updateVariant(index, "name", event.target.value)} />
                      <input className="input bg-white" placeholder="SKU" value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} />
                      <input className="input bg-white" type="number" step="0.01" placeholder="+/- Rs" value={variant.price_modifier} onChange={(event) => updateVariant(index, "price_modifier", Number(event.target.value))} />
                      <Button type="button" variant="ghost" size="icon-sm" className="text-slate-400 hover:text-red-600" onClick={() => removeVariant(index)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {form.variants.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">No variants configured. Add variants for different sizes, colors, etc.</p>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <Button type="button" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => setIsDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800">{form.id ? "Save Changes" : "Create Product"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
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
