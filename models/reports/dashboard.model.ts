import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type DashboardRange = "today" | "week" | "month";

type SaleRow = {
  id: string;
  grand_total?: number | string | null;
  total_amount?: number | string | null;
  subtotal?: number | string | null;
  discount_total?: number | string | null;
  discount_amount?: number | string | null;
  tax_total?: number | string | null;
  tax_amount?: number | string | null;
  created_at?: string | null;
};

type SaleItemRow = {
  sale_id?: string | null;
  name?: string | null;
  quantity?: number | string | null;
  selling_price?: number | string | null;
  cost_price?: number | string | null;
  line_total?: number | string | null;
};

type PaymentRow = {
  method?: string | null;
  amount?: number | string | null;
  status?: string | null;
};

type ExpenseRow = {
  amount?: number | string | null;
};

type InventoryRow = {
  quantity?: number | string | null;
  reorder_point?: number | string | null;
  products?: {
    name?: string | null;
    sku?: string | null;
  } | null;
};

export async function dashboardSummary(range: DashboardRange) {
  const supabase = createSupabaseAdminClient();
  const { from, to, trendDays } = dateWindow(range);

  const salesResult = await supabase
    .from("sales")
    .select("id, grand_total, total_amount, subtotal, discount_total, discount_amount, tax_total, tax_amount, created_at")
    .is("deleted_at", null)
    .in("status", ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"])
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());

  if (salesResult.error) throw salesResult.error;

  const sales = (salesResult.data ?? []) as SaleRow[];
  const saleIds = sales.map((sale) => sale.id);

  const [itemsResult, paymentsResult, expensesResult, inventoryResult] = await Promise.all([
    saleIds.length
      ? supabase.from("sale_items").select("sale_id, name, quantity, selling_price, cost_price, line_total").in("sale_id", saleIds)
      : Promise.resolve({ data: [], error: null }),
    saleIds.length
      ? supabase.from("payments").select("order_id, method, amount, status").in("order_id", saleIds).eq("status", "COMPLETED")
      : Promise.resolve({ data: [], error: null }),
    supabase.from("expenses").select("amount").is("deleted_at", null).gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
    supabase.from("inventory_items").select("quantity, reorder_point, products(name, sku)").is("deleted_at", null),
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (paymentsResult.error) throw paymentsResult.error;
  if (expensesResult.error) throw expensesResult.error;
  if (inventoryResult.error) throw inventoryResult.error;

  const items = (itemsResult.data ?? []) as SaleItemRow[];
  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const expenses = (expensesResult.data ?? []) as ExpenseRow[];
  const inventory = (inventoryResult.data ?? []) as InventoryRow[];

  const totalSales = sales.reduce((total, sale) => total + number(sale.grand_total ?? sale.total_amount), 0);
  const totalOrders = sales.length;
  const profit = items.reduce((total, item) => total + (number(item.selling_price) - number(item.cost_price)) * number(item.quantity), 0);
  const expenseTotal = expenses.reduce((total, expense) => total + number(expense.amount), 0);
  const cashTotal = payments.filter((payment) => payment.method === "CASH").reduce((total, payment) => total + number(payment.amount), 0);
  const digitalTotal = payments
    .filter((payment) => ["ESEWA_QR", "PHONEPE_QR", "CARD", "MOBILE_MONEY"].includes(payment.method ?? ""))
    .reduce((total, payment) => total + number(payment.amount), 0);
  const lowStockItems = inventory.filter((item) => number(item.quantity) <= number(item.reorder_point));
  const outOfStockItems = inventory.filter((item) => number(item.quantity) <= 0);

  return {
    range,
    cards: {
      todaySales: round(totalSales),
      orders: totalOrders,
      profit: round(profit),
      lowStock: lowStockItems.length,
      expenses: round(expenseTotal),
      cash: round(cashTotal),
      digitalPayments: round(digitalTotal),
    },
    salesTrend: buildSalesTrend(sales, trendDays),
    topProducts: buildTopProducts(items).slice(0, 5),
    paymentBreakdown: buildPaymentBreakdown(payments),
    alerts: lowStockItems.slice(0, 6).map((item) => ({
      name: item.products?.name ?? "Unknown product",
      sku: item.products?.sku ?? "-",
      quantity: number(item.quantity),
      reorderPoint: number(item.reorder_point),
      status: number(item.quantity) <= 0 ? "Out of stock" : "Low stock",
    })),
    outOfStockCount: outOfStockItems.length,
  };
}

function dateWindow(range: DashboardRange) {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  if (range === "week") {
    from.setDate(from.getDate() - 6);
  }

  if (range === "month") {
    from.setDate(1);
  }

  const trendDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1);
  return { from, to, trendDays };
}

function buildSalesTrend(sales: SaleRow[], days: number) {
  const buckets = new Map<string, number>();
  const today = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  for (const sale of sales) {
    if (!sale.created_at) continue;
    const key = new Date(sale.created_at).toISOString().slice(0, 10);
    if (!buckets.has(key)) continue;
    buckets.set(key, round((buckets.get(key) ?? 0) + number(sale.grand_total ?? sale.total_amount)));
  }

  return Array.from(buckets.entries()).map(([date, salesTotal]) => ({ date, sales: salesTotal }));
}

function buildTopProducts(items: SaleItemRow[]) {
  const byProduct = new Map<string, { name: string; quantity: number; sales: number; profit: number }>();

  for (const item of items) {
    const key = item.name ?? "Unknown product";
    const current = byProduct.get(key) ?? { name: key, quantity: 0, sales: 0, profit: 0 };
    current.quantity += number(item.quantity);
    current.sales += number(item.line_total);
    current.profit += (number(item.selling_price) - number(item.cost_price)) * number(item.quantity);
    byProduct.set(key, current);
  }

  return Array.from(byProduct.values())
    .map((item) => ({ ...item, sales: round(item.sales), profit: round(item.profit) }))
    .sort((a, b) => b.quantity - a.quantity);
}

function buildPaymentBreakdown(payments: PaymentRow[]) {
  const byMethod = new Map<string, { method: string; amount: number; count: number }>();

  for (const payment of payments) {
    const key = payment.method ?? "UNKNOWN";
    const current = byMethod.get(key) ?? { method: key, amount: 0, count: 0 };
    current.amount += number(payment.amount);
    current.count += 1;
    byMethod.set(key, current);
  }

  return Array.from(byMethod.values()).map((item) => ({ ...item, amount: round(item.amount) }));
}

function number(value: unknown) {
  return Number(value ?? 0) || 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
