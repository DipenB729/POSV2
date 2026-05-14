"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-lg border bg-white p-6">
        <p className="text-sm text-muted-foreground">Application Error</p>
        <h1 className="mt-1 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-5" onClick={reset}>
          Try Again
        </Button>
      </section>
    </main>
  );
}
