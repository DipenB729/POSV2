"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Banknote,
  Barcode,
  Bell,
  Boxes,
  ChefHat,
  CreditCard,
  HelpCircle,
  History,
  Home,
  LogOut,
  Minus,
  PackageSearch,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Trash2,
  Utensils,
  Wine,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CartItem, PaymentMethod, roundMoney, useCartStore } from "@/stores/cartStore";

type ApiResponse<T> =
  | { ok: true; data: T; meta?: Record<string, unknown> }
  | { ok: false; error: string };

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

type InventoryItem = {
  id: string;
  store_id: string;
  quantity: number;
  reorder_point: number;
};

type ProductVariant = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price_modifier: number;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category_id: string;
  selling_price: number;
  tax_rate: number;
  image_url: string | null;
  categories?: Category | null;
  inventory_items?: InventoryItem[];
  product_variants?: ProductVariant[];
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  loyalty_points: number;
  tier: string;
};

type Receipt = {
  id: string;
  order_number: string;
  total_amount: number;
  amount_paid: number;
  change_due: number;
  created_at: string;
  order_items?: Array<{
    id: string;
    name: string;
    quantity: number;
    line_total: number;
  }>;
  payments?: Array<{
    method: string;
    amount: number;
    reference: string | null;
  }>;
};

const sideNav = [
  { label: "Home", href: "/", icon: Home },
  { label: "Menu", href: "/terminal", icon: Utensils },
  { label: "Products", href: "/products", icon: PackageSearch },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help Center", href: "/", icon: HelpCircle },
];

export function TerminalView() {
  const {
    items,
    customerId,
    discount,
    note,
    addItem,
    removeItem,
    updateQty,
    applyDiscount,
    setCustomer,
    setNote,
    clearCart,
  } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [message, setMessage] = useState("");

  const stores = useMemo(() => {
    const ids = new Set<string>();
    products.forEach((product) => product.inventory_items?.forEach((item) => ids.add(item.store_id)));
    return Array.from(ids);
  }, [products]);

  const visibleProducts = useMemo(() => {
    const normalized = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesCategory = categoryId ? product.category_id === categoryId : true;
      const matchesSearch = normalized
        ? [product.name, product.sku, product.barcode ?? ""].some((value) => value.toLowerCase().includes(normalized))
        : true;

      return matchesCategory && matchesSearch;
    });
  }, [categoryId, products, search]);

  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const subtotal = useMemo(() => roundMoney(items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)), [items]);
  const tax = useMemo(
    () => roundMoney(items.reduce((total, item) => total + item.unitPrice * item.quantity * (item.taxRate / 100), 0)),
    [items],
  );
  const total = roundMoney(Math.max(subtotal + tax - (discount?.amount ?? 0), 0));

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!storeId && stores[0]) {
      setStoreId(stores[0]);
    }
  }, [storeId, stores]);

  async function loadData() {
    const [productResponse, categoryResponse, customerResponse] = await Promise.all([
      fetch("/api/products?limit=100&isActive=true", { cache: "no-store" }),
      fetch("/api/categories", { cache: "no-store" }),
      fetch("/api/customers", { cache: "no-store" }),
    ]);
    const productPayload = (await productResponse.json()) as ApiResponse<Product[]>;
    const categoryPayload = (await categoryResponse.json()) as ApiResponse<Category[]>;
    const customerPayload = (await customerResponse.json()) as ApiResponse<Customer[]>;

    if (productPayload.ok) setProducts(productPayload.data);
    if (categoryPayload.ok) setCategories(categoryPayload.data);
    if (customerPayload.ok) setCustomers(customerPayload.data);
  }

  function stockFor(product: Product) {
    const inventory = product.inventory_items ?? [];
    const scoped = storeId ? inventory.filter((item) => item.store_id === storeId) : inventory;
    return scoped.reduce((sum, item) => sum + item.quantity, 0);
  }

  function addProduct(product: Product, variant?: ProductVariant) {
    const stock = stockFor(product);
    const existingQty = items.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);

    if (!storeId) {
      setMessage("Select a store before selling");
      return;
    }

    if (stock <= existingQty) {
      setMessage(`${product.name} has no remaining stock for this cart`);
      return;
    }

    const unitPrice = Number(product.selling_price) + Number(variant?.price_modifier ?? 0);
    addItem({
      productId: product.id,
      variantId: variant?.id,
      name: variant ? `${product.name} - ${variant.name}` : product.name,
      sku: variant?.sku ?? product.sku,
      unitPrice,
      taxRate: Number(product.tax_rate ?? 0),
      quantity: 1,
      lineTotal: 0,
    });
    setMessage("");
  }

  function submitBarcode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = barcode.trim().toLowerCase();
    const match = products.find((product) => {
      const productMatch = product.barcode?.toLowerCase() === value || product.sku.toLowerCase() === value;
      const variantMatch = product.product_variants?.some(
        (variant) => variant.barcode?.toLowerCase() === value || variant.sku.toLowerCase() === value,
      );
      return productMatch || variantMatch;
    });

    if (!match) {
      setMessage("No product matched the scanned barcode");
      return;
    }

    const variant = match.product_variants?.find(
      (item) => item.barcode?.toLowerCase() === value || item.sku.toLowerCase() === value,
    );
    addProduct(match, variant);
    setBarcode("");
  }

  function applyManualDiscount() {
    const amount = Number(discountAmount);

    if (!discountCode || amount <= 0) {
      setMessage("Enter a discount code and amount");
      return;
    }

    applyDiscount({ code: discountCode, amount });
    setMessage("Discount applied");
  }

  return (
    <main className="min-h-screen bg-[#eaf8f1] p-3 text-[#16251f]">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1580px] grid-cols-1 overflow-hidden rounded-[22px] bg-white shadow-2xl shadow-emerald-950/10 lg:grid-cols-[220px_minmax(0,1fr)_390px]">
        <aside className="hidden border-r border-emerald-100 bg-white lg:flex lg:flex-col">
          <Link href="/" className="flex h-20 items-center gap-2 px-7">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <Store className="size-5" />
            </span>
            <span className="text-lg font-bold">Foodigo</span>
          </Link>
          <nav className="space-y-1 px-4">
            {sideNav.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/terminal";
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    active
                      ? "flex h-11 items-center gap-3 rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-700"
                      : "flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link href="/" className="mt-auto flex h-14 items-center gap-3 px-8 text-sm font-medium text-slate-500 hover:text-slate-900">
            <LogOut className="size-4" />
            Logout
          </Link>
        </aside>

        <section className="min-w-0 bg-[#fbfffd] px-4 py-5 md:px-7">
          <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <Link className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white lg:hidden" href="/">
                <Home className="size-5" />
              </Link>
              <form className="relative w-full min-w-[260px] max-w-[520px]" onSubmit={submitBarcode}>
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-12 w-full rounded-xl border border-emerald-100 bg-white pl-11 pr-4 text-sm outline-none ring-emerald-200 transition focus:ring-4"
                  placeholder="Search menu"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </form>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <form className="relative w-48" onSubmit={submitBarcode}>
                <Barcode className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-11 w-full rounded-xl border border-emerald-100 bg-white pl-10 pr-3 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                  placeholder="Scan SKU"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                />
              </form>
              <select
                className="h-11 rounded-xl border border-emerald-100 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
              >
                <option value="">Select store</option>
                {stores.map((id) => (
                  <option key={id} value={id}>
                    Store {id.slice(0, 8)}
                  </option>
                ))}
              </select>
              <button className="flex size-11 items-center justify-center rounded-xl border border-emerald-100 bg-white text-slate-600">
                <Bell className="size-4" />
              </button>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-3 py-2">
                <div className="size-8 rounded-full bg-[linear-gradient(135deg,#f7b267,#f79d65)]" />
                <div className="hidden text-sm sm:block">
                  <p className="font-semibold">John Doe</p>
                  <p className="text-xs text-slate-400">Cashier</p>
                </div>
              </div>
            </div>
          </header>

          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Category</p>
              <h1 className="mt-1 text-2xl font-bold">Special menu for you</h1>
            </div>
            {message ? <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">{message}</span> : null}
          </div>

          <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
            <CategoryCard active={!categoryId} label="All" icon={<Utensils className="size-7" />} onClick={() => setCategoryId("")} />
            {categories.map((category, index) => (
              <CategoryCard
                key={category.id}
                active={categoryId === category.id}
                label={category.name}
                icon={categoryIcon(index)}
                onClick={() => setCategoryId(category.id)}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleProducts.map((product, index) => {
              const stock = stockFor(product);
              const reorderPoint = Math.max(...(product.inventory_items ?? []).map((item) => item.reorder_point), 0);
              const isLow = stock > 0 && stock <= reorderPoint;

              return (
                <article
                  key={product.id}
                  className="group rounded-[20px] border border-emerald-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-950/10"
                >
                  <div className="relative mx-auto mb-4 flex aspect-square max-h-36 items-center justify-center rounded-full bg-[#fff6ec]">
                    <div className={productBlobClass(index)} />
                    <span className="relative text-4xl font-black text-white drop-shadow-sm">{product.name.slice(0, 1)}</span>
                  </div>
                  <div className="min-h-[70px] text-center">
                    <h2 className="line-clamp-2 text-sm font-bold">{product.name}</h2>
                    <p className="mt-1 text-xs font-medium text-slate-400">{product.sku}</p>
                    <p className="mt-2 text-lg font-black">Rs {Number(product.selling_price).toFixed(2)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span
                      className={
                        stock <= 0
                          ? "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600"
                          : isLow
                            ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
                            : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                      }
                    >
                      {stock} stock
                    </span>
                    <Button
                      className="h-9 rounded-full bg-emerald-500 px-3 text-white hover:bg-emerald-600"
                      disabled={stock <= 0}
                      onClick={() => addProduct(product)}
                    >
                      <Plus className="size-4" />
                      Add
                    </Button>
                  </div>
                  {product.product_variants && product.product_variants.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.product_variants.map((variant) => (
                        <Button key={variant.id} variant="outline" size="xs" onClick={() => addProduct(product, variant)}>
                          {variant.name}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="border-l border-emerald-100 bg-white">
          <div className="flex min-h-full flex-col">
            <div className="border-b border-emerald-100 p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-black">Order Details</h2>
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-500">
                  {selectedCustomer ? initials(selectedCustomer.name) : "WI"}
                </div>
                <div className="min-w-0 flex-1">
                  <select
                    className="h-9 w-full rounded-lg border-0 bg-transparent text-sm font-bold outline-none"
                    value={customerId ?? ""}
                    onChange={(event) => setCustomer(event.target.value || undefined)}
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.tier}
                      </option>
                    ))}
                  </select>
                  <p className="truncate text-xs text-slate-400">{selectedCustomer?.phone ?? "No customer selected"}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {["Dine In", "Takeout", "Curbside", "Delivery"].map((type, index) => (
                  <button
                    key={type}
                    className={
                      index === 0
                        ? "h-9 rounded-full bg-emerald-50 text-xs font-bold text-emerald-700"
                        : "h-9 rounded-full bg-slate-50 text-xs font-bold text-slate-500"
                    }
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[42vh] flex-1 overflow-y-auto p-5">
              <div className="mb-3 grid grid-cols-[1fr_70px_80px] text-xs font-bold text-slate-400">
                <span>Order</span>
                <span>Qty</span>
                <span className="text-right">Price</span>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.variantId ?? "base"}`} className="rounded-2xl bg-slate-50 p-3">
                    <div className="grid grid-cols-[1fr_76px_80px] items-start gap-2">
                      <div>
                        <p className="text-sm font-bold">{item.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            {item.sku}
                          </span>
                          <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">
                            Tax {item.taxRate}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="outline" size="icon-xs" onClick={() => updateQty(item.productId, item.quantity - 1, item.variantId)}>
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-5 text-center text-sm font-black">{item.quantity}</span>
                        <Button variant="outline" size="icon-xs" onClick={() => updateQty(item.productId, item.quantity + 1, item.variantId)}>
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black">Rs {item.lineTotal.toFixed(2)}</p>
                        <button className="mt-1 text-xs font-semibold text-red-500" onClick={() => removeItem(item.productId, item.variantId)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-emerald-200 p-8 text-center text-sm font-medium text-slate-400">
                    Add products to start an order.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-auto border-t border-emerald-100 p-5">
              <div className="mb-3 grid grid-cols-[1fr_96px_auto] gap-2">
                <input
                  className="h-10 rounded-xl border border-slate-100 bg-slate-50 px-3 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                  placeholder="Coupon"
                  value={discountCode}
                  onChange={(event) => setDiscountCode(event.target.value)}
                />
                <input
                  className="h-10 rounded-xl border border-slate-100 bg-slate-50 px-3 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(event) => setDiscountAmount(event.target.value)}
                />
                <Button variant="outline" className="h-10 rounded-xl" type="button" onClick={applyManualDiscount}>
                  Apply
                </Button>
              </div>
              <textarea
                className="mb-4 min-h-16 w-full resize-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                placeholder="Order notes"
                value={note ?? ""}
                onChange={(event) => setNote(event.target.value)}
              />
              <Totals subtotal={subtotal} tax={tax} discount={discount?.amount ?? 0} total={total} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-11 rounded-full border-emerald-200 text-emerald-700" disabled={items.length === 0}>
                  Print
                </Button>
                <Button className="h-11 rounded-full bg-orange-500 text-white hover:bg-orange-600" disabled={items.length === 0}>
                  Hold
                </Button>
              </div>
              <Button
                className="mt-3 h-12 w-full rounded-full bg-emerald-500 text-base font-black text-white hover:bg-emerald-600"
                disabled={items.length === 0 || !storeId}
                onClick={() => setIsPaymentOpen(true)}
              >
                <ShoppingBag className="size-5" />
                Charge Rs {total.toFixed(2)}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {isPaymentOpen ? (
        <PaymentModal
          total={total}
          storeId={storeId}
          items={items}
          customerId={customerId}
          discount={discount}
          note={note}
          onClose={() => setIsPaymentOpen(false)}
          onPaid={(createdReceipt) => {
            setReceipt(createdReceipt);
            clearCart();
            setIsPaymentOpen(false);
            void loadData();
          }}
        />
      ) : null}

      {receipt ? <ReceiptPanel receipt={receipt} onClose={() => setReceipt(null)} /> : null}
    </main>
  );
}

function CategoryCard({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className={
        active
          ? "flex h-28 min-w-28 flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm"
          : "flex h-28 min-w-28 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white text-slate-700 shadow-sm hover:border-emerald-200"
      }
      onClick={onClick}
    >
      {icon}
      <span className="max-w-24 truncate text-sm font-bold">{label}</span>
    </button>
  );
}

function categoryIcon(index: number) {
  const icons = [
    <ChefHat key="chef" className="size-7" />,
    <ShoppingBag key="bag" className="size-7" />,
    <Wine key="wine" className="size-7" />,
    <Utensils key="utensils" className="size-7" />,
  ];
  return icons[index % icons.length];
}

function productBlobClass(index: number) {
  const colors = [
    "absolute size-24 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffd166,#ef476f)]",
    "absolute size-24 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffdd99,#06d6a0)]",
    "absolute size-24 rounded-full bg-[radial-gradient(circle_at_30%_30%,#f4a261,#e76f51)]",
    "absolute size-24 rounded-full bg-[radial-gradient(circle_at_30%_30%,#f9c74f,#f8961e)]",
  ];
  return colors[index % colors.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Totals({ subtotal, tax, discount, total }: { subtotal: number; tax: number; discount: number; total: number }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="font-medium text-slate-500">Sub Total</span>
        <span className="font-bold">Rs {subtotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-medium text-slate-500">Discount</span>
        <span className="font-bold">Rs {discount.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-medium text-slate-500">Tax</span>
        <span className="font-bold">Rs {tax.toFixed(2)}</span>
      </div>
      <div className="flex justify-between border-t border-dashed border-slate-200 pt-3 text-lg font-black">
        <span>Total</span>
        <span>Rs {total.toFixed(2)}</span>
      </div>
    </div>
  );
}

function PaymentModal({
  total,
  storeId,
  items,
  customerId,
  discount,
  note,
  onClose,
  onPaid,
}: {
  total: number;
  storeId: string;
  items: CartItem[];
  customerId?: string;
  discount?: { code: string; amount: number };
  note?: string;
  onClose: () => void;
  onPaid: (receipt: Receipt) => void;
}) {
  const [tab, setTab] = useState<PaymentMethod>("CASH");
  const [amountTendered, setAmountTendered] = useState(String(total));
  const [phonePeReference, setPhonePeReference] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState("");
  const [phonePeRedirectUrl, setPhonePeRedirectUrl] = useState("");
  const [phonePeStatus, setPhonePeStatus] = useState<"IDLE" | "PENDING" | "COMPLETED" | "FAILED" | "TIMEOUT">("IDLE");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const changeDue = roundMoney(Math.max(Number(amountTendered || 0) - total, 0));

  async function submitPayment() {
    if (tab === "PHONEPE_QR") {
      await startPhonePePayment();
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        customerId: customerId ?? null,
        discount,
        notes: note ?? null,
        paymentMethod: tab,
        amountTendered: Number(amountTendered),
        items,
      }),
    });
    const payload = (await response.json()) as ApiResponse<Receipt>;
    setIsSubmitting(false);

    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }

    onPaid(payload.data);
  }

  async function startPhonePePayment() {
    setIsSubmitting(true);
    setMessage("");
    setPhonePeStatus("PENDING");

    const orderResponse = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        customerId: customerId ?? null,
        discount,
        notes: note ?? null,
        paymentMethod: "PHONEPE_QR",
        amountTendered: total,
        items,
      }),
    });
    const orderPayload = (await orderResponse.json()) as ApiResponse<Receipt>;

    if (!orderPayload.ok) {
      setIsSubmitting(false);
      setPhonePeStatus("FAILED");
      setMessage(orderPayload.error);
      return;
    }

    setPendingOrderId(orderPayload.data.id);

    const initiateResponse = await fetch("/api/payments/phonepe/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: orderPayload.data.id,
        amountRupees: total,
      }),
    });
    const initiatePayload = (await initiateResponse.json()) as ApiResponse<{
      redirectUrl: string;
      merchantTransactionId: string;
    }>;

    if (!initiatePayload.ok) {
      setIsSubmitting(false);
      setPhonePeStatus("FAILED");
      setMessage(initiatePayload.error);
      return;
    }

    setPhonePeReference(initiatePayload.data.merchantTransactionId);
    setPhonePeRedirectUrl(initiatePayload.data.redirectUrl);
    window.open(initiatePayload.data.redirectUrl, "_blank", "noopener,noreferrer");
    setMessage("Waiting for PhonePe payment confirmation");
    await pollPhonePeStatus(initiatePayload.data.merchantTransactionId);
  }

  async function pollPhonePeStatus(merchantTransactionId: string) {
    const startedAt = Date.now();
    const timeoutMs = 5 * 60 * 1000;

    while (Date.now() - startedAt < timeoutMs) {
      await sleep(3000);
      const response = await fetch(`/api/payments/phonepe/status?merchantTransactionId=${encodeURIComponent(merchantTransactionId)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<{
        status: "PENDING" | "COMPLETED" | "FAILED";
        receipt: Receipt | null;
      }>;

      if (!payload.ok) {
        setMessage(payload.error);
        continue;
      }

      if (payload.data.status === "COMPLETED" && payload.data.receipt) {
        setPhonePeStatus("COMPLETED");
        setIsSubmitting(false);
        onPaid(payload.data.receipt);
        return;
      }

      if (payload.data.status === "FAILED") {
        setPhonePeStatus("FAILED");
        setIsSubmitting(false);
        setMessage("PhonePe payment failed. Retry or cancel this payment.");
        return;
      }
    }

    setPhonePeStatus("TIMEOUT");
    setIsSubmitting(false);
    setMessage("Payment not received. Retry or cancel.");
  }

  async function cancelPhonePePayment() {
    if (!phonePeReference) {
      setPhonePeStatus("IDLE");
      setMessage("");
      return;
    }

    await fetch("/api/payments/phonepe/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantTransactionId: phonePeReference }),
    });
    setPhonePeStatus("FAILED");
    setMessage("PhonePe payment cancelled");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-emerald-100 px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-emerald-600">Payment</p>
            <h2 className="text-2xl font-black">Rs {total.toFixed(2)}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b border-emerald-100 p-4">
          <Button className={tab === "CASH" ? "bg-emerald-500 text-white hover:bg-emerald-600" : ""} variant={tab === "CASH" ? "default" : "outline"} onClick={() => setTab("CASH")}>
            <Banknote className="size-4" />
            Cash
          </Button>
          <Button className={tab === "PHONEPE_QR" ? "bg-emerald-500 text-white hover:bg-emerald-600" : ""} variant={tab === "PHONEPE_QR" ? "default" : "outline"} onClick={() => setTab("PHONEPE_QR")}>
            <Phone className="size-4" />
            PhonePe
          </Button>
          <Button variant="outline" disabled>
            <CreditCard className="size-4" />
            Card
          </Button>
        </div>

        <div className="space-y-4 p-6">
          {tab === "CASH" ? (
            <>
              <label className="space-y-2 text-sm">
                <span className="font-bold">Amount Tendered</span>
                <input
                  className="h-12 w-full rounded-xl border border-emerald-100 bg-slate-50 px-4 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                  type="number"
                  min={total}
                  step="0.01"
                  value={amountTendered}
                  onChange={(event) => setAmountTendered(event.target.value)}
                />
              </label>
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                Change due: <span className="font-black">Rs {changeDue.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-800">
                <Phone className="size-9" />
                <span>PhonePe QR payment for Rs {total.toFixed(2)}</span>
                {phonePeRedirectUrl ? (
                  <a className="font-black underline" href={phonePeRedirectUrl} target="_blank" rel="noreferrer">
                    Open QR page
                  </a>
                ) : null}
              </div>
              <input
                className="h-11 w-full rounded-xl border border-emerald-100 bg-slate-50 px-4 text-sm outline-none"
                placeholder="Merchant transaction ID"
                value={phonePeReference}
                readOnly
              />
              {pendingOrderId ? <p className="text-xs font-medium text-slate-400">Pending order: {pendingOrderId}</p> : null}
            </>
          )}

          {message ? <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{message}</div> : null}

          {tab === "PHONEPE_QR" && (phonePeStatus === "FAILED" || phonePeStatus === "TIMEOUT") ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11 rounded-full" onClick={() => void cancelPhonePePayment()}>
                Cancel
              </Button>
              <Button className="h-11 rounded-full bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => void startPhonePePayment()}>
                Retry
              </Button>
            </div>
          ) : (
            <Button className="h-12 w-full rounded-full bg-emerald-500 text-base font-black text-white hover:bg-emerald-600" disabled={isSubmitting} onClick={() => void submitPayment()}>
              {isSubmitting ? "Processing..." : tab === "CASH" ? "Confirm Cash Payment" : "Charge with PhonePe QR"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ReceiptPanel({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-600">Receipt</p>
            <h2 className="text-xl font-black">{receipt.order_number}</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
          {receipt.order_items?.length ? (
            receipt.order_items.map((item) => (
              <div key={item.id} className="flex justify-between px-4 py-3 text-sm">
                <span className="font-semibold">
                  {item.name} x {item.quantity}
                </span>
                <span className="font-bold">Rs {item.line_total}</span>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm font-medium text-slate-400">Payment completed</div>
          )}
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium text-slate-500">Paid</span>
            <span className="font-bold">Rs {receipt.amount_paid}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-slate-500">Change</span>
            <span className="font-bold">Rs {receipt.change_due}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-slate-200 pt-3 text-lg font-black">
            <span>Total</span>
            <span>Rs {receipt.total_amount}</span>
          </div>
        </div>
        <Button className="mt-5 h-11 w-full rounded-full bg-emerald-500 text-white hover:bg-emerald-600" onClick={onClose}>
          Close Receipt
        </Button>
      </div>
    </div>
  );
}
