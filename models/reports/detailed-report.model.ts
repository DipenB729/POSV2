import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type DetailedReportType =
  | "sales"
  | "product-sales"
  | "inventory"
  | "profit"
  | "payment"
  | "cashier"
  | "expense"
  | "tax"
  | "discount"
  | "monthly";

export type DetailedReport = {
  type: DetailedReportType;
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
  totals: Array<{ label: string; value: string }>;
  from: string;
  to: string;
};

type Range = {
  from?: string;
  to?: string;
};

type Sale = Record<string, unknown>;
type SaleItem = Record<string, unknown>;
type Payment = Record<string, unknown>;
type Expense = Record<string, unknown>;
type RefundOrVoid = Record<string, unknown>;
type Inventory = Record<string, unknown>;

export const detailedReportTypes: Array<{ type: DetailedReportType; title: string; description: string }> = [
  { type: "sales", title: "Sales Report", description: "Invoice list with customer, cashier, payment, and grand total." },
  { type: "product-sales", title: "Product Report", description: "Product quantity sold, revenue, and profit." },
  { type: "inventory", title: "Inventory Report", description: "Current stock, stock movement, and low stock status." },
  { type: "profit", title: "Profit Report", description: "Sales, cost, gross profit, and margin." },
  { type: "payment", title: "Payment Report", description: "Cash, eSewa, Khalti, card, and QR payment totals." },
  { type: "cashier", title: "Cashier Report", description: "Sales by staff, orders, voids, and collections." },
  { type: "expense", title: "Expense Report", description: "Expense entries and category totals." },
  { type: "tax", title: "Tax Report", description: "Taxable sales and tax collected by tax rate." },
  { type: "discount", title: "Discount Report", description: "Discount totals by sale and cashier." },
  { type: "monthly", title: "Monthly Report", description: "Month-level sales, orders, profit, expenses, and payments." },
];

export function isDetailedReportType(value: string): value is DetailedReportType {
  return detailedReportTypes.some((report) => report.type === value);
}

export async function detailedReport(type: DetailedReportType, range: Range): Promise<DetailedReport> {
  const { from, to } = normalizeRange(range);
  const source = await loadSourceData(from, to);

  switch (type) {
    case "sales":
      return salesReport(source, from, to);
    case "product-sales":
      return productReport(source, from, to);
    case "inventory":
      return inventoryReport(source, from, to);
    case "profit":
      return profitReport(source, from, to);
    case "payment":
      return paymentReport(source, from, to);
    case "cashier":
      return cashierReport(source, from, to);
    case "expense":
      return expenseReport(source, from, to);
    case "tax":
      return taxReport(source, from, to);
    case "discount":
      return discountReport(source, from, to);
    case "monthly":
      return monthlyReport(source, from, to);
  }
}

export function reportToCsv(report: DetailedReport) {
  const lines = [
    [report.title],
    [`From ${report.from}`, `To ${report.to}`],
    [],
    ["Totals"],
    ...report.totals.map((total) => [total.label, total.value]),
    [],
    report.columns,
    ...report.rows,
  ];

  return lines.map((row) => row.map(csvCell).join(",")).join("\n");
}

async function loadSourceData(from: string, to: string) {
  const supabase = createSupabaseAdminClient();

  const [sales, saleItems, payments, expenses, inventory, refundsOrVoids] = await Promise.all([
    supabase
      .from("sales")
      .select("id, sale_number, customer_id, cashier_id, profiles:cashier_id(name), status, subtotal, tax_total, discount_total, grand_total, amount_paid, created_at")
      .is("deleted_at", null)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false }),
    supabase
      .from("sale_items")
      .select("sale_id, product_id, name, sku, quantity, cost_price, selling_price, unit_price, tax_rate, discount, line_total, created_at")
      .gte("created_at", from)
      .lte("created_at", to),
    supabase
      .from("payments")
      .select("order_id, method, amount, status, created_at")
      .gte("created_at", from)
      .lte("created_at", to),
    supabase
      .from("expenses")
      .select("category, description, amount, payment_method, reference, incurred_at, created_at")
      .is("deleted_at", null)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false }),
    supabase
      .from("inventory_items")
      .select("quantity, reorder_point, products(name, sku), inventory_movements(type, quantity, created_at)")
      .is("deleted_at", null),
    supabase
      .from("refunds_or_voids")
      .select("event_type, sale_id, cashier_id, amount, reason, method, created_at")
      .gte("created_at", from)
      .lte("created_at", to),
  ]);

  const firstError = [sales, saleItems, payments, expenses, inventory, refundsOrVoids].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  return {
    sales: (sales.data ?? []) as Sale[],
    saleItems: (saleItems.data ?? []) as SaleItem[],
    payments: (payments.data ?? []) as Payment[],
    expenses: (expenses.data ?? []) as Expense[],
    inventory: (inventory.data ?? []) as Inventory[],
    refundsOrVoids: (refundsOrVoids.data ?? []) as RefundOrVoid[],
  };
}

function salesReport(source: Awaited<ReturnType<typeof loadSourceData>>, from: string, to: string): DetailedReport {
  const paymentsBySale = groupBy(source.payments, (payment) => text(payment.order_id));
  const rows = source.sales.map((sale) => {
    const payments = paymentsBySale.get(text(sale.id)) ?? [];
    return [
      text(sale.sale_number),
      text(sale.customer_id) || "Walk-in",
      relationName(sale.profiles) || text(sale.cashier_id),
      payments.map((payment) => text(payment.method)).filter(Boolean).join(", ") || "-",
      money(num(sale.grand_total)),
      dateTime(sale.created_at),
    ];
  });

  return makeReport("sales", ["Invoice", "Customer", "Cashier", "Payment", "Grand total", "Created"], rows, source, from, to);
}

function productReport(source: Awaited<ReturnType<typeof loadSourceData>>, from: string, to: string): DetailedReport {
  const byProduct = new Map<string, { quantity: number; revenue: number; profit: number }>();
  for (const item of source.saleItems) {
    const key = text(item.name) || text(item.product_id);
    const current = byProduct.get(key) ?? { quantity: 0, revenue: 0, profit: 0 };
    current.quantity += num(item.quantity);
    current.revenue += num(item.line_total);
    current.profit += (num(item.selling_price) - num(item.cost_price)) * num(item.quantity);
    byProduct.set(key, current);
  }
  const rows = Array.from(byProduct.entries()).map(([name, value]) => [name, String(value.quantity), money(value.revenue), money(value.profit)]);
  return makeReport("product-sales", ["Product", "Quantity sold", "Revenue", "Profit"], rows, source, from, to);
}

function inventoryReport(source: Awaited<ReturnType<typeof loadSourceData>>, from: string, to: string): DetailedReport {
  const rows = source.inventory.map((item) => {
    const movements = Array.isArray(item.inventory_movements) ? item.inventory_movements : [];
    const stockIn = movements.filter((movement) => ["PURCHASE_RECEIVED", "RETURN", "TRANSFER_IN"].includes(text(movement.type))).reduce((total, movement) => total + num(movement.quantity), 0);
    const stockOut = movements.filter((movement) => ["SALE", "DAMAGE", "TRANSFER_OUT"].includes(text(movement.type))).reduce((total, movement) => total + Math.abs(num(movement.quantity)), 0);
    const quantity = num(item.quantity);
    const reorderPoint = num(item.reorder_point);
    return [relationName(item.products), relationSku(item.products), String(quantity), String(stockIn), String(stockOut), quantity <= reorderPoint ? "Low stock" : "OK"];
  });
  return makeReport("inventory", ["Product", "SKU", "Current stock", "Stock in", "Stock out", "Status"], rows, source, from, to);
}

function profitReport(source: Awaited<ReturnType<typeof loadSourceData>>, from: string, to: string): DetailedReport {
  const rows = source.saleItems.map((item) => {
    const sales = num(item.line_total);
    const cost = num(item.cost_price) * num(item.quantity);
    const profit = (num(item.selling_price) - num(item.cost_price)) * num(item.quantity);
    return [text(item.name), money(sales), money(cost), money(profit), percent(sales ? (profit / sales) * 100 : 0)];
  });
  return makeReport("profit", ["Product", "Sales", "Cost", "Gross profit", "Margin"], rows, source, from, to);
}

function paymentReport(source: Awaited<ReturnType<typeof loadSourceData>>, from: string, to: string): DetailedReport {
  const byMethod = new Map<string, { count: number; total: number }>();
  for (const payment of source.payments.filter((payment) => text(payment.status) === "COMPLETED")) {
    const key = text(payment.method) || "UNKNOWN";
    const current = byMethod.get(key) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += num(payment.amount);
    byMethod.set(key, current);
  }
  const rows = Array.from(byMethod.entries()).map(([method, value]) => [method, String(value.count), money(value.total)]);
  return makeReport("payment", ["Payment method", "Count", "Total"], rows, source, from, to);
}

function cashierReport(source: Awaited<ReturnType<typeof loadSourceData>>, from: string, to: string): DetailedReport {
  const paymentsBySale = groupBy(source.payments, (payment) => text(payment.order_id));
  const voidsByCashier = groupBy(source.refundsOrVoids.filter((event) => text(event.event_type) === "void"), (event) => text(event.cashier_id));
  const byCashier = new Map<string, { orders: number; sales: number; collections: number; voids: number }>();
  for (const sale of source.sales) {
    const key = relationName(sale.profiles) || text(sale.cashier_id) || "Unknown";
    const current = byCashier.get(key) ?? { orders: 0, sales: 0, collections: 0, voids: 0 };
    current.orders += 1;
    current.sales += num(sale.grand_total);
    current.collections += (paymentsBySale.get(text(sale.id)) ?? []).reduce((total, payment) => total + num(payment.amount), 0);
    current.voids += (voidsByCashier.get(text(sale.cashier_id)) ?? []).length;
    byCashier.set(key, current);
  }
  const rows = Array.from(byCashier.entries()).map(([cashier, value]) => [cashier, String(value.orders), money(value.sales), String(value.voids), money(value.collections)]);
  return makeReport("cashier", ["Cashier", "Orders", "Sales", "Voids", "Collections"], rows, source, from, to);
}

function expenseReport(source: Awaited<ReturnType<typeof loadSourceData>>, from: string, to: string): DetailedReport {
  const rows = source.expenses.map((expense) => [text(expense.category), text(expense.description), money(num(expense.amount)), text(expense.payment_method), dateTime(expense.created_at)]);
  return makeReport("expense", ["Category", "Description", "Amount", "Payment", "Created"], rows, source, from, to);
}

function taxReport(source: Awaited<ReturnType<typeof loadSourceData>>, from: string, to: string): DetailedReport {
  const byTax = new Map<string, { taxable: number; tax: number }>();
  for (const item of source.saleItems) {
    const rate = text(item.tax_rate);
    const sales = num(item.line_total);
    const taxable = sales / (1 + num(item.tax_rate) / 100);
    const current = byTax.get(rate) ?? { taxable: 0, tax: 0 };
    current.taxable += taxable;
    current.tax += sales - taxable;
    byTax.set(rate, current);
  }
  const rows = Array.from(byTax.entries()).map(([rate, value]) => [`${rate}%`, money(value.taxable), money(value.tax)]);
  return makeReport("tax", ["Tax rate", "Taxable sales", "Tax collected"], rows, source, from, to);
}

function discountReport(source: Awaited<ReturnType<typeof loadSourceData>>, from: string, to: string): DetailedReport {
  const rows = source.sales.filter((sale) => num(sale.discount_total) > 0).map((sale) => [text(sale.sale_number), relationName(sale.profiles) || text(sale.cashier_id), money(num(sale.discount_total)), money(num(sale.grand_total)), dateTime(sale.created_at)]);
  return makeReport("discount", ["Invoice", "Cashier", "Discount", "Grand total", "Created"], rows, source, from, to);
}

function monthlyReport(source: Awaited<ReturnType<typeof loadSourceData>>, from: string, to: string): DetailedReport {
  const byMonth = new Map<string, { orders: number; sales: number; profit: number; expenses: number; payments: number }>();
  for (const sale of source.sales) {
    const key = monthKey(sale.created_at);
    const current = byMonth.get(key) ?? { orders: 0, sales: 0, profit: 0, expenses: 0, payments: 0 };
    current.orders += 1;
    current.sales += num(sale.grand_total);
    byMonth.set(key, current);
  }
  for (const item of source.saleItems) {
    const key = monthKey(item.created_at);
    const current = byMonth.get(key) ?? { orders: 0, sales: 0, profit: 0, expenses: 0, payments: 0 };
    current.profit += (num(item.selling_price) - num(item.cost_price)) * num(item.quantity);
    byMonth.set(key, current);
  }
  for (const expense of source.expenses) {
    const key = monthKey(expense.created_at);
    const current = byMonth.get(key) ?? { orders: 0, sales: 0, profit: 0, expenses: 0, payments: 0 };
    current.expenses += num(expense.amount);
    byMonth.set(key, current);
  }
  for (const payment of source.payments) {
    const key = monthKey(payment.created_at);
    const current = byMonth.get(key) ?? { orders: 0, sales: 0, profit: 0, expenses: 0, payments: 0 };
    current.payments += num(payment.amount);
    byMonth.set(key, current);
  }
  const rows = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => [month, String(value.orders), money(value.sales), money(value.profit), money(value.expenses), money(value.payments)]);
  return makeReport("monthly", ["Month", "Orders", "Sales", "Profit", "Expenses", "Payments"], rows, source, from, to);
}

function makeReport(type: DetailedReportType, columns: string[], rows: string[][], source: Awaited<ReturnType<typeof loadSourceData>>, from: string, to: string): DetailedReport {
  const meta = detailedReportTypes.find((report) => report.type === type)!;
  const totalSales = source.sales.reduce((total, sale) => total + num(sale.grand_total), 0);
  const totalProfit = source.saleItems.reduce((total, item) => total + (num(item.selling_price) - num(item.cost_price)) * num(item.quantity), 0);
  const totalExpenses = source.expenses.reduce((total, expense) => total + num(expense.amount), 0);
  const totalPayments = source.payments.filter((payment) => text(payment.status) === "COMPLETED").reduce((total, payment) => total + num(payment.amount), 0);

  return {
    type,
    title: meta.title,
    description: meta.description,
    columns,
    rows,
    from,
    to,
    totals: [
      { label: "Rows", value: String(rows.length) },
      { label: "Sales", value: money(totalSales) },
      { label: "Profit", value: money(totalProfit) },
      { label: "Payments", value: money(totalPayments) },
      { label: "Expenses", value: money(totalExpenses) },
    ],
  };
}

function normalizeRange(range: Range) {
  const now = new Date();
  const from = range.from ? new Date(range.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = range.to ? new Date(range.to) : now;
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const group = key(row);
    map.set(group, [...(map.get(group) ?? []), row]);
  }
  return map;
}

function csvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function relationName(value: unknown) {
  if (Array.isArray(value)) return relationName(value[0]);
  if (value && typeof value === "object" && "name" in value) return text((value as { name?: unknown }).name);
  return "";
}

function relationSku(value: unknown) {
  if (Array.isArray(value)) return relationSku(value[0]);
  if (value && typeof value === "object" && "sku" in value) return text((value as { sku?: unknown }).sku);
  return "";
}

function num(value: unknown) {
  return Number(value ?? 0) || 0;
}

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function money(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function percent(value: number) {
  return `${Math.round(value * 100) / 100}%`;
}

function dateTime(value: unknown) {
  return value ? new Date(String(value)).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "-";
}

function monthKey(value: unknown) {
  return value ? new Date(String(value)).toISOString().slice(0, 7) : "Unknown";
}
