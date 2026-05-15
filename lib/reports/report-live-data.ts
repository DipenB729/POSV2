import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getReportDetail, type ReportDetail } from "@/lib/reports/report-detail-data";

type ProfileRow = {
  id: string;
  name: string;
  role?: string | null;
  store_id?: string | null;
};

type OrderRow = {
  id: string;
  order_number?: string | null;
  store_id?: string | null;
  cashier_id?: string | null;
  status?: string | null;
  subtotal?: number | string | null;
  subtotal_amount?: number | string | null;
  tax_amount?: number | string | null;
  tax_total?: number | string | null;
  discount_amount?: number | string | null;
  discount_total?: number | string | null;
  total_amount?: number | string | null;
  grand_total?: number | string | null;
  amount_paid?: number | string | null;
  created_at?: string | null;
};

type OrderItemRow = {
  order_id?: string | null;
  product_id?: string | null;
  name?: string | null;
  quantity?: number | string | null;
  cost_price?: number | string | null;
  selling_price?: number | string | null;
  unit_price?: number | string | null;
  tax_rate?: number | string | null;
  discount?: number | string | null;
  line_total?: number | string | null;
};

type PaymentRow = {
  order_id?: string | null;
  method?: string | null;
  amount?: number | string | null;
  status?: string | null;
  created_at?: string | null;
};

type RefundRow = {
  order_id?: string | null;
  amount?: number | string | null;
  method?: string | null;
  reason?: string | null;
  created_at?: string | null;
};

type AuditRow = {
  user_id?: string | null;
  action?: string | null;
  entity?: string | null;
  entity_id?: string | null;
  created_at?: string | null;
};

type ProductRow = {
  id: string;
  name?: string | null;
  category_id?: string | null;
  cost_price?: number | string | null;
};

type CategoryRow = {
  id: string;
  name?: string | null;
  parent_id?: string | null;
};

type ExpenseRow = {
  category?: string | null;
  amount?: number | string | null;
  payment_method?: string | null;
  created_at?: string | null;
};

type BusinessSummaryRow = {
  total_sales?: number | string | null;
  net_sales?: number | string | null;
  total_orders?: number | string | null;
  average_bill_value?: number | string | null;
  discount_given?: number | string | null;
  tax_collected?: number | string | null;
  gross_profit?: number | string | null;
  product_quantity_sold?: number | string | null;
  payment_total?: number | string | null;
  expense_total?: number | string | null;
  current_stock?: number | string | null;
};

type ProductSalesRow = {
  product_id?: string | null;
  name?: string | null;
  sku?: string | null;
  product_quantity_sold?: number | string | null;
  total_sales?: number | string | null;
  discount_given?: number | string | null;
  gross_profit?: number | string | null;
  tax_collected?: number | string | null;
};

type PaymentTotalRow = {
  method?: string | null;
  payment_count?: number | string | null;
  payment_total?: number | string | null;
};

type StockSummaryRow = {
  name?: string | null;
  sku?: string | null;
  current_stock?: number | string | null;
  stock_movement_quantity?: number | string | null;
};

type LiveReportDetail = ReportDetail & {
  source: "database" | "empty" | "error";
  employees: string[];
  metrics: Array<{ label: string; value: string }>;
  message?: string;
};

export async function getLiveReportDetail(slug: string): Promise<LiveReportDetail | null> {
  const report = getReportDetail(slug);
  if (!report) return null;

  try {
    const data = await loadReportData();
    const rows = buildRows(report.slug, data);
    return {
      ...report,
      rows,
      metrics: buildMetrics(report.slug, data),
      source: rows.length > 0 ? "database" : "empty",
      employees: data.profiles.map((profile) => profile.name),
    };
  } catch (error) {
    return {
      ...report,
      rows: [],
      metrics: [],
      source: "error",
      employees: [],
      message: error instanceof Error ? error.message : "Unable to load report data",
    };
  }
}

async function loadReportData() {
  const supabase = createSupabaseAdminClient();
  const [profiles, orders, items, payments, refunds, audits, products, categories, expenses, businessSummary, productSales, paymentTotals, stockSummary] = await Promise.all([
    supabase.from("profiles").select("id, name, role, store_id").is("deleted_at", null),
    supabase.from("sales").select("id, sale_number, store_id, cashier_id, status, subtotal, tax_total, discount_total, grand_total, amount_paid, created_at").is("deleted_at", null),
    supabase.from("sale_items").select("sale_id, product_id, name, quantity, cost_price, selling_price, unit_price, tax_rate, discount, line_total"),
    supabase.from("payments").select("order_id, method, amount, status, created_at"),
    supabase.from("refunds_or_voids").select("sale_id, amount, method, reason, created_at"),
    supabase.from("audit_logs").select("user_id, action, entity, entity_id, created_at"),
    supabase.from("products").select("id, name, category_id, cost_price").is("deleted_at", null),
    supabase.from("categories").select("id, name, parent_id").is("deleted_at", null),
    supabase.from("expenses").select("category, amount, payment_method, created_at").is("deleted_at", null),
    supabase.from("report_business_summary").select("*").maybeSingle(),
    supabase.from("report_product_sales").select("*"),
    supabase.from("report_payment_totals").select("*"),
    supabase.from("report_stock_summary").select("*"),
  ]);

  const firstError = [profiles, orders, items, payments, refunds, audits, products, categories, expenses, businessSummary, productSales, paymentTotals, stockSummary].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  return {
    profiles: (profiles.data ?? []) as ProfileRow[],
    orders: ((orders.data ?? []) as Array<OrderRow & { sale_number?: string | null }>).map((order) => ({
      ...order,
      order_number: order.sale_number ?? order.order_number,
      tax_amount: order.tax_amount ?? order.tax_total,
      discount_amount: order.discount_amount ?? order.discount_total,
      total_amount: order.total_amount ?? order.grand_total,
    })),
    items: ((items.data ?? []) as Array<OrderItemRow & { sale_id?: string | null }>).map((item) => ({
      ...item,
      order_id: item.sale_id ?? item.order_id,
    })),
    payments: (payments.data ?? []) as PaymentRow[],
    refunds: (refunds.data ?? []) as RefundRow[],
    audits: (audits.data ?? []) as AuditRow[],
    products: (products.data ?? []) as ProductRow[],
    categories: (categories.data ?? []) as CategoryRow[],
    expenses: (expenses.data ?? []) as ExpenseRow[],
    businessSummary: (businessSummary.data ?? null) as BusinessSummaryRow | null,
    productSales: (productSales.data ?? []) as ProductSalesRow[],
    paymentTotals: (paymentTotals.data ?? []) as PaymentTotalRow[],
    stockSummary: (stockSummary.data ?? []) as StockSummaryRow[],
  };
}

function buildMetrics(slug: string, data: Awaited<ReturnType<typeof loadReportData>>) {
  const summary = data.businessSummary;

  if (slug === "menu-item-sales-summary" || slug === "family-group-sales" || slug === "major-group-sales") {
    return [
      { label: "Product Quantity Sold", value: String(number(summary?.product_quantity_sold)) },
      { label: "Gross Profit", value: money(number(summary?.gross_profit)) },
      { label: "Total Sales", value: money(number(summary?.total_sales)) },
      { label: "Tax Collected", value: money(number(summary?.tax_collected)) },
    ];
  }

  if (slug === "stock-summary") {
    return [{ label: "Current Stock", value: String(number(summary?.current_stock)) }];
  }

  if (slug === "payment-summary") {
    return [{ label: "Payment Total", value: money(number(summary?.payment_total)) }];
  }

  if (slug === "expense-summary") {
    return [{ label: "Expense Total", value: money(number(summary?.expense_total)) }];
  }

  return [
    { label: "Total Sales", value: money(number(summary?.total_sales)) },
    { label: "Net Sales", value: money(number(summary?.net_sales)) },
    { label: "Total Orders", value: String(number(summary?.total_orders)) },
    { label: "Average Bill Value", value: money(number(summary?.average_bill_value)) },
    { label: "Discount Given", value: money(number(summary?.discount_given)) },
    { label: "Tax Collected", value: money(number(summary?.tax_collected)) },
  ];
}

function buildRows(slug: string, data: Awaited<ReturnType<typeof loadReportData>>) {
  switch (slug) {
    case "employee-financial":
      return employeeFinancialRows(data, false);
    case "employee-financial-vat":
      return employeeFinancialRows(data, true);
    case "employee-tip":
      return data.profiles.map((profile) => [profile.name, money(0), money(0), money(0), money(0)]);
    case "property-financial":
      return propertyFinancialRows(data, false);
    case "property-financial-vat":
      return propertyFinancialRows(data, true);
    case "tax-summary":
      return taxSummaryRows(data);
    case "expense-summary":
      return expenseSummaryRows(data);
    case "payment-summary":
      return paymentSummaryRows(data);
    case "stock-summary":
      return stockSummaryRows(data);
    case "employee-closed-check":
      return checkRows(data.orders.filter((order) => order.status === "COMPLETED"));
    case "employee-open-check":
      return checkRows(data.orders.filter((order) => order.status === "PENDING"));
    case "future-open-check":
      return [];
    case "family-group-sales":
    case "major-group-sales":
      return categorySalesRows(data);
    case "menu-item-sales-summary":
      return menuItemSummaryRows(data);
    case "menu-item-sales-detail":
      return menuItemDetailRows(data);
    case "check-journal":
      return checkJournalRows(data);
    case "employee-journal":
      return employeeJournalRows(data);
    case "held-item-summary":
      return [];
    case "table-sales":
      return [];
    case "clock-in-status":
      return data.profiles.map((profile) => [profile.name, profile.role ?? "Employee", "-", "-", "0.00"]);
    case "time-period-detail":
      return data.profiles.map((profile) => [profile.name, "-", "-", "0.00", "0.00"]);
    case "time-period-summary":
      return data.profiles.map((profile) => [profile.name, profile.role ?? "Employee", "0.00", "0.00", "0.00"]);
    default:
      return [];
  }
}

function expenseSummaryRows(data: Awaited<ReturnType<typeof loadReportData>>) {
  const byCategory = new Map<string, { count: number; amount: number; methods: Set<string>; lastEntry: string | null }>();

  for (const expense of data.expenses) {
    const key = expense.category ?? "Uncategorized";
    const current = byCategory.get(key) ?? { count: 0, amount: 0, methods: new Set<string>(), lastEntry: null };
    current.count += 1;
    current.amount += number(expense.amount);
    if (expense.payment_method) current.methods.add(expense.payment_method);
    if (!current.lastEntry || (expense.created_at && expense.created_at > current.lastEntry)) {
      current.lastEntry = expense.created_at ?? current.lastEntry;
    }
    byCategory.set(key, current);
  }

  return Array.from(byCategory.entries()).map(([category, value]) => [
    category,
    String(value.count),
    money(value.amount),
    Array.from(value.methods).join(", ") || "-",
    time(value.lastEntry),
  ]);
}

function paymentSummaryRows(data: Awaited<ReturnType<typeof loadReportData>>) {
  return data.paymentTotals.map((payment) => [
    payment.method ?? "-",
    String(number(payment.payment_count)),
    money(number(payment.payment_total)),
  ]);
}

function stockSummaryRows(data: Awaited<ReturnType<typeof loadReportData>>) {
  return data.stockSummary.map((stock) => [
    stock.name ?? "-",
    stock.sku ?? "-",
    String(number(stock.current_stock)),
    String(number(stock.stock_movement_quantity)),
  ]);
}

function employeeFinancialRows(data: Awaited<ReturnType<typeof loadReportData>>, vat: boolean) {
  const ordersByEmployee = groupBy(data.orders, (order) => order.cashier_id ?? "");
  return data.profiles.map((profile) => {
    const orders = ordersByEmployee.get(profile.id) ?? [];
    const grossSales = sum(orders, "subtotal");
    const tax = sum(orders, "tax_amount");
    const discounts = sum(orders, "discount_amount");
    const payments = sum(orders, "amount_paid");
    const netSales = sum(orders, "total_amount");

    return vat
      ? [profile.name, money(grossSales - discounts), money(tax), money(0), money(netSales)]
      : [profile.name, money(grossSales), money(discounts), money(payments), money(netSales)];
  });
}

function propertyFinancialRows(data: Awaited<ReturnType<typeof loadReportData>>, vat: boolean) {
  const ordersByStore = groupBy(data.orders, (order) => order.store_id ?? "Unassigned");
  return Array.from(ordersByStore.entries()).map(([storeId, orders]) => {
    const sales = sum(orders, "total_amount");
    const payments = sum(orders, "amount_paid");
    const discounts = sum(orders, "discount_amount");
    const tax = sum(orders, "tax_amount");

    return vat
      ? [storeId, money(sales - tax), money(tax), money(0), money(sales)]
      : [storeId, money(sales), money(payments), money(discounts), money(payments - sales)];
  });
}

function taxSummaryRows(data: Awaited<ReturnType<typeof loadReportData>>) {
  const byTaxRate = groupBy(data.items, (item) => String(number(item.tax_rate)));
  return Array.from(byTaxRate.entries()).map(([rate, items]) => {
    const taxableSales = items.reduce((total, item) => total + number(item.line_total) / (1 + number(item.tax_rate) / 100), 0);
    const taxCollected = items.reduce((total, item) => total + number(item.line_total) - number(item.line_total) / (1 + number(item.tax_rate) / 100), 0);
    return [`VAT ${rate}%`, money(taxableSales), `${rate}%`, money(taxCollected), money(0)];
  });
}

function checkRows(orders: OrderRow[]) {
  return orders.map((order) => [
    order.order_number ?? shortId(order.id),
    time(order.created_at),
    "1",
    order.status ?? "-",
    money(number(order.total_amount)),
  ]);
}

function categorySalesRows(data: Awaited<ReturnType<typeof loadReportData>>) {
  const productById = new Map(data.products.map((product) => [product.id, product]));
  const categoryById = new Map(data.categories.map((category) => [category.id, category]));
  const byCategory = new Map<string, { qty: number; sales: number; cost: number; discounts: number }>();

  for (const item of data.items) {
    const product = item.product_id ? productById.get(item.product_id) : undefined;
    const category = product?.category_id ? categoryById.get(product.category_id) : undefined;
    const key = category?.name ?? "Uncategorized";
    const current = byCategory.get(key) ?? { qty: 0, sales: 0, cost: 0, discounts: 0 };
    current.qty += number(item.quantity);
    current.sales += number(item.line_total);
    current.cost += number(item.quantity) * number(product?.cost_price);
    current.discounts += number(item.discount);
    byCategory.set(key, current);
  }

  return Array.from(byCategory.entries()).map(([category, value]) => [
    category,
    String(value.qty),
    money(value.sales),
    money(value.cost),
    value.sales > 0 ? `${round(((value.sales - value.cost) / value.sales) * 100)}%` : "0%",
  ]);
}

function menuItemSummaryRows(data: Awaited<ReturnType<typeof loadReportData>>) {
  return data.productSales.map((product) => [
    product.name ?? "-",
    String(number(product.product_quantity_sold)),
    money(number(product.total_sales)),
    money(number(product.total_sales) - number(product.gross_profit)),
    money(number(product.gross_profit)),
  ]);
}

function menuItemDetailRows(data: Awaited<ReturnType<typeof loadReportData>>) {
  const orderById = new Map(data.orders.map((order) => [order.id, order]));
  const profileById = new Map(data.profiles.map((profile) => [profile.id, profile]));

  return data.items.map((item) => {
    const order = item.order_id ? orderById.get(item.order_id) : undefined;
    const profile = order?.cashier_id ? profileById.get(order.cashier_id) : undefined;
    return [order?.order_number ?? shortId(item.order_id), item.name ?? "-", String(number(item.quantity)), profile?.name ?? "-", money(number(item.line_total))];
  });
}

function checkJournalRows(data: Awaited<ReturnType<typeof loadReportData>>) {
  const profileById = new Map(data.profiles.map((profile) => [profile.id, profile]));
  return data.audits.map((audit) => [time(audit.created_at), shortId(audit.entity_id), audit.action ?? "-", profileById.get(audit.user_id ?? "")?.name ?? "-", audit.entity ?? "-"]);
}

function employeeJournalRows(data: Awaited<ReturnType<typeof loadReportData>>) {
  const profileById = new Map(data.profiles.map((profile) => [profile.id, profile]));
  return data.audits.map((audit) => [time(audit.created_at), profileById.get(audit.user_id ?? "")?.name ?? "-", shortId(audit.entity_id), audit.action ?? "-", audit.entity ?? "-"]);
}

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const group = key(row);
    map.set(group, [...(map.get(group) ?? []), row]);
  }
  return map;
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce((total, row) => total + number(row[key]), 0);
}

function number(value: unknown) {
  return Number(value ?? 0) || 0;
}

function money(value: number) {
  return round(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "-";
}

function time(value?: string | null) {
  return value ? new Date(value).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", month: "short", day: "2-digit" }) : "-";
}
