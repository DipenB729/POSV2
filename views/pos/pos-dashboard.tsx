import { Activity, Banknote, Boxes, CreditCard, ReceiptText, ShoppingCart, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppHeader, AppShell } from "@/components/app-shell";

const products = [
  { name: "Americano", sku: "DRK-101", stock: 48, price: "Rs 180" },
  { name: "Chicken Momo", sku: "FOD-214", stock: 22, price: "Rs 260" },
  { name: "Veg Chowmein", sku: "FOD-188", stock: 16, price: "Rs 220" },
  { name: "Mineral Water", sku: "DRK-019", stock: 96, price: "Rs 40" },
];

const cart = [
  { name: "Chicken Momo", qty: 2, total: "Rs 520" },
  { name: "Americano", qty: 1, total: "Rs 180" },
  { name: "Mineral Water", qty: 2, total: "Rs 80" },
];

export function PosDashboard() {
  return (
    <AppShell>
      <AppHeader
        eyebrow="Terminal"
        title="Checkout Console"
        action={
          <>
            <Button variant="outline" size="lg" className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900">
              <Activity className="size-4" />
              Open Shift
            </Button>
            <Button size="lg" className="gap-2 bg-slate-900 hover:bg-slate-800">
              <ReceiptText className="size-4" />
              New Sale
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Metric icon={Banknote} label="Today's Revenue" value="Rs 84,520" change="+12.5%" trend="up" />
            <Metric icon={ShoppingCart} label="Transactions" value="138" change="+8.2%" trend="up" />
            <Metric icon={Boxes} label="Low Stock" value="7 SKUs" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-slate-900">Product Register</h2>
                <p className="text-sm text-slate-500">Select items to add to cart</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <div className="size-3 bg-slate-400 rounded-sm" />
                Scan Barcode
              </Button>
            </div>
            <div className="divide-y divide-slate-50">
              {products.map((product) => (
                <div
                  key={product.sku}
                  className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 hover:bg-slate-50 transition-colors sm:grid-cols-[1fr_120px_90px_auto] sm:items-center cursor-pointer"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="text-sm text-slate-500">{product.sku}</p>
                  </div>
                  <p className="text-sm text-slate-500">Stock: {product.stock}</p>
                  <p className="font-bold text-slate-900">{product.price}</p>
                  <Button variant="outline" size="sm" className="bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:border-slate-800">
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                Counter A
              </div>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-2">Current Cart</h2>
            <p className="text-sm text-slate-500">3 items • Cashier: John Doe</p>
          </div>
          <div className="divide-y divide-slate-50">
            {cart.map((line) => (
              <div key={line.name} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-semibold text-slate-900">{line.name}</p>
                  <p className="text-sm text-slate-500">Qty: {line.qty}</p>
                </div>
                <p className="font-bold text-slate-900">{line.total}</p>
              </div>
            ))}
          </div>
          <div className="space-y-4 border-t border-slate-100 px-5 py-5 bg-slate-50/50">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-900">Rs 780</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Tax (13%)</span>
              <span className="font-medium text-slate-900">Rs 101</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-slate-200 pt-4">
              <span className="text-slate-900">Total</span>
              <span className="text-emerald-600">Rs 881</span>
            </div>
            <Button className="w-full h-12 text-base font-semibold gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-600 shadow-lg shadow-emerald-500/25">
              <CreditCard className="size-5" />
              Pay with PhonePe QR
            </Button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  change,
  trend,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
          <Icon className="size-5" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {trend === 'up' ? <TrendingUp className="size-3" /> : null}
            {change}
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
