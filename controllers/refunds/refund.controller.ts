import type { NextRequest } from "next/server";

import { fail, ok } from "@/controllers/http";
import { requireRole } from "@/lib/auth/roles";
import * as RefundModel from "@/models/refunds/refund.model";
import { createRefundSchema } from "@/schemas/refunds/refund.schema";
import { refundPhonePePayment } from "@/src/lib/phonepe";

export async function create(request: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]);
    const payload = createRefundSchema.parse(await request.json());
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
    let metadata: Record<string, unknown> | null = null;

    if (payload.method === "PHONEPE_QR") {
      if (!payload.originalTransactionId) {
        return fail(new Error("Original PhonePe transaction ID is required"), 400);
      }

      const merchantTransactionId = crypto.randomUUID();
      const phonePe = await refundPhonePePayment({
        merchantTransactionId,
        originalTransactionId: payload.originalTransactionId,
        amountRupees: payload.amount,
      });
      metadata = {
        provider: "PHONEPE",
        merchantTransactionId,
        originalTransactionId: payload.originalTransactionId,
        response: phonePe,
      };
    }

    const { data, error } = await RefundModel.createRefund(payload, metadata, ip);

    if (error) {
      throw error;
    }

    return ok({ refundId: data });
  } catch (error) {
    return fail(error);
  }
}
