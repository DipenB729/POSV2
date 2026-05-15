export function isSupabasePlaceholder() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  return (
    url.includes("your-project.supabase.co") ||
    url.includes("127.0.0.1") ||
    url.includes("localhost") ||
    anonKey.startsWith("local-placeholder")
  );
}

export const demoCategories = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Hot Drinks", slug: "hot-drinks", parent_id: null, description: null },
  { id: "22222222-2222-4222-8222-222222222222", name: "Food & Snacks", slug: "food-snacks", parent_id: null, description: null },
  { id: "33333333-3333-4333-8333-333333333333", name: "Cold Drinks", slug: "cold-drinks", parent_id: null, description: null },
  { id: "44444444-4444-4444-8444-444444444444", name: "Bakery", slug: "bakery", parent_id: null, description: null },
  { id: "55555555-5555-4555-8555-555555555555", name: "Retail", slug: "retail", parent_id: null, description: null },
];

export const demoStoreId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type ProductSeed = readonly [
  name: string,
  slug: string,
  sku: string,
  barcode: string,
  description: string,
  costPrice: number,
  sellingPrice: number,
  quantity: number,
  reorderPoint: number,
  categoryId: string,
];

const productSeeds: ProductSeed[] = [
  ["Americano", "americano", "DRK-101", "890100001", "Fresh brewed coffee", 80, 180, 48, 10, demoCategories[0].id],
  ["Chicken Momo", "chicken-momo", "FOD-214", "890100002", "Steamed chicken dumplings", 130, 260, 22, 8, demoCategories[1].id],
  ["Veg Chowmein", "veg-chowmein", "FOD-188", "890100003", "Stir fried noodles", 105, 220, 16, 8, demoCategories[1].id],
  ["Mineral Water", "mineral-water", "DRK-019", "890100004", "Bottled drinking water", 18, 40, 96, 20, demoCategories[2].id],
  ["Masala Tea", "masala-tea", "DRK-115", "890100005", "Spiced milk tea", 35, 90, 54, 12, demoCategories[0].id],
  ["Cafe Latte", "cafe-latte", "DRK-122", "890100006", "Espresso with steamed milk", 95, 210, 30, 10, demoCategories[0].id],
  ["Chocolate Muffin", "chocolate-muffin", "BAK-042", "890100007", "Rich chocolate muffin", 70, 150, 18, 6, demoCategories[3].id],
  ["Veg Sandwich", "veg-sandwich", "FOD-305", "890100008", "Grilled vegetable sandwich", 85, 190, 14, 8, demoCategories[1].id],
  ["Orange Juice", "orange-juice", "DRK-220", "890100009", "Fresh orange juice", 90, 200, 25, 10, demoCategories[2].id],
  ["Notebook A5", "notebook-a5", "RTL-044", "890100010", "Ruled A5 notebook", 45, 90, 6, 10, demoCategories[4].id],
] as const;

export const demoProducts = productSeeds.map((product, index) => {
  const [name, slug, sku, barcode, description, cost_price, selling_price, quantity, reorder_point, category_id] = product;
  const category = demoCategories.find((item) => item.id === category_id) ?? demoCategories[0];
  const number = String(index + 1).padStart(12, "0");
  const group = String(index + 1).padStart(4, "0");

  return {
    id: `aaaaaaaa-${group}-4000-8000-${number}`,
    name,
    slug,
    sku,
    barcode,
    description,
    image_url: null,
    category_id,
    supplier_id: null,
    cost_price,
    selling_price,
    tax_rate: category.slug === "retail" ? 5 : 13,
    discountable: true,
    is_active: true,
    categories: category,
    inventory_items: [
      {
        id: `bbbbbbbb-${group}-4000-8000-${number}`,
        store_id: demoStoreId,
        quantity,
        reorder_point,
      },
    ],
    product_variants:
      index === 1
        ? [{ id: "cccccccc-0001-4000-8000-000000000001", name: "Spicy", sku: "FOD-214-SP", barcode: "890100012", price_modifier: 20 }]
        : [],
  };
});

type CustomerSeed = readonly [name: string, email: string | null, phone: string, loyaltyPoints: number, tier: string];

const customerSeeds: CustomerSeed[] = [
  ["Walk-in Premium", null, "+91-9000000001", 120, "SILVER"],
  ["Asha Sharma", "asha@example.com", "+91-9000000002", 540, "GOLD"],
  ["Bibek Gurung", "bibek@example.com", "+977-9800000003", 310, "SILVER"],
  ["Nisha Thapa", "nisha@example.com", "+977-9800000004", 760, "GOLD"],
  ["Rohan Mehta", "rohan@example.com", "+91-9000000005", 80, "STANDARD"],
  ["Priya Rai", "priya@example.com", "+977-9800000006", 1020, "PLATINUM"],
  ["Kiran Shrestha", "kiran@example.com", "+977-9800000007", 210, "SILVER"],
  ["Maya Lama", "maya@example.com", "+977-9800000008", 450, "GOLD"],
  ["Sanjay Singh", "sanjay@example.com", "+91-9000000009", 40, "STANDARD"],
  ["Tara KC", "tara@example.com", "+977-9800000010", 630, "GOLD"],
];

export const demoCustomers = customerSeeds.map(([name, email, phone, loyalty_points, tier], index) => ({
  id: `dddddddd-${String(index + 1).padStart(4, "0")}-4000-8000-${String(index + 1).padStart(12, "0")}`,
  name,
  email,
  phone,
  loyalty_points,
  tier,
}));

export const demoInventory = demoProducts.map((product, index) => ({
  id: product.inventory_items[0].id,
  product_id: product.id,
  store_id: demoStoreId,
  quantity: product.inventory_items[0].quantity,
  reorder_point: product.inventory_items[0].reorder_point,
  reorder_qty: 50,
  location: index % 2 === 0 ? "Front shelf" : "Back counter",
  updated_at: new Date().toISOString(),
  products: { name: product.name, sku: product.sku, barcode: product.barcode, categories: product.categories },
  stores: { name: "Main Branch" },
}));
