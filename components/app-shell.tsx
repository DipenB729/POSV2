"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Boxes,
  HelpCircle,
  Home,
  LogOut,
  PackageSearch,
  Settings,
  Store,
  Utensils,
} from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Menu", href: "/terminal", icon: Utensils },
  { label: "Products", href: "/products", icon: PackageSearch },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help Center", href: "/", icon: HelpCircle },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#eaf8f1] text-[#16251f]">
      <div className="grid h-full w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden border-r border-emerald-100 bg-white lg:flex lg:flex-col">
          <Link href="/" className="flex h-20 items-center gap-2 px-7">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <Store className="size-5" />
            </span>
            <span className="text-lg font-bold">Foodigo</span>
          </Link>
          <nav className="space-y-1 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    active
                      ? "flex h-11 items-center gap-3 rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-700"
                      : "flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link href="/" className="mt-auto flex h-14 items-center gap-3 px-8 text-sm font-medium text-slate-500 hover:text-slate-900">
            <LogOut className="size-4" />
            Logout
          </Link>
        </aside>

        <section className="min-w-0 overflow-y-auto bg-[#fbfffd] px-4 py-5 md:px-7">{children}</section>
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
    <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-3">
        <Link className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white lg:hidden" href="/">
          <Home className="size-5" />
        </Link>
        <div>
          <p className="text-sm font-semibold text-slate-500">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold">{title}</h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {action}
        <button className="flex size-11 items-center justify-center rounded-xl border border-emerald-100 bg-white text-slate-600">
          <Bell className="size-4" />
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-3 py-2">
          <div className="size-8 rounded-full bg-[linear-gradient(135deg,#f7b267,#f79d65)]" />
          <div className="hidden text-sm sm:block">
            <p className="font-semibold">John Doe</p>
            <p className="text-xs text-slate-400">Cashier</p>
          </div>
        </div>
      </div>
    </header>
  );
}
