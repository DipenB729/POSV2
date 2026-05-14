"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Barcode,
  CreditCard,
  Minus,
  Phone,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-shell";
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
        ? [product.name, product.sku, product.barcode ?? ""].some((value) =>
            value.toLowerCase().includes(normalized),
          )
        : true;

      return matchesCategory && matchesSearch;
    });
  }, [categoryId, products, search]);

  const subtotal = useMemo(
    () => roundMoney(items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)),
    [items],
  );
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
    const existingQty = items
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);

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
    <main className="min-h-screen bg-background">
      <AppHeader
        eyebrow="POS Terminal"
        title="Selling Flow"
        action={
          <select className="input w-64" value={storeId} onChange={(event) => setStoreId(event.target.value)}>
            <option value="">Select store</option>
            {stores.map((id) => (
              <option key={id} value={id}>
                Store {id.slice(0, 8)}
              </option>
            ))}
          </select>
        }
      />

      <div className="mx-auto grid max-w-[1500px] gap-5 p-5 xl:grid-cols-[1fr_440px]">
        <section className="space-y-4">
          <div className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[1fr_320px]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="input pl-9"
                placeholder="Search products by name, SKU, or barcode"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <form className="relative" onSubmit={submitBarcode}>
              <Barcode className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="input pl-9"
                placeholder="Scan barcode"
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
              />
            </form>
          </div>

          <div className="flex gap-2 overflow-x-auto rounded-lg border bg-white p-3">
            <Button variant={categoryId ? "outline" : "default"} size="sm" onClick={() => setCategoryId("")}>
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={categoryId === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryId(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {message ? <div className="rounded-md border bg-white px-4 py-3 text-sm">{message}</div> : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {visibleProducts.map((product) => {
              const stock = stockFor(product);
              const isLow = stock > 0 && stock <= Math.max(...(product.inventory_items ?? []).map((item) => item.reorder_point), 0);

              return (
                <div key={product.id} className="rounded-lg border bg-white p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{product.name}</h2>
                      <p className="text-sm text-muted-foreground">{product.sku}</p>
                    </div>
                    <span
                      className={
                        stock <= 0
                          ? "rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive"
                          : isLow
                            ? "rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-800"
                            : "rounded-md bg-emerald-100 px-2 py-1 text-xs text-emerald-800"
                      }
                    >
                      {stock} stock
                    </span>
                  </div>
                  <p className="mb-3 text-lg font-semibold">Rs {product.selling_price}</p>
                  <Button className="w-full" disabled={stock <= 0} onClick={() => addProduct(product)}>
                    <Plus className="size-4" />
                    Add
                  </Button>
                  {product.product_variants && product.product_variants.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.product_variants.map((variant) => (
                        <Button key={variant.id} variant="outline" size="xs" onClick={() => addProduct(product, variant)}>
                          {variant.name}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="h-fit rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              <h2 className="font-semibold">Cart</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={clearCart}>
              Clear
            </Button>
          </div>

          <div className="max-h-[420px] divide-y overflow-y-auto">
            {items.map((item) => (
              <div key={`${item.productId}-${item.variantId ?? "base"}`} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.sku} · Rs {item.unitPrice}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => removeItem(item.productId, item.variantId)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon-sm" onClick={() => updateQty(item.productId, item.quantity - 1, item.variantId)}>
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button variant="outline" size="icon-sm" onClick={() => updateQty(item.productId, item.quantity + 1, item.variantId)}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <p className="font-semibold">Rs {item.lineTotal}</p>
                </div>
              </div>
            ))}
            {items.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">Cart is empty</div>
            ) : null}
          </div>

          <div className="space-y-4 border-t px-5 py-4">
            <select className="input" value={customerId ?? ""} onChange={(event) => setCustomer(event.target.value || undefined)}>
              <option value="">Walk-in customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} · {customer.tier}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-[1fr_110px_auto] gap-2">
              <input
                className="input"
                placeholder="Discount code"
                value={discountCode}
                onChange={(event) => setDiscountCode(event.target.value)}
              />
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
              />
              <Button variant="outline" type="button" onClick={applyManualDiscount}>
                Apply
              </Button>
            </div>

            <textarea
              className="input min-h-20 py-2"
              placeholder="Order notes"
              value={note ?? ""}
              onChange={(event) => setNote(event.target.value)}
            />

            <Totals subtotal={subtotal} tax={tax} discount={discount?.amount ?? 0} total={total} />

            <Button className="h-11 w-full" disabled={items.length === 0 || !storeId} onClick={() => setIsPaymentOpen(true)}>
              <ReceiptText className="size-4" />
              Charge Rs {total}
            </Button>
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

function Totals({ subtotal, tax, discount, total }: { subtotal: number; tax: number; discount: number; total: number }) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>Rs {subtotal}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Tax</span>
        <span>Rs {tax}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Discount</span>
        <span>Rs {discount}</span>
      </div>
      <div className="flex justify-between text-lg font-semibold">
        <span>Total</span>
        <span>Rs {total}</span>
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
      const response = await fetch(
        `/api/payments/phonepe/status?merchantTransactionId=${encodeURIComponent(merchantTransactionId)}`,
        { cache: "no-store" },
      );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Payment</p>
            <h2 className="text-xl font-semibold">Rs {total}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b p-4">
          <Button variant={tab === "CASH" ? "default" : "outline"} onClick={() => setTab("CASH")}>
            <Banknote className="size-4" />
            Cash
          </Button>
          <Button variant={tab === "PHONEPE_QR" ? "default" : "outline"} onClick={() => setTab("PHONEPE_QR")}>
            <Phone className="size-4" />
            PhonePe
          </Button>
          <Button variant="outline" disabled>
            <CreditCard className="size-4" />
            Card
          </Button>
        </div>

        <div className="space-y-4 p-5">
          {tab === "CASH" ? (
            <>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Amount Tendered</span>
                <input
                  className="input"
                  type="number"
                  min={total}
                  step="0.01"
                  value={amountTendered}
                  onChange={(event) => setAmountTendered(event.target.value)}
                />
              </label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                Change due: <span className="font-semibold">Rs {changeDue}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                <Phone className="size-8" />
                <span>PhonePe QR payment for Rs {total}</span>
                {phonePeRedirectUrl ? (
                  <a className="font-medium text-foreground underline" href={phonePeRedirectUrl} target="_blank" rel="noreferrer">
                    Open QR page
                  </a>
                ) : null}
              </div>
              <div className="grid gap-2">
                <input
                  className="input"
                  placeholder="Merchant transaction ID"
                  value={phonePeReference}
                  readOnly
                />
                {pendingOrderId ? <p className="text-xs text-muted-foreground">Pending order: {pendingOrderId}</p> : null}
              </div>
            </>
          )}

          {message ? <div className="rounded-md border px-3 py-2 text-sm">{message}</div> : null}

          {tab === "PHONEPE_QR" && (phonePeStatus === "FAILED" || phonePeStatus === "TIMEOUT") ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => void cancelPhonePePayment()}>
                Cancel
              </Button>
              <Button onClick={() => void startPhonePePayment()}>Retry</Button>
            </div>
          ) : (
            <Button className="h-11 w-full" disabled={isSubmitting} onClick={() => void submitPayment()}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Receipt</p>
            <h2 className="text-xl font-semibold">{receipt.order_number}</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="divide-y rounded-lg border">
          {receipt.order_items?.map((item) => (
            <div key={item.id} className="flex justify-between px-3 py-2 text-sm">
              <span>
                {item.name} x {item.quantity}
              </span>
              <span>Rs {item.line_total}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid</span>
            <span>Rs {receipt.amount_paid}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Change</span>
            <span>Rs {receipt.change_due}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>Rs {receipt.total_amount}</span>
          </div>
        </div>
        <Button className="mt-5 w-full" onClick={onClose}>
          Close Receipt
        </Button>
      </div>
    </div>
  );
}
