import { Queue } from "bullmq";

import { redisConnection } from "@/server/jobs/redis";

export type ReceiptJob = {
  saleId: string;
  customerEmail?: string;
};

export const receiptQueue = new Queue<ReceiptJob>("receipts", {
  connection: redisConnection,
});
