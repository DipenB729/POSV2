"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Filter, History, PackageCheck, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppHeader, AppShell } from "@/components/app-shell";
import { PageLoader } from "@/components/page-loader";

type ApiResponse<T> =
  | { ok: true; data: T; meta?: { total?: number; page?: number; limit?: number } }
  | { ok: false; error: string };

type InventoryProduct = {
  name: string;
  sku: string;
  barcode: string | null;
  categories?: {
    name: string;
  } | null;
};

type InventoryStore = {
  name: string;
};

type InventoryItem = {
  id: string;
  product_id: string;
  store_id: string;
  quantity: number;
  reorder_point: number;
  reorder_qty: number;
  location: string | null;
  updated_at: string;
  products?: InventoryProduct | null;
  stores?: InventoryStore | null;
};

type Movement = {
  id: string;
  inventory_item_id: string;
  type: string;
  quantity: number;
  reason: string | null;
  reference_id: string | null;
  created_at: string;
  inventory_items?: {
    products?: {
      name: string;
      sku: string;
    } | null;
  } | null;
  profiles?: {
    name: string;
    role: string;
  } | null;
};

const movementTypes = [
  "ADJUSTMENT",
  "PURCHASE_RECEIVED",
  "DAMAGE",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "RETURN",
];

export function InventoryDashboard() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustment, setAdjustment] = useState({
    type: "ADJUSTMENT",
    quantity: "0",
    reason: "",
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const lowStockItems = useMemo(
    () => items.filter((item) => item.quantity <= item.reorder_point),
    [items],
  );

  async function loadInventory() {
    setIsLoading(true);
    const params = new URLSearchParams({ page: "1", limit: "100" });

    if (search) params.set("search", search);
    if (lowStockOnly) params.set("lowStock", "true");

    const response = await fetch(`/api/inventory?${params.toString()}`, { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<InventoryItem[]>;

    if (payload.ok) {
      setItems(payload.data);
      setMessage("");
    } else {
      setMessage(payload.error);
    }

    setIsLoading(false);
  }

  async function loadMovements(inventoryItemId?: string) {
    const params = new URLSearchParams({ page: "1", limit: "30" });

    if (inventoryItemId) params.set("inventoryItemId", inventoryItemId);

    const response = await fetch(`/api/inventory/movements?${params.toString()}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as ApiResponse<Movement[]>;

    if (payload.ok) {
      setMovements(payload.data);
    }
  }

  useEffect(() => {
    void loadInventory();
    void loadMovements();
  }, []);

  function openAdjustment(item: InventoryItem) {
    setSelectedItem(item);
    setAdjustment({ type: "ADJUSTMENT", quantity: "0", reason: "" });
    void loadMovements(item.id);
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedItem) return;

    const response = await fetch("/api/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inventoryItemId: selectedItem.id,
        type: adjustment.type,
        quantity: Number(adjustment.quantity),
        reason: adjustment.reason,
      }),
    });
    const payload = (await response.json()) as ApiResponse<InventoryItem>;

    if (!payload.ok) {
      setMessage(payload.error);
      return;
    }

    setMessage("Inventory movement recorded");
    setSelectedItem(null);
    await loadInventory();
    await loadMovements();
  }

  function exportCsv() {
    const rows = [
      ["Product", "SKU", "Store", "Quantity", "Reorder Point", "Reorder Qty", "Location", "Updated At"],
      ...items.map((item) => [
        item.products?.name ?? "",
        item.products?.sku ?? "",
        item.stores?.name ?? "",
        String(item.quantity),
        String(item.reorder_point),
        String(item.reorder_qty),
        item.location ?? "",
        item.updated_at,
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <AppHeader
        eyebrow="Inventory Management"
        title="Stock Control"
        action={
          <Button size="lg" variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          {lowStockItems.length > 0 ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              <AlertTriangle className="mt-0.5 size-4" />
              <div>
                <p className="font-medium">{lowStockItems.length} low-stock items need attention</p>
                <p>Reorder alerts are triggered when quantity is at or below reorder point.</p>
              </div>
            </div>
          ) : null}

          {message ? <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div> : null}

          <form
            className="grid gap-3 rounded-[20px] border border-emerald-100 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void loadInventory();
            }}
          >
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="input pl-9"
                placeholder="Search product, SKU, or location"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-emerald-100 px-3 text-sm">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(event) => setLowStockOnly(event.target.checked)}
              />
              Low stock only
            </label>
            <Button type="submit" variant="outline" size="lg">
              <Filter className="size-4" />
              Filter
            </Button>
          </form>

          {isLoading ? <PageLoader label="Loading inventory" /> : null}

          <div className={isLoading ? "hidden" : "overflow-hidden rounded-[20px] border border-emerald-100 bg-white shadow-sm"}>
            <div className="grid grid-cols-[1.5fr_110px_120px_120px_130px] border-b border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs font-bold uppercase text-emerald-700">
              <span>Product</span>
              <span>Store</span>
              <span>Quantity</span>
              <span>Reorder</span>
              <span className="text-right">Action</span>
            </div>
            <div className="divide-y">
              {items.map((item) => {
                const isLowStock = item.quantity <= item.reorder_point;

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1.5fr_110px_120px_120px_130px] items-center px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50">
                        <PackageCheck className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.products?.name ?? "Unknown product"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.products?.sku ?? "No SKU"} · {item.products?.categories?.name ?? "No category"}
                        </p>
                      </div>
                    </div>
                    <span className="truncate">{item.stores?.name ?? "Store"}</span>
                    <span className={isLowStock ? "font-semibold text-destructive" : "font-semibold"}>
                      {item.quantity}
                    </span>
                    <span>{item.reorder_point} / {item.reorder_qty}</span>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => openAdjustment(item)}>
                        <Plus className="size-4" />
                        Adjust
                      </Button>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading inventory" : "No inventory items found"}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="h-fit overflow-hidden rounded-[20px] border border-emerald-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-emerald-100 px-4 py-3">
            <History className="size-4" />
            <h2 className="font-semibold">Movement History</h2>
          </div>
          <div className="max-h-[640px] divide-y overflow-y-auto">
            {movements.map((movement) => (
              <div key={movement.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{movement.type}</p>
                  <p className={movement.quantity < 0 ? "text-destructive" : "text-emerald-700"}>
                    {movement.quantity > 0 ? "+" : ""}
                    {movement.quantity}
                  </p>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {movement.inventory_items?.products?.name ?? "Inventory item"} ·{" "}
                  {movement.profiles?.name ?? "System"}
                </p>
                {movement.reason ? <p className="mt-1 text-muted-foreground">{movement.reason}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(movement.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {movements.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No movement history found
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/30 p-4 backdrop-blur-sm">
          <form className="w-full max-w-md space-y-4 rounded-[24px] bg-white p-5 shadow-xl" onSubmit={(event) => void submitAdjustment(event)}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Manual Stock Adjustment</p>
                <h2 className="text-lg font-semibold">{selectedItem.products?.name ?? "Inventory item"}</h2>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setSelectedItem(null)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Movement Type</span>
                <select
                  className="input"
                  value={adjustment.type}
                  onChange={(event) => setAdjustment((current) => ({ ...current, type: event.target.value }))}
                >
                  {movementTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Quantity Delta</span>
                <input
                  className="input"
                  type="number"
                  value={adjustment.quantity}
                  onChange={(event) => setAdjustment((current) => ({ ...current, quantity: event.target.value }))}
                />
              </label>
            </div>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Reason</span>
              <textarea
                className="input min-h-24 py-2"
                value={adjustment.reason}
                onChange={(event) => setAdjustment((current) => ({ ...current, reason: event.target.value }))}
              />
            </label>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm">
              Current quantity: <span className="font-semibold">{selectedItem.quantity}</span>
            </div>

            <div className="flex justify-end gap-2 border-t border-emerald-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setSelectedItem(null)}>
                Cancel
              </Button>
              <Button type="submit">Record Movement</Button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}

function escapeCsv(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}
