"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  Filter,
  FolderTree,
  Landmark,
  Maximize2,
  Printer,
  Receipt,
  ReceiptText,
  Search,
  ShieldCheck,
  Table2,
  UserRound,
  WalletCards,
} from "lucide-react";

import { AppHeader, AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { reportSlug } from "@/lib/reports/report-detail-data";
import { cn } from "@/lib/utils";

type Report = {
  name: string;
  description: string;
  scope: string;
  cadence: string;
  columns: string[];
  rows: string[][];
};

type ReportGroup = {
  id: string;
  name: string;
  summary: string;
  icon: typeof WalletCards;
  reports: Report[];
};

const reportGroups: ReportGroup[] = [
  {
    id: "financial",
    name: "Financial Reports",
    summary: "Financial reporting for employee, property, VAT, tax, and tips.",
    icon: WalletCards,
    reports: [
      {
        name: "Employee Financial",
        description: "Tracks gross sales, discounts, service charges, payments, and net totals by employee.",
        scope: "Employee",
        cadence: "Shift close",
        columns: ["Employee", "Gross sales", "Discounts", "Payments", "Net sales"],
        rows: [
          ["John Doe", "18,450.00", "520.00", "17,930.00", "16,780.00"],
          ["Asha Sharma", "14,220.00", "310.00", "13,910.00", "13,120.00"],
          ["Bibek Gurung", "9,860.00", "180.00", "9,680.00", "9,140.00"],
        ],
      },
      {
        name: "Employee Financial - VAT",
        description: "Adds VAT taxable, exempt, and collected tax totals to employee financial activity.",
        scope: "Employee",
        cadence: "Daily",
        columns: ["Employee", "Taxable sales", "VAT", "Exempt sales", "Net sales"],
        rows: [
          ["John Doe", "15,840.00", "2,059.20", "940.00", "16,780.00"],
          ["Asha Sharma", "12,320.00", "1,601.60", "800.00", "13,120.00"],
          ["Bibek Gurung", "8,640.00", "1,123.20", "500.00", "9,140.00"],
        ],
      },
      {
        name: "Employee Tip",
        description: "Summarizes declared, charged, paid, and adjusted tips for payroll review.",
        scope: "Employee",
        cadence: "Payroll",
        columns: ["Employee", "Cash tips", "Card tips", "Tip outs", "Net tips"],
        rows: [
          ["John Doe", "850.00", "1,120.00", "240.00", "1,730.00"],
          ["Asha Sharma", "620.00", "980.00", "190.00", "1,410.00"],
          ["Bibek Gurung", "410.00", "560.00", "120.00", "850.00"],
        ],
      },
      {
        name: "Property Financial",
        description: "Rolls up revenue center sales, tender totals, discounts, and liabilities for the property.",
        scope: "Property",
        cadence: "End of day",
        columns: ["Revenue center", "Sales", "Payments", "Discounts", "Variance"],
        rows: [
          ["Dining", "38,450.00", "38,420.00", "860.00", "-30.00"],
          ["Takeaway", "16,720.00", "16,720.00", "210.00", "0.00"],
          ["Online", "11,940.00", "11,900.00", "130.00", "-40.00"],
        ],
      },
      {
        name: "Property Financial - VAT",
        description: "Property-level financial totals with VAT classification and tax liability.",
        scope: "Property",
        cadence: "Tax period",
        columns: ["Property", "Taxable sales", "VAT", "Non-taxable", "Total"],
        rows: [
          ["Main Branch", "62,800.00", "8,164.00", "4,310.00", "67,110.00"],
          ["Cafe Counter", "18,900.00", "2,457.00", "1,120.00", "20,020.00"],
          ["Retail Desk", "7,400.00", "370.00", "260.00", "7,660.00"],
        ],
      },
      {
        name: "Tax Summary",
        description: "Summarizes tax classes, taxable sales, exemptions, and tax collected.",
        scope: "Property",
        cadence: "Tax period",
        columns: ["Tax class", "Taxable sales", "Tax rate", "Tax collected", "Adjustments"],
        rows: [
          ["VAT Food", "54,300.00", "13%", "7,059.00", "0.00"],
          ["Retail VAT", "7,400.00", "5%", "370.00", "0.00"],
          ["Exempt", "4,310.00", "0%", "0.00", "0.00"],
        ],
      },
      {
        name: "Expense Summary",
        description: "Tracks expense entries by category, amount, payment method, and entry date.",
        scope: "Property",
        cadence: "Daily",
        columns: ["Category", "Expense count", "Amount", "Payment method", "Last entry"],
        rows: [],
      },
      {
        name: "Payment Summary",
        description: "Groups completed payment totals by payment method.",
        scope: "Property",
        cadence: "Daily",
        columns: ["Payment method", "Payment count", "Payment total"],
        rows: [],
      },
    ],
  },
  {
    id: "checks",
    name: "Check Reports",
    summary: "Open, closed, and future open checks belonging to an employee.",
    icon: ReceiptText,
    reports: [
      {
        name: "Future Open Check",
        description: "Lists scheduled Autofire checks that will open later for production or service.",
        scope: "Employee",
        cadence: "Current",
        columns: ["Check", "Employee", "Open time", "Table", "Projected total"],
        rows: [
          ["AF-1024", "John Doe", "18:30", "T-12", "2,840.00"],
          ["AF-1025", "Asha Sharma", "19:00", "T-07", "1,620.00"],
          ["AF-1026", "Bibek Gurung", "19:30", "T-03", "980.00"],
        ],
      },
      {
        name: "Employee Closed Check",
        description: "Shows closed checks for an employee with payment, void, discount, and total details.",
        scope: "Employee",
        cadence: "Shift close",
        columns: ["Check", "Closed time", "Guest count", "Tender", "Total"],
        rows: [
          ["CHK-4211", "14:12", "4", "Card", "3,260.00"],
          ["CHK-4212", "14:28", "2", "Cash", "1,140.00"],
          ["CHK-4213", "15:05", "3", "QR", "2,080.00"],
        ],
      },
      {
        name: "Employee Open Check",
        description: "Shows checks still open for an employee at the time the report is taken.",
        scope: "Employee",
        cadence: "Current",
        columns: ["Check", "Opened", "Table", "Items", "Balance due"],
        rows: [
          ["CHK-4302", "17:40", "T-05", "8", "3,440.00"],
          ["CHK-4303", "17:52", "T-11", "5", "1,980.00"],
          ["CHK-4304", "18:01", "T-02", "3", "920.00"],
        ],
      },
    ],
  },
  {
    id: "menu-items",
    name: "Menu Item Reports",
    summary: "Sales and food cost totals by menu item, family group, and major group.",
    icon: FolderTree,
    reports: [
      {
        name: "Family Group Sales",
        description: "Groups menu item sales into family groups for category performance review.",
        scope: "Property",
        cadence: "Daily",
        columns: ["Family group", "Qty sold", "Gross sales", "Food cost", "Margin"],
        rows: [
          ["Hot Drinks", "126", "18,420.00", "6,880.00", "62.65%"],
          ["Food & Snacks", "94", "24,760.00", "11,300.00", "54.36%"],
          ["Bakery", "42", "6,300.00", "2,940.00", "53.33%"],
        ],
      },
      {
        name: "Major Group Sales",
        description: "Summarizes revenue, counts, and cost by major menu group.",
        scope: "Property",
        cadence: "Daily",
        columns: ["Major group", "Qty sold", "Gross sales", "Discounts", "Net sales"],
        rows: [
          ["Beverage", "181", "28,920.00", "320.00", "28,600.00"],
          ["Food", "104", "27,380.00", "510.00", "26,870.00"],
          ["Retail", "18", "1,620.00", "0.00", "1,620.00"],
        ],
      },
      {
        name: "Menu Item Sales Summary",
        description: "Condensed item-level sales quantities, revenue, and calculated food cost.",
        scope: "Property",
        cadence: "Daily",
        columns: ["Menu item", "Qty sold", "Sales", "Food cost", "Profit"],
        rows: [
          ["Chicken Momo", "38", "9,880.00", "4,940.00", "4,940.00"],
          ["Cafe Latte", "44", "9,240.00", "4,180.00", "5,060.00"],
          ["Veg Chowmein", "27", "5,940.00", "2,835.00", "3,105.00"],
        ],
      },
      {
        name: "Menu Item Sales Detail",
        description: "Detailed check-level breakdown of each sold menu item and modifier.",
        scope: "Property",
        cadence: "On demand",
        columns: ["Check", "Menu item", "Qty", "Employee", "Line total"],
        rows: [
          ["CHK-4211", "Chicken Momo", "2", "John Doe", "520.00"],
          ["CHK-4211", "Cafe Latte", "3", "John Doe", "630.00"],
          ["CHK-4213", "Veg Chowmein", "1", "Asha Sharma", "220.00"],
        ],
      },
      {
        name: "Stock Summary",
        description: "Shows current product stock and total movement quantity used by stock reports.",
        scope: "Property",
        cadence: "Current",
        columns: ["Product", "SKU", "Current stock", "Stock movement quantity"],
        rows: [],
      },
    ],
  },
  {
    id: "audit",
    name: "Audit Reports",
    summary: "Journals of sales transactions by employee and check detail area.",
    icon: ShieldCheck,
    reports: [
      {
        name: "Check Journal",
        description: "Chronological transaction journal for checks, tenders, voids, and adjustments.",
        scope: "Check detail area",
        cadence: "On demand",
        columns: ["Time", "Check", "Action", "Employee", "Amount"],
        rows: [
          ["14:08", "CHK-4211", "Item added", "John Doe", "260.00"],
          ["14:11", "CHK-4211", "Discount", "John Doe", "-80.00"],
          ["14:12", "CHK-4211", "Payment", "John Doe", "3,260.00"],
        ],
      },
      {
        name: "Employee Journal",
        description: "Employee-specific transaction journal across checks and detail areas.",
        scope: "Employee",
        cadence: "On demand",
        columns: ["Time", "Employee", "Check", "Action", "Amount"],
        rows: [
          ["13:52", "Asha Sharma", "CHK-4208", "Open check", "0.00"],
          ["14:02", "Asha Sharma", "CHK-4208", "Void item", "-190.00"],
          ["14:18", "Asha Sharma", "CHK-4208", "Close check", "1,870.00"],
        ],
      },
    ],
  },
  {
    id: "table-service",
    name: "Table Service Reports",
    summary: "Sales totals and held item tracking for tables in a revenue center.",
    icon: Table2,
    reports: [
      {
        name: "Held Item Summary",
        description: "Shows held items by table, course, employee, and release status.",
        scope: "Revenue center",
        cadence: "Current",
        columns: ["Table", "Item", "Held since", "Employee", "Status"],
        rows: [
          ["T-05", "Chicken Momo", "17:42", "John Doe", "Held"],
          ["T-07", "Cafe Latte", "17:55", "Asha Sharma", "Released"],
          ["T-11", "Veg Sandwich", "18:04", "Bibek Gurung", "Held"],
        ],
      },
      {
        name: "Table Sales",
        description: "Summarizes table sales, covers, check counts, and average spend.",
        scope: "Revenue center",
        cadence: "Daily",
        columns: ["Table", "Checks", "Covers", "Sales", "Average cover"],
        rows: [
          ["T-01", "6", "18", "8,640.00", "480.00"],
          ["T-05", "8", "24", "12,220.00", "509.17"],
          ["T-11", "5", "14", "6,980.00", "498.57"],
        ],
      },
    ],
  },
  {
    id: "clock-in",
    name: "Clock In Reports",
    summary: "Clock status and worked time when clock in/out is enabled.",
    icon: Clock3,
    reports: [
      {
        name: "Clock In Status",
        description: "Current employee clock status, job code, break state, and clock-in time.",
        scope: "Employee",
        cadence: "Current",
        columns: ["Employee", "Job code", "Clocked in", "Break", "Hours"],
        rows: [
          ["John Doe", "Manager", "09:02", "No", "8.25"],
          ["Asha Sharma", "Cashier", "10:00", "No", "7.10"],
          ["Bibek Gurung", "Server", "11:15", "Yes", "5.45"],
        ],
      },
      {
        name: "Time Period Detail",
        description: "Detailed labor punches, edits, break time, and payable hours for a date range.",
        scope: "Employee",
        cadence: "Payroll",
        columns: ["Employee", "In", "Out", "Breaks", "Payable hours"],
        rows: [
          ["John Doe", "09:02", "18:12", "0.75", "8.42"],
          ["Asha Sharma", "10:00", "18:08", "0.50", "7.63"],
          ["Bibek Gurung", "11:15", "18:30", "0.50", "6.75"],
        ],
      },
      {
        name: "Time Period Summary",
        description: "Summarized labor hours by employee, job code, and pay period.",
        scope: "Employee",
        cadence: "Payroll",
        columns: ["Employee", "Job code", "Regular", "Overtime", "Total hours"],
        rows: [
          ["John Doe", "Manager", "40.00", "2.50", "42.50"],
          ["Asha Sharma", "Cashier", "38.25", "0.00", "38.25"],
          ["Bibek Gurung", "Server", "36.75", "1.25", "38.00"],
        ],
      },
    ],
  },
];

const scopeIcons: Record<string, typeof UserRound> = {
  Employee: UserRound,
  Property: Landmark,
  "Check detail area": ReceiptText,
  "Revenue center": Table2,
};

const detailedBusinessReports = [
  { href: "/reports/detail/sales", title: "Sales Report", description: "Invoices, customer, cashier, payment, and grand total." },
  { href: "/reports/detail/product-sales", title: "Product Report", description: "Product sold quantity, revenue, and profit." },
  { href: "/reports/detail/inventory", title: "Inventory Report", description: "Current stock, stock in/out, and low stock status." },
  { href: "/reports/detail/profit", title: "Profit Report", description: "Sales, cost, gross profit, and margin." },
  { href: "/reports/detail/payment", title: "Payment Report", description: "Cash, eSewa, Khalti, card, and QR totals." },
  { href: "/reports/detail/cashier", title: "Cashier Report", description: "Sales by staff, orders, voids, and collections." },
  { href: "/reports/detail/expense", title: "Expense Report", description: "Expense entries and category totals." },
  { href: "/reports/detail/tax", title: "Tax Report", description: "Taxable sales and tax collected." },
  { href: "/reports/detail/discount", title: "Discount Report", description: "Discount totals by sale and cashier." },
  { href: "/reports/detail/monthly", title: "Monthly Report", description: "Monthly sales, orders, profit, expenses, and payments." },
];

export function ReportsDashboard() {
  const [activeGroupId, setActiveGroupId] = useState(reportGroups[0].id);
  const [selectedReportName, setSelectedReportName] = useState(reportGroups[0].reports[0].name);
  const [query, setQuery] = useState("");

  const activeGroup = reportGroups.find((group) => group.id === activeGroupId) ?? reportGroups[0];
  const allReports = useMemo(
    () => reportGroups.flatMap((group) => group.reports.map((report) => ({ ...report, groupName: group.name, groupId: group.id }))),
    [],
  );
  const selectedReport = allReports.find((report) => report.name === selectedReportName) ?? allReports[0];
  const filteredReports = activeGroup.reports.filter((report) => {
    const search = query.trim().toLowerCase();
    if (!search) return true;
    return [report.name, report.description, report.scope].some((value) => value.toLowerCase().includes(search));
  });
  const totalReports = reportGroups.reduce((total, group) => total + group.reports.length, 0);
  const activeGroupIndex = reportGroups.findIndex((group) => group.id === activeGroup.id) + 1;

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

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Catalog</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{totalReports} reports</p>
              </div>
              <FileSpreadsheet className="size-9 text-emerald-600" />
            </div>
          </div>

          <nav className="space-y-2">
            {reportGroups.map((group) => {
              const Icon = group.icon;
              const active = group.id === activeGroup.id;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setActiveGroupId(group.id);
                    setSelectedReportName(group.reports[0].name);
                    setQuery("");
                  }}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition",
                    active
                      ? "border-emerald-300 bg-white shadow-sm ring-1 ring-emerald-100"
                      : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white",
                  )}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{group.name}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">{group.reports.length} reports</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detailed Pages</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">Business Reports</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Open a full-page report with date range filters, printable rows, totals, and CSV export.</p>
              </div>
              <Receipt className="hidden size-9 text-emerald-600 sm:block" />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {detailedBusinessReports.map((report) => (
                <Link
                  key={report.href}
                  href={report.href}
                  className="rounded-lg border border-slate-200 p-3 transition hover:border-emerald-300 hover:bg-emerald-50/40"
                >
                  <p className="text-sm font-semibold text-slate-900">{report.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{report.description}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span>Group {activeGroupIndex}</span>
                  <span className="text-slate-300">/</span>
                  <span>{activeGroup.reports.length} reports</span>
                </div>
                <h2 className="mt-2 text-xl font-bold text-slate-900">{activeGroup.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{activeGroup.summary}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:w-[520px]">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">From</span>
                  <input className="input" type="date" defaultValue="2026-05-01" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">To</span>
                  <input className="input" type="date" defaultValue="2026-05-15" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">Scope</span>
                  <select className="input" defaultValue="main-branch">
                    <option value="main-branch">Main Branch</option>
                    <option value="all-property">All Property</option>
                    <option value="employee">Employee</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-3">
              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="relative md:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-9"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search reports"
                    type="search"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="size-4" />
                  Filters
                </Button>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {filteredReports.map((report) => {
                  const selected = report.name === selectedReport.name;
                  const ScopeIcon = scopeIcons[report.scope] ?? BarChart3;

                  return (
                    <Link
                      key={report.name}
                      href={`/reports/${reportSlug(report.name)}`}
                      onMouseEnter={() => setSelectedReportName(report.name)}
                      onFocus={() => setSelectedReportName(report.name)}
                      className={cn(
                        "rounded-lg border bg-white p-4 text-left shadow-sm transition",
                        selected ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200 hover:border-slate-300 hover:shadow-md",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900">{report.name}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{report.description}</p>
                        </div>
                        {selected ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" /> : <Maximize2 className="size-4 shrink-0 text-slate-400" />}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                          <ScopeIcon className="size-3.5" />
                          {report.scope}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                          <CalendarClock className="size-3.5" />
                          {report.cadence}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{selectedReport.groupName}</p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{selectedReport.name}</h2>
                </div>
                <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <FileSpreadsheet className="size-5" />
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">{selectedReport.description}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Scope</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedReport.scope}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Cadence</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedReport.cadence}</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Report Columns</p>
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                  {selectedReport.columns.map((column, index) => (
                    <div
                      key={column}
                      className={cn(
                        "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                        index % 2 === 0 ? "bg-white" : "bg-slate-50",
                      )}
                    >
                      <span className="font-medium text-slate-700">{column}</span>
                      <span className="text-xs text-slate-400">Column {index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <Button className="flex-1" render={<Link href={`/reports/${reportSlug(selectedReport.name)}`} />}>
                  <BarChart3 className="size-4" />
                  Open Detail Page
                </Button>
                <Button variant="outline" size="icon" aria-label="Export selected report">
                  <Download className="size-4" />
                </Button>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
