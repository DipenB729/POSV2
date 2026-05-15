import { createSupabaseAdminClient } from "@/lib/supabase/server";

type ReportScope = {
  storeId?: string | null;
  from?: string;
  to?: string;
};

function scopedOrders(scope: ReportScope) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("orders").select("*").is("deleted_at", null);

  if (scope.storeId) query = query.eq("store_id", scope.storeId);
  if (scope.from) query = query.gte("created_at", scope.from);
  if (scope.to) query = query.lte("created_at", scope.to);

  return query;
}

export async function salesSummary(scope: Required<Pick<ReportScope, "from" | "to">> & Pick<ReportScope, "storeId">) {
  const [ordersResult, refundsResult] = await Promise.all([
    scopedOrders(scope),
    createSupabaseAdminClient()
      .from("refunds")
      .select("amount, orders!inner(store_id, created_at)")
      .gte("created_at", scope.from)
      .lte("created_at", scope.to),
  ]);

  if (ordersResult.error) throw ordersResult.error;
  if (refundsResult.error) throw refundsResult.error;

  const orders = ordersResult.data ?? [];
  const refunds = ((refundsResult.data ?? []) as Array<{ amount: number; orders?: { store_id?: string } }>).filter((refund) =>
    scope.storeId ? refund.orders?.store_id === scope.storeId : true,
  );
  const revenue = sum(orders, "total_amount");
  const orderCount = orders.length;

  return {
    revenue,
    orderCount,
    averageOrderValue: orderCount > 0 ? round(revenue / orderCount) : 0,
    tax: sum(orders, "tax_amount"),
    discounts: sum(orders, "discount_amount"),
    refunds: round(refunds.reduce((total, refund) => total + Number(refund.amount ?? 0), 0)),
  };
}

export async function revenueByPeriod(scope: { storeId?: string | null; period: "day" | "week" | "month" }) {
  const since = new Date();
  if (scope.period === "day") since.setDate(since.getDate() - 30);
  if (scope.period === "week") since.setDate(since.getDate() - 84);
  if (scope.period === "month") since.setMonth(since.getMonth() - 12);

  const result = await scopedOrders({ storeId: scope.storeId, from: since.toISOString() });
  if (result.error) throw result.error;

  const buckets = new Map<string, number>();
  for (const order of result.data ?? []) {
    const key = periodKey(new Date(order.created_at), scope.period);
    buckets.set(key, round((buckets.get(key) ?? 0) + Number(order.total_amount ?? 0)));
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, revenue]) => ({ period, revenue }));
}

export async function topProducts(scope: { storeId?: string | null; from: string; to: string; limit: number }) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("order_items")
    .select("product_id, name, quantity, line_total, orders!inner(store_id, created_at)")
    .gte("orders.created_at", scope.from)
    .lte("orders.created_at", scope.to);

  if (scope.storeId) query = query.eq("orders.store_id", scope.storeId);

  const result = await query;
  if (result.error) throw result.error;

  const byProduct = new Map<string, { productId: string; name: string; unitsSold: number; revenue: number }>();
  for (const item of (result.data ?? []) as Array<{ product_id: string; name: string; quantity: number; line_total: number }>) {
    const current = byProduct.get(item.product_id) ?? {
      productId: item.product_id,
      name: item.name,
      unitsSold: 0,
      revenue: 0,
    };
    current.unitsSold += Number(item.quantity ?? 0);
    current.revenue = round(current.revenue + Number(item.line_total ?? 0));
    byProduct.set(item.product_id, current);
  }

  return Array.from(byProduct.values()).sort((a, b) => b.revenue - a.revenue).slice(0, scope.limit);
}

export async function inventoryValuation(scope: { storeId?: string | null }) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("inventory_items")
    .select("quantity, products!inner(cost_price, selling_price)")
    .is("deleted_at", null);

  if (scope.storeId) query = query.eq("store_id", scope.storeId);

  const result = await query;
  if (result.error) throw result.error;

  return ((result.data ?? []) as Array<{ quantity: number; products?: { cost_price?: number; selling_price?: number } }>).reduce<{
    quantity: number;
    costValue: number;
    sellingValue: number;
  }>(
    (total, item) => ({
      quantity: total.quantity + Number(item.quantity ?? 0),
      costValue: round(total.costValue + Number(item.quantity ?? 0) * Number(item.products?.cost_price ?? 0)),
      sellingValue: round(total.sellingValue + Number(item.quantity ?? 0) * Number(item.products?.selling_price ?? 0)),
    }),
    { quantity: 0, costValue: 0, sellingValue: 0 },
  );
}

export async function cashierPerformance(scope: { storeId?: string | null; from: string; to: string }) {
  const result = await scopedOrders(scope);
  if (result.error) throw result.error;

  const byCashier = new Map<string, { cashierId: string; orderCount: number; revenue: number; refunds: number; averageBasket: number }>();
  for (const order of result.data ?? []) {
    const current = byCashier.get(order.cashier_id) ?? {
      cashierId: order.cashier_id,
      orderCount: 0,
      revenue: 0,
      refunds: 0,
      averageBasket: 0,
    };
    current.orderCount += 1;
    current.revenue = round(current.revenue + Number(order.total_amount ?? 0));
    current.averageBasket = round(current.revenue / current.orderCount);
    byCashier.set(order.cashier_id, current);
  }

  return Array.from(byCashier.values()).sort((a, b) => b.revenue - a.revenue);
}

export async function customerInsights(scope: { storeId?: string | null }) {
  const result = await scopedOrders(scope);
  if (result.error) throw result.error;

  const byCustomer = new Map<string, { customerId: string; orderCount: number; spend: number }>();
  let walkInOrders = 0;

  for (const order of result.data ?? []) {
    if (!order.customer_id) {
      walkInOrders += 1;
      continue;
    }
    const current = byCustomer.get(order.customer_id) ?? { customerId: order.customer_id, orderCount: 0, spend: 0 };
    current.orderCount += 1;
    current.spend = round(current.spend + Number(order.total_amount ?? 0));
    byCustomer.set(order.customer_id, current);
  }

  const customers = Array.from(byCustomer.values());
  return {
    newCustomers: customers.filter((customer) => customer.orderCount === 1).length,
    returningCustomers: customers.filter((customer) => customer.orderCount > 1).length,
    walkInOrders,
    topCustomers: customers.sort((a, b) => b.spend - a.spend).slice(0, 10),
  };
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return round(rows.reduce((total, row) => total + Number(row[key] ?? 0), 0));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function periodKey(date: Date, period: "day" | "week" | "month") {
  if (period === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  if (period === "week") {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return weekStart.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}
