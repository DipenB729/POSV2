import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Building2,
  ChevronRight,
  ClipboardList,
  PackageSearch,
  ReceiptText,
  Settings,
  ShoppingCart,
  WalletCards,
} from "lucide-react";

import { AppHeader, AppShell } from "@/components/app-shell";

const modules = [
  { label: "Terminal", href: "/terminal", icon: ShoppingCart, metric: "Open counter", tone: "bg-slate-950 text-white" },
  { label: "Products", href: "/products", icon: PackageSearch, metric: "Catalog", tone: "bg-emerald-700 text-white" },
  { label: "Inventory", href: "/inventory", icon: Boxes, metric: "Stock control", tone: "bg-amber-600 text-white" },
  { label: "Reports", href: "/reports", icon: BarChart3, metric: "Analytics", tone: "bg-indigo-700 text-white" },
  { label: "Settings", href: "/settings", icon: Settings, metric: "Admin", tone: "bg-zinc-700 text-white" },
];

const activity = [
  { label: "Counter A shift opened", time: "09:00", value: "Active" },
  { label: "PhonePe settlement check", time: "10:15", value: "Pending" },
  { label: "Inventory adjustment posted", time: "11:05", value: "Approved" },
  { label: "Receipt email queue", time: "11:30", value: "3 jobs" },
];

export function MainDashboard() {
  return (
    <AppShell>
      <AppHeader
        eyebrow="Main Branch"
        title="POS System"
        action={
          <Link
            href="/terminal"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 text-sm font-bold text-white hover:bg-emerald-600"
          >
            <ReceiptText className="size-4" />
            New Sale
          </Link>
        }
      />

      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={WalletCards} label="Revenue Today" value="Rs 84,520" />
          <Metric icon={ReceiptText} label="Orders" value="138" />
          <Metric icon={AlertTriangle} label="Low Stock" value="7" />
          <Metric icon={Building2} label="Active Store" value="Main" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {modules.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-[20px] border border-emerald-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-950/10"
                  >
                    <div className={`mb-5 flex size-10 items-center justify-center rounded-xl ${item.tone}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.metric}</p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-[20px] border border-emerald-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-emerald-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold">Open Work</h2>
                  <p className="text-sm text-muted-foreground">Today</p>
                </div>
                <Link
                  href="/inventory"
                  className="inline-flex h-9 items-center rounded-full border border-emerald-200 px-3 text-[0.8rem] font-bold text-emerald-700 hover:bg-emerald-50"
                >
                  Review Stock
                </Link>
              </div>
              <div className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
                <WorkItem label="Orders waiting payment" value="4" />
                <WorkItem label="Products below reorder" value="7" />
                <WorkItem label="Refunds awaiting review" value="2" />
              </div>
            </div>
          </div>

          <aside className="overflow-hidden rounded-[20px] border border-emerald-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-emerald-100 px-5 py-4">
              <ClipboardList className="size-4" />
              <h2 className="font-semibold">Activity</h2>
            </div>
            <div className="divide-y">
              {activity.map((item) => (
                <div key={`${item.time}-${item.label}`} className="grid grid-cols-[56px_1fr_auto] gap-3 px-5 py-4 text-sm">
                  <span className="text-muted-foreground">{item.time}</span>
                  <span>{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof WalletCards; label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <Icon className="size-4" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function WorkItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
