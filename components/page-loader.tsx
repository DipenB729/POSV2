import { Store } from "lucide-react";

export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center bg-[#fbfffd] text-[#16251f]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex size-16 items-center justify-center">
          <span className="absolute inset-0 rounded-2xl border-4 border-emerald-100" />
          <span className="absolute inset-0 animate-spin rounded-2xl border-4 border-transparent border-t-emerald-500" />
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <Store className="size-5" />
          </span>
        </div>
        <p className="text-sm font-bold text-emerald-700">{label}</p>
      </div>
    </div>
  );
}
