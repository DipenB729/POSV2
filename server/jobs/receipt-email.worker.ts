import { Worker } from "bullmq";

import { redisConnection } from "@/server/jobs/redis";
import { logger } from "@/server/logging/logger";
import type { ReceiptJob } from "@/server/jobs/sales.queue";

export const receiptEmailWorker = new Worker<ReceiptJob>(
  "receipts",
  async (job) => {
    logger.info("Receipt email job queued", {
      saleId: job.data.saleId,
      customerEmail: job.data.customerEmail,
    });

    // Wire SMTP delivery here using SMTP_HOST, SMTP_USER, and SMTP_PASS.
    return { sent: Boolean(job.data.customerEmail) };
  },
  {
    connection: redisConnection,
  },
);
