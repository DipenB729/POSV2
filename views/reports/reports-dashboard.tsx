import Link from "next/link";
import {
  Banknote,
  BarChart3,
  Boxes,
  CalendarDays,
  CreditCard,
  Download,
  FileSpreadsheet,
  Printer,
  Receipt,
  ReceiptText,
  Tags,
  UserRound,
  WalletCards,
} from "lucide-react";

import { AppHeader, AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

const reports = [
  {
    href: "/reports/detail/sales",
    title: "Sales Report",
    description: "Invoices, customers, cashiers, payment methods, and grand totals.",
    icon: ReceiptText,
    group: "Sales",
  },
  {
    href: "/reports/detail/product-sales",
    title: "Product Report",
    description: "Product sold quantity, revenue, and profit.",
    icon: Tags,
    group: "Products",
  },
  {
    href: "/reports/detail/inventory",
    title: "Inventory Report",
    description: "Current stock, stock in/out, and low stock status.",
    icon: Boxes,
    group: "Inventory",
  },
  {
    href: "/reports/detail/profit",
    title: "Profit Report",
    description: "Sales, cost, gross profit, and margin.",
    icon: BarChart3,
    group: "Finance",
  },
  {
    href: "/reports/detail/payment",
    title: "Payment Report",
    description: "Cash, eSewa, Khalti, card, and QR payment totals.",
    icon: CreditCard,
    group: "Payments",
  },
  {
    href: "/reports/detail/cashier",
    title: "Cashier Report",
    description: "Sales by staff, orders, voids, and collections.",
    icon: UserRound,
    group: "Staff",
  },
  {
    href: "/reports/detail/expense",
    title: "Expense Report",
    description: "Expense entries and category totals.",
    icon: WalletCards,
    group: "Finance",
  },
  {
    href: "/reports/detail/tax",
    title: "Tax Report",
    description: "Taxable sales and tax collected by tax rate.",
    icon: Banknote,
    group: "Tax",
  },
  {
    href: "/reports/detail/discount",
    title: "Discount Report",
    description: "Discount totals by sale and cashier.",
    icon: Receipt,
    group: "Sales",
  },
  {
    href: "/reports/detail/monthly",
    title: "Monthly Report",
    description: "Monthly sales, orders, profit, expenses, and payments.",
    icon: CalendarDays,
    group: "Summary",
  },
];

export function ReportsDashboard() {
  return (
    <AppShell>
      <AppHeader
        eyebrow="Reports"
        title="Report Center"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Printer className="size-4" />
              Print
            </Button>
            <Button size="sm">
              <Download className="size-4" />
              Export
            </Button>
          </div>
        }
      />

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Reports</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Workable Business Reports</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Open a report detail page with date filters, totals, printable rows, and CSV export.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
            <FileSpreadsheet className="size-5 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-900">{reports.length} reports</span>
          </div>
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => {
            const Icon = report.icon;

            return (
              <Link
                key={report.href}
                href={report.href}
                className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{report.group}</span>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{report.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{report.description}</p>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
