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
  Store,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-shell";

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
    <main className="min-h-screen bg-[#f7f8fa] text-foreground">
      <AppHeader
        eyebrow="Main Branch"
        title="POS System"
        action={
          <Link
            href="/terminal"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            <ReceiptText className="size-4" />
            New Sale
          </Link>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
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
                    className="group rounded-lg border bg-white p-4 transition hover:border-slate-400 hover:shadow-sm"
                  >
                    <div className={`mb-5 flex size-10 items-center justify-center rounded-md ${item.tone}`}>
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

            <div className="rounded-lg border bg-white">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <h2 className="font-semibold">Open Work</h2>
                  <p className="text-sm text-muted-foreground">Today</p>
                </div>
                <Link
                  href="/inventory"
                  className="inline-flex h-7 items-center rounded-lg border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
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

          <aside className="rounded-lg border bg-white">
            <div className="flex items-center gap-2 border-b px-5 py-4">
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
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof WalletCards; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-4 flex size-9 items-center justify-center rounded-md bg-slate-100 text-slate-950">
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
