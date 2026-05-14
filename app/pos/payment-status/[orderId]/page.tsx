import Link from "next/link";

export default function PhonePePaymentStatusPage({
  params,
}: {
  params: {
    orderId: string;
  };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-lg border bg-white p-6 text-center">
        <p className="text-sm text-muted-foreground">PhonePe Payment</p>
        <h1 className="mt-1 text-2xl font-semibold">Return to POS Terminal</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Order {params.orderId} is being verified by the POS terminal. This tab can be closed after payment.
        </p>
        <Link
          href="/terminal"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Open Terminal
        </Link>
      </section>
    </main>
  );
}
