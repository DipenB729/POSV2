import { BarChart3, Boxes, ReceiptText, RefreshCcw, Users, WalletCards } from "lucide-react";
import { AppHeader } from "@/components/app-shell";

const reports = [
  { label: "Sales Summary", value: "Revenue, tax, discounts, refunds", icon: WalletCards },
  { label: "Revenue by Period", value: "Day, week, month", icon: BarChart3 },
  { label: "Top Products", value: "Units sold and revenue", icon: ReceiptText },
  { label: "Inventory Valuation", value: "Cost and selling value", icon: Boxes },
  { label: "Cashier Performance", value: "Orders and baskets", icon: RefreshCcw },
  { label: "Customer Insights", value: "Spend and retention", icon: Users },
];

export function ReportsDashboard() {
  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <AppHeader eyebrow="Reports" title="Analytics" />
      <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <section key={report.label} className="rounded-lg border bg-white p-5">
              <div className="mb-5 flex size-10 items-center justify-center rounded-md bg-slate-950 text-white">
                <Icon className="size-5" />
              </div>
              <h2 className="font-semibold">{report.label}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{report.value}</p>
            </section>
          );
        })}
      </div>
    </main>
  );
}
