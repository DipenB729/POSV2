"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Store className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Foodigo POS</p>
            <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
          </div>
        </div>

        <form className="space-y-4" onSubmit={(event) => void login(event)}>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Email</span>
            <input className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Password</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {message ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p> : null}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            <LockKeyhole className="size-4" />
            {isSubmitting ? "Signing in" : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}
