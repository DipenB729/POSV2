import { receiptQueue } from "@/server/jobs/sales.queue";

export async function enqueueReceiptEmail(input: {
  saleId: string;
  customerEmail?: string;
}) {
  if (!input.customerEmail) {
    return null;
  }

  return receiptQueue.add("send-receipt-email", input, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  });
}
