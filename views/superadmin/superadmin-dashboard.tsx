"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, RefreshCw, ShieldCheck, Store, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

type StoreOption = {
  id: string;
  name: string;
};

type AdminUser = {
  id: string;
  name: string;
  role: "ADMIN";
  store_id: string | null;
  is_active: boolean;
  created_at: string;
  stores?: { name: string } | null;
};

type AdminPayload = {
  admins: AdminUser[];
  stores: StoreOption[];
};

export function SuperAdminDashboard() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeId, setStoreId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    void loadAdmins();
  }, []);

  async function loadAdmins() {
    setIsLoading(true);
    const headers = await getAuthHeaders();
    const response = await fetch("/api/superadmin/admins", { cache: "no-store", headers });
    const payload = (await response.json()) as { ok: boolean; data?: AdminPayload; error?: string };
    setIsLoading(false);

    if (!payload.ok) {
      setMessageType("error");
      setMessage(payload.error ?? "Unable to load admins");
      return;
    }

    setAdmins(payload.data?.admins ?? []);
    setStores(payload.data?.stores ?? []);
  }

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setMessage("");
    const authHeaders = await getAuthHeaders();

    const response = await fetch("/api/superadmin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        name,
        email,
        password,
        storeId: storeId || null,
      }),
    });
    const payload = (await response.json()) as { ok: boolean; data?: AdminUser; error?: string };
    setIsCreating(false);

    if (!payload.ok) {
      setMessageType("error");
      setMessage(payload.error ?? "Unable to create admin");
      return;
    }

    setMessageType("success");
    setMessage("Admin user created");
    setName("");
    setEmail("");
    setPassword("");
    setStoreId("");
    await loadAdmins();
  }

  async function setAdminActive(admin: AdminUser, isActive: boolean) {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(`/api/superadmin/admins/${admin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ isActive }),
    });
    const payload = (await response.json()) as { ok: boolean; error?: string };

    if (!payload.ok) {
      setMessageType("error");
      setMessage(payload.error ?? "Unable to update admin");
      return;
    }

    await loadAdmins();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Superadmin</p>
              <h1 className="text-lg font-bold">Admin Management</h1>
            </div>
          </div>
          <Button variant="outline" render={<Link href="/auth/sign-out" />}>
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <UserPlus className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold">Create Admin</h2>
              <p className="text-sm text-slate-500">Admins get access to the POS system.</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={(event) => void createAdmin(event)}>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Name</span>
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Email</span>
              <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Temporary Password</span>
              <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Store</span>
              <select className="input" value={storeId} onChange={(event) => setStoreId(event.target.value)}>
                <option value="">No store assigned</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
            <Button className="w-full" type="submit" disabled={isCreating}>
              <UserPlus className="size-4" />
              {isCreating ? "Creating" : "Create Admin"}
            </Button>
          </form>

          {message ? (
            <p className={messageType === "success" ? "mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700" : "mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"}>
              {message}
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Admins</p>
              <h2 className="mt-1 text-xl font-bold">POS Admin Users</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadAdmins()} disabled={isLoading}>
              <RefreshCw className={isLoading ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {admins.length > 0 ? (
              admins.map((admin) => (
                <article key={admin.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-slate-400" />
                      <h3 className="font-semibold text-slate-900">{admin.name}</h3>
                      <span className={admin.is_active ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" : "rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"}>
                        {admin.is_active ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                      <Store className="size-3.5" />
                      {admin.stores?.name ?? "No store assigned"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void setAdminActive(admin, !admin.is_active)}>
                    {admin.is_active ? "Disable" : "Enable"}
                  </Button>
                </article>
              ))
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">No admin users found.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

async function getAuthHeaders() {
  return {};
}
