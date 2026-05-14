import { BadgeCheck, Building2, FileText, KeyRound, Mail, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { AppHeader } from "@/components/app-shell";

const tabs = [
  { title: "Store Info", icon: Building2, detail: "Business identity, address, currency, timezone, and logo." },
  { title: "Tax Rates", icon: BadgeCheck, detail: "Default tax rules and product-level tax overrides." },
  { title: "Users", icon: Users, detail: "Role assignment for SUPER_ADMIN, ADMIN, MANAGER, CASHIER, and INVENTORY_CLERK." },
  { title: "Payment Methods", icon: KeyRound, detail: "Cash and PhonePe QR configuration. Card remains disabled until a processor is added." },
  { title: "Receipt Template", icon: ReceiptText, detail: "Receipt header, footer, tax labels, and email copy." },
  { title: "Integrations", icon: Mail, detail: "SMTP, storage, Redis jobs, PhonePe credentials, and export destinations." },
  { title: "Audit Logs", icon: ShieldCheck, detail: "Sensitive mutation history with user, action, entity, IP, before, and after snapshots." },
  { title: "Exports", icon: FileText, detail: "CSV export presets for inventory, sales, refunds, and customer reports." },
];

export function SettingsDashboard() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader eyebrow="Enterprise Settings" title="Administration" />
      <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <section key={tab.title} className="rounded-lg border bg-white p-5">
              <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-slate-900 text-white">
                <Icon className="size-4" />
              </div>
              <h2 className="font-semibold">{tab.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{tab.detail}</p>
            </section>
          );
        })}
      </div>
    </main>
  );
}
