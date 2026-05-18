"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, QrCode, RefreshCw, Save, Store, UploadCloud } from "lucide-react";

import { AppHeader, AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

type ScannerSettings = {
  qrImageUrl: string | null;
  merchantName: string | null;
  updatedAt?: string | null;
};

export function SettingsDashboard() {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState("Dipen Store");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedPreviewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    void loadScannerSettings();
  }, []);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  async function loadScannerSettings() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/settings/payment-scanner", { cache: "no-store" });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: ScannerSettings;
        error?: string;
      };

      if (!payload.ok) {
        setMessageType("error");
        setMessage(payload.error ?? "Unable to load scanner settings");
        return;
      }

      setQrImageUrl(payload.data?.qrImageUrl ?? null);
      setMerchantName(payload.data?.merchantName ?? "Dipen Store");
      setUpdatedAt(payload.data?.updatedAt ?? null);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to load scanner settings");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveScannerSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!merchantName.trim()) {
      setMessageType("error");
      setMessage("Merchant name is required");
      return;
    }

    if (!selectedFile && !qrImageUrl) {
      setMessageType("error");
      setMessage("Upload your eSewa QR image first");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const body = new FormData();
      body.append("merchantName", merchantName);
      if (selectedFile) body.append("file", selectedFile);

      const response = await fetch("/api/settings/payment-scanner", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: ScannerSettings;
        error?: string;
      };

      if (!payload.ok) {
        setMessageType("error");
        setMessage(payload.error ?? "Unable to save scanner settings");
        return;
      }

      setQrImageUrl(payload.data?.qrImageUrl ?? null);
      setMerchantName(payload.data?.merchantName ?? "Dipen Store");
      setUpdatedAt(payload.data?.updatedAt ?? null);
      setSelectedFile(null);
      setMessageType("success");
      setMessage("eSewa QR scanner settings saved");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to save scanner settings");
    } finally {
      setIsSaving(false);
    }
  }

  const previewUrl = selectedPreviewUrl ?? qrImageUrl;

  return (
    <AppShell>
      <AppHeader eyebrow="Settings" title="Administration" />

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Payment Settings</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">eSewa QR Scanner</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Configure the QR image shown during terminal checkout for eSewa QR payments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadScannerSettings()} disabled={isLoading || isSaving}>
              <RefreshCw className={isLoading ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </Button>
            <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <QrCode className="size-4" />
              Active Setting
            </span>
          </div>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <form className="space-y-5" onSubmit={(event) => void saveScannerSettings(event)}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">Merchant Name</span>
                <div className="relative">
                  <Store className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-9"
                    placeholder="Merchant name"
                    value={merchantName}
                    onChange={(event) => setMerchantName(event.target.value)}
                    disabled={isLoading || isSaving}
                  />
                </div>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">QR Image</span>
                <span className="flex h-10 cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 transition hover:bg-slate-50">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <ImagePlus className="size-4 shrink-0 text-slate-400" />
                    <span className="truncate">{selectedFile ? selectedFile.name : qrImageUrl ? "Replace QR image" : "Upload QR image"}</span>
                  </span>
                  <UploadCloud className="size-4 shrink-0 text-slate-400" />
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    disabled={isLoading || isSaving}
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  />
                </span>
              </label>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
                  {qrImageUrl ? <CheckCircle2 className="size-4 text-emerald-600" /> : <QrCode className="size-4 text-slate-400" />}
                  {qrImageUrl ? "Scanner is configured" : "Scanner image required"}
                </span>
                {updatedAt ? <span className="text-slate-500">Updated {new Date(updatedAt).toLocaleString()}</span> : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This setting is used by the terminal checkout screen when the customer chooses eSewa QR payment.
              </p>
            </div>

            {message ? (
              <p className={messageType === "success" ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-red-600"}>
                {message}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isLoading || isSaving}>
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {isSaving ? "Saving" : "Save Settings"}
              </Button>
              {selectedFile ? (
                <Button type="button" variant="outline" onClick={() => setSelectedFile(null)} disabled={isSaving}>
                  Cancel Upload
                </Button>
              ) : null}
            </div>
          </form>

          <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="mx-auto size-48 rounded-lg bg-white object-contain p-2" src={previewUrl} alt="eSewa QR scanner" />
              ) : (
                <div className="mx-auto grid size-40 grid-cols-5 gap-1 rounded-lg bg-white p-3">
                  {Array.from({ length: 25 }, (_, index) => (
                    <span
                      key={index}
                      className={[0, 1, 4, 6, 8, 10, 12, 14, 16, 18, 20, 23, 24].includes(index) ? "rounded-sm bg-slate-900" : "rounded-sm bg-slate-100"}
                    />
                  ))}
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-sm font-semibold text-slate-900">{selectedFile ? "New QR Preview" : qrImageUrl ? "Saved QR Image" : "No QR Uploaded"}</p>
            <p className="mt-1 text-center text-xs leading-5 text-slate-500">{merchantName || "Merchant name"}</p>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
