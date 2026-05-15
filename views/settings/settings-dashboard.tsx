"use client";

import { FormEvent, useEffect, useState } from "react";
import { BadgeCheck, Building2, FileText, ImagePlus, KeyRound, Mail, QrCode, ReceiptText, ScanLine, ShieldCheck, Users } from "lucide-react";

import { AppHeader, AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

const tabs = [
  { title: "Store Info", icon: Building2, detail: "Business identity, address, currency, timezone, and logo." },
  { title: "Tax Rates", icon: BadgeCheck, detail: "Default tax rules and product-level tax overrides." },
  { title: "Users", icon: Users, detail: "Role assignment for SUPER_ADMIN, ADMIN, MANAGER, CASHIER, and INVENTORY_CLERK." },
  { title: "Payment Methods", icon: KeyRound, detail: "Cash and eSewa QR configuration. Card remains disabled until a processor is added." },
  { title: "Scanner", icon: ScanLine, detail: "eSewa QR scanner opens first when charging an order from the terminal." },
  { title: "Receipt Template", icon: ReceiptText, detail: "Receipt header, footer, tax labels, and email copy." },
  { title: "Integrations", icon: Mail, detail: "SMTP, storage, Redis jobs, eSewa credentials, and export destinations." },
  { title: "Audit Logs", icon: ShieldCheck, detail: "Sensitive mutation history with user, action, entity, IP, before, and after snapshots." },
  { title: "Exports", icon: FileText, detail: "CSV export presets for inventory, sales, refunds, and customer reports." },
];

export function SettingsDashboard() {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState("Dipen Store");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    void loadScannerSettings();
  }, []);

  async function loadScannerSettings() {
    const response = await fetch("/api/settings/payment-scanner", { cache: "no-store" });
    const payload = (await response.json()) as {
      ok: boolean;
      data?: { qrImageUrl: string | null; merchantName: string | null };
      error?: string;
    };

    if (payload.ok) {
      setQrImageUrl(payload.data?.qrImageUrl ?? null);
      setMerchantName(payload.data?.merchantName ?? "Dipen Store");
    }
  }

  async function saveScannerSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile && !qrImageUrl) {
      setMessage("Upload your eSewa QR image first");
      return;
    }

    setIsUploading(true);
    setMessage("");

    const body = new FormData();
    body.append("merchantName", merchantName);
    if (selectedFile) {
      body.append("file", selectedFile);
    }

    const response = await fetch("/api/settings/payment-scanner", {
      method: "POST",
      body,
    });
    const payload = (await response.json()) as {
      ok: boolean;
      data?: { qrImageUrl: string | null; merchantName: string | null };
      error?: string;
    };

    setIsUploading(false);

    if (!payload.ok) {
      setMessage(payload.error ?? "Unable to upload scanner");
      return;
    }

    setQrImageUrl(payload.data?.qrImageUrl ?? null);
    setMerchantName(payload.data?.merchantName ?? "Dipen Store");
    setSelectedFile(null);
    setMessage("eSewa QR scanner saved to database");
  }

  return (
    <AppShell>
      <AppHeader eyebrow="Enterprise Settings" title="Administration" />
      <section className="mb-5 rounded-[20px] border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_240px] lg:items-center">
          <div>
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <QrCode className="size-5" />
            </div>
            <h2 className="text-lg font-black">eSewa QR Scanner</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Upload your eSewa QR image. It is stored in Supabase and shown at checkout. Payment confirmation remains manual until eSewa API integration is added.</p>
            <form className="mt-5 grid max-w-2xl gap-3 sm:grid-cols-[1fr_auto_auto]" onSubmit={(event) => void saveScannerSettings(event)}>
              <input
                className="input h-11"
                placeholder="Merchant name"
                value={merchantName}
                onChange={(event) => setMerchantName(event.target.value)}
              />
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-emerald-50">
                <ImagePlus className="size-4" />
                {selectedFile ? selectedFile.name : "Upload eSewa QR"}
                <input className="hidden" type="file" accept="image/*" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
              </label>
              <Button className="h-11 rounded-full px-5" type="submit" disabled={isUploading}>
                {isUploading ? "Saving..." : "Save Scanner"}
              </Button>
            </form>
            {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
          </div>
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-4 text-center">
            {qrImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="mx-auto size-36 rounded-xl bg-white object-contain p-2 shadow-sm" src={qrImageUrl} alt="eSewa QR scanner" />
            ) : (
              <div className="mx-auto grid size-28 grid-cols-5 gap-1 rounded-xl bg-white p-2">
                {Array.from({ length: 25 }, (_, index) => (
                  <span key={index} className={[0, 1, 4, 6, 8, 10, 12, 14, 16, 18, 20, 23, 24].includes(index) ? "rounded-sm bg-emerald-950" : "rounded-sm bg-emerald-100"} />
                ))}
              </div>
            )}
            <p className="mt-3 text-sm font-bold text-emerald-700">{qrImageUrl ? "eSewa QR Saved" : "eSewa QR Required"}</p>
          </div>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <section key={tab.title} className="rounded-[20px] border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-950/10">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <Icon className="size-4" />
              </div>
              <h2 className="font-semibold">{tab.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{tab.detail}</p>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
