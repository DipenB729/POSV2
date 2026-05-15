"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronRight,
  Home,
  LogOut,
  PackageSearch,
  Settings,
  Store,
  Utensils,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Terminal", href: "/terminal", icon: Utensils },
  { label: "Products", href: "/products", icon: PackageSearch },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="grid h-full w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200 bg-slate-50 lg:flex lg:flex-col">
          <Link href="/" className="flex h-16 items-center gap-3 px-6 border-b border-slate-200">
            <span className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25">
              <Store className="size-5" />
            </span>
            <div>
              <span className="text-base font-bold text-slate-900">Foodigo</span>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">POS System</p>
            </div>
          </Link>
          <nav className="flex-1 space-y-1.5 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    active
                      ? "flex h-11 items-center justify-between rounded-lg bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : "flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all duration-200"
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`size-[18px] ${active ? 'text-emerald-600' : ''}`} />
                    {item.label}
                  </div>
                  {active && <ChevronRight className="size-4 text-slate-400" />}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-slate-200">
            <div className="rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-900">Store Status</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                </span>
                <p className="text-xs text-slate-600">Online & Active</p>
              </div>
            </div>
          </div>
          <Link href="/" className="flex h-12 items-center gap-3 px-6 text-sm font-medium text-slate-500 hover:text-slate-900 border-t border-slate-200">
            <LogOut className="size-4" />
            Sign Out
          </Link>
        </aside>

        <section className="min-w-0 overflow-y-auto bg-slate-50/50 px-5 py-5 md:px-8">{children}</section>
      </div>
    </main>
  );
}

export function AppHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-4">
        <Link className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 text-slate-600 lg:hidden" href="/">
          <Home className="size-5" />
        </Link>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{eyebrow}</p>
            <span className="text-slate-300">•</span>
            <p className="text-xs text-slate-400">Main Branch</p>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {action}
        <button className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 text-slate-500 hover:text-slate-700 hover:shadow-md transition-all duration-200">
          <Bell className="size-4" />
        </button>
        <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200">
          <div className="size-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
            JD
          </div>
          <div className="hidden text-sm sm:block leading-tight">
            <p className="font-semibold text-slate-900">John Doe</p>
            <p className="text-xs text-slate-500">Store Manager</p>
          </div>
        </div>
      </div>
    </header>
  );
}
