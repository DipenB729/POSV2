import { Activity, Banknote, Boxes, CreditCard, ReceiptText, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";

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
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Enterprise POS</p>
            <h1 className="text-2xl font-semibold tracking-normal">Checkout Console</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="lg">
              <Activity className="size-4" />
              Shift Open
            </Button>
            <Button size="lg">
              <ReceiptText className="size-4" />
              New Sale
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Metric icon={Banknote} label="Today Revenue" value="Rs 84,520" />
            <Metric icon={ShoppingCart} label="Transactions" value="138" />
            <Metric icon={Boxes} label="Low Stock" value="7 SKUs" />
          </div>

          <div className="rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold">Product Register</h2>
              <Button variant="outline" size="sm">
                Scan Barcode
              </Button>
            </div>
            <div className="divide-y">
              {products.map((product) => (
                <div
                  key={product.sku}
                  className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 sm:grid-cols-[1fr_120px_90px_auto] sm:items-center"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.sku}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Stock {product.stock}</p>
                  <p className="font-medium">{product.price}</p>
                  <Button variant="outline" size="sm">
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="rounded-lg border bg-white">
          <div className="border-b px-5 py-4">
            <h2 className="text-base font-semibold">Current Cart</h2>
            <p className="text-sm text-muted-foreground">Counter A, cashier session active</p>
          </div>
          <div className="divide-y">
            {cart.map((line) => (
              <div key={line.name} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium">{line.name}</p>
                  <p className="text-sm text-muted-foreground">Qty {line.qty}</p>
                </div>
                <p className="font-semibold">{line.total}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t px-5 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>Rs 780</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>Rs 101</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>Rs 881</span>
            </div>
            <Button className="w-full" size="lg">
              <CreditCard className="size-4" />
              Pay with PhonePe QR
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="mb-4 flex size-9 items-center justify-center rounded-md bg-slate-900 text-white">
        <Icon className="size-4" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
