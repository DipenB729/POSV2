import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Boxes,
  ChevronRight,
  CreditCard,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { AppHeader, AppShell } from "@/components/app-shell";
import { dashboardSummary, type DashboardRange } from "@/models/reports/dashboard.model";
import { cn } from "@/lib/utils";

const ranges: Array<{ label: string; value: DashboardRange }> = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
];

export async function MainDashboard({ range = "today" }: { range?: DashboardRange }) {
  const data = await dashboardSummary(range);
  const maxTrend = Math.max(...data.salesTrend.map((point) => point.sales), 1);
  const maxPayment = Math.max(...data.paymentBreakdown.map((payment) => payment.amount), 1);
  const salesLabel = range === "today" ? "Today Sales" : range === "week" ? "Week Sales" : "Month Sales";

  return (
    <AppShell>
      <AppHeader
        eyebrow="Dashboard"
        title="Owner Overview"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              {ranges.map((item) => (
                <Link
                  key={item.value}
                  href={`/?range=${item.value}`}
                  className={cn(
                    "rounded-md px-3 py-2 text-xs font-semibold transition",
                    item.value === range ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <Link
              href="/terminal"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <ReceiptText className="size-4" />
              New Sale
            </Link>
          </div>
        }
      />

      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={WalletCards} label={salesLabel} value={money(data.cards.todaySales)} />
          <Metric icon={ReceiptText} label="Orders" value={String(data.cards.orders)} />
          <Metric icon={TrendingUp} label="Profit" value={money(data.cards.profit)} />
          <Metric icon={AlertTriangle} label="Low Stock" value={String(data.cards.lowStock)} tone={data.cards.lowStock > 0 ? "warning" : "default"} />
          <Metric icon={Banknote} label="Cash" value={money(data.cards.cash)} />
          <Metric icon={CreditCard} label="QR / Digital" value={money(data.cards.digitalPayments)} />
          <Metric icon={ShoppingCart} label="Expenses" value={money(data.cards.expenses)} />
          <Metric icon={Boxes} label="Out of Stock" value={String(data.outOfStockCount)} tone={data.outOfStockCount > 0 ? "danger" : "default"} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.75fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Sales Trend</h2>
                <p className="mt-1 text-sm text-slate-500">Daily sales for the selected range</p>
              </div>
              <BarChart3 className="size-5 text-slate-400" />
            </div>
            <div className="mt-6 flex h-64 items-end gap-2 overflow-x-auto">
              {data.salesTrend.map((point) => (
                <div key={point.date} className="flex h-full min-w-12 flex-1 flex-col justify-end gap-2">
                  <div className="flex flex-1 items-end rounded-md bg-slate-50 px-2">
                    <div
                      className="w-full rounded-t-md bg-emerald-500"
                      style={{ height: `${Math.max(4, (point.sales / maxTrend) * 100)}%` }}
                      title={`${point.date}: ${money(point.sales)}`}
                    />
                  </div>
                  <p className="truncate text-center text-[11px] font-medium text-slate-500">{shortDate(point.date)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Payment Breakdown</h2>
                <p className="mt-1 text-sm text-slate-500">Completed payments by method</p>
              </div>
              <WalletCards className="size-5 text-slate-400" />
            </div>
            <div className="mt-5 space-y-4">
              {data.paymentBreakdown.length > 0 ? (
                data.paymentBreakdown.map((payment) => (
                  <div key={payment.method}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-slate-700">{payment.method}</span>
                      <span className="text-slate-500">{money(payment.amount)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-slate-900" style={{ width: `${Math.max(3, (payment.amount / maxPayment) * 100)}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState label="No payments in this range" />
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Panel title="Top-Selling Products" subtitle="Ranked by quantity sold" icon={PackageSearch}>
            {data.topProducts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.topProducts.map((product, index) => (
                  <div key={product.name} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.quantity} sold · Profit {money(product.profit)}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{money(product.sales)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No product sales in this range" />
            )}
          </Panel>

          <Panel title="Stock Alerts" subtitle="Low stock and out of stock items" icon={AlertTriangle}>
            {data.alerts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.alerts.map((item) => (
                  <div key={`${item.sku}-${item.name}`} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.sku} · Reorder at {item.reorderPoint}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-semibold",
                        item.status === "Out of stock" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {item.status}: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No stock alerts" />
            )}
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            tone === "danger" ? "bg-red-50 text-red-600" : tone === "warning" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600",
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof WalletCards; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <Icon className="size-5 text-slate-400" />
      </div>
      <div className="mt-2">{children}</div>
      <Link href="/reports" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800">
        View reports <ChevronRight className="size-3" />
      </Link>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{label}</div>;
}

function money(value: number) {
  return `Rs ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
