import Link from "next/link";
import { Home, PackageSearch, Settings, ShoppingCart, Boxes, BarChart3, Store } from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Terminal", href: "/terminal", icon: ShoppingCart },
  { label: "Products", href: "/products", icon: PackageSearch },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

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
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex size-10 items-center justify-center rounded-md bg-slate-950 text-white">
            <Store className="size-5" />
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">{eyebrow}</p>
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap items-center gap-1 rounded-lg border bg-white p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {action}
        </div>
      </div>
    </header>
  );
}
