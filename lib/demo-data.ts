export function isSupabasePlaceholder() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes("your-project.supabase.co");
}

export const demoCategories = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Electronics", slug: "electronics", parent_id: null, description: null },
  { id: "22222222-2222-4222-8222-222222222222", name: "Food & Beverages", slug: "food-beverages", parent_id: null, description: null },
  { id: "33333333-3333-4333-8333-333333333333", name: "Stationery", slug: "stationery", parent_id: null, description: null },
];

export const demoStoreId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

export const demoProducts = [
  {
    id: "aaaaaaaa-0001-4000-8000-000000000001",
    name: "Americano",
    slug: "americano",
    sku: "DRK-101",
    barcode: "890100001",
    description: "Fresh brewed coffee",
    image_url: null,
    category_id: demoCategories[1].id,
    supplier_id: null,
    cost_price: 80,
    selling_price: 180,
    tax_rate: 13,
    discountable: true,
    is_active: true,
    categories: demoCategories[1],
    inventory_items: [{ id: "inv-1", store_id: demoStoreId, quantity: 48, reorder_point: 10 }],
    product_variants: [],
  },
  {
    id: "aaaaaaaa-0002-4000-8000-000000000002",
    name: "Chicken Momo",
    slug: "chicken-momo",
    sku: "FOD-214",
    barcode: "890100002",
    description: "Steamed dumplings",
    image_url: null,
    category_id: demoCategories[1].id,
    supplier_id: null,
    cost_price: 130,
    selling_price: 260,
    tax_rate: 13,
    discountable: true,
    is_active: true,
    categories: demoCategories[1],
    inventory_items: [{ id: "inv-2", store_id: demoStoreId, quantity: 22, reorder_point: 8 }],
    product_variants: [{ id: "var-1", name: "Spicy", sku: "FOD-214-SP", barcode: "890100012", price_modifier: 20 }],
  },
  {
    id: "aaaaaaaa-0003-4000-8000-000000000003",
    name: "Notebook A5",
    slug: "notebook-a5",
    sku: "STA-044",
    barcode: "890100003",
    description: "Ruled notebook",
    image_url: null,
    category_id: demoCategories[2].id,
    supplier_id: null,
    cost_price: 45,
    selling_price: 90,
    tax_rate: 5,
    discountable: true,
    is_active: true,
    categories: demoCategories[2],
    inventory_items: [{ id: "inv-3", store_id: demoStoreId, quantity: 6, reorder_point: 10 }],
    product_variants: [],
  },
];

export const demoCustomers = [
  { id: "bbbbbbbb-0001-4000-8000-000000000001", name: "Walk-in Premium", email: null, phone: "+91-9000000001", loyalty_points: 120, tier: "SILVER" },
  { id: "bbbbbbbb-0002-4000-8000-000000000002", name: "Asha Sharma", email: "asha@example.com", phone: "+91-9000000002", loyalty_points: 540, tier: "GOLD" },
];

export const demoInventory = demoProducts.map((product) => ({
  id: product.inventory_items[0].id,
  product_id: product.id,
  store_id: demoStoreId,
  quantity: product.inventory_items[0].quantity,
  reorder_point: product.inventory_items[0].reorder_point,
  reorder_qty: 50,
  location: "Front shelf",
  updated_at: new Date().toISOString(),
  products: { name: product.name, sku: product.sku, barcode: product.barcode, categories: product.categories },
  stores: { name: "Main Branch" },
}));
