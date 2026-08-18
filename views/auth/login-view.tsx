"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";

const demoCredentials = {
  email: "demo@foodigo.local",
  password: "FoodigoDemo123!",
};

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function useDemoCredentials() {
    setEmail(demoCredentials.email);
    setPassword(demoCredentials.password);
    setMessage("");
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] p-3 text-slate-950 sm:p-5 lg:p-8">
      <section className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1360px] overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_80px_rgba(21,45,36,0.14)] sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative hidden overflow-hidden bg-[#163d32] lg:block">
          <img src="/images/foodigo-login-hero.png" alt="A warm café counter ready for service" className="absolute inset-0 h-full w-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#102f27]/95 via-[#163d32]/55 to-[#163d32]/25" />
          <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
            <div className="flex items-center gap-3 text-white">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[#d8f36b] text-[#163d32] shadow-lg shadow-black/10"><Store className="size-5" /></span>
              <span className="text-lg font-bold tracking-[-0.03em]">foodigo</span>
            </div>
            <div className="max-w-lg text-white">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#d8f36b]">Your counter, in sync</p>
              <h2 className="text-5xl font-semibold leading-[1.04] tracking-[-0.06em] xl:text-6xl">Make every order feel effortless.</h2>
              <p className="mt-6 max-w-md text-base leading-7 text-white/70">A calmer way to run your store, serve your guests, and see what is happening in real time.</p>
              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/80">
                {['Fast checkout', 'Live inventory', 'Simple reports'].map((item) => <span key={item} className="flex items-center gap-2"><Check className="size-4 text-[#d8f36b]" />{item}</span>)}
              </div>
            </div>
            <p className="text-xs text-white/45">© 2026 Foodigo POS · Built for busy counters</p>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-[390px]">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#163d32] text-[#d8f36b]"><Store className="size-5" /></span>
              <span className="text-lg font-bold tracking-[-0.03em] text-[#163d32]">foodigo</span>
            </div>
            <div className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#789087]">Welcome back</p>
              <h1 className="text-4xl font-semibold tracking-[-0.055em] text-[#163d32]">Sign in to your store.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">Enter your details to continue to the Foodigo dashboard.</p>
            </div>

            <form className="space-y-5" onSubmit={(event) => void login(event)}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Email address</span>
                <span className="relative block"><Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="input h-12 rounded-xl pl-10" type="email" autoComplete="email" placeholder="you@yourstore.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></span>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <span className="relative block"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="input h-12 rounded-xl pl-10 pr-11" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span>
              </label>

              {message ? <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">{message}</p> : null}

              <Button className="h-12 w-full rounded-xl bg-[#163d32] text-sm font-semibold text-white shadow-lg shadow-[#163d32]/15 hover:bg-[#245747]" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in…" : "Sign in"}<ArrowRight className="size-4" />
              </Button>
            </form>

            <div className="mt-8 rounded-2xl border border-[#dbe8a9] bg-[#f5f9df] p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-semibold text-[#315141]">Need a quick test?</p><p className="mt-1 text-xs leading-5 text-[#60765c]">Use the demo account to explore the dashboard.</p></div>
                <button type="button" onClick={useDemoCredentials} className="shrink-0 rounded-lg bg-[#d8f36b] px-3 py-2 text-xs font-bold text-[#163d32] transition hover:bg-[#c9e55c]">Use demo</button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#60765c]"><span className="rounded-lg bg-white/70 px-2.5 py-2">Email<br /><strong className="font-semibold text-[#315141]">{demoCredentials.email}</strong></span><span className="rounded-lg bg-white/70 px-2.5 py-2">Password<br /><strong className="font-semibold text-[#315141]">{demoCredentials.password}</strong></span></div>
            </div>
            <p className="mt-8 text-center text-xs text-slate-400">Secure access for your team · Need help? Contact your admin</p>
          </div>
        </div>
      </section>
    </main>
  );
}
