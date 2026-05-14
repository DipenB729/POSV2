import { z } from "zod";

export const refundItemSchema = z.object({
  order_item_id: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const createRefundSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(3).max(500),
  method: z.enum(["CASH", "CARD", "PHONEPE_QR", "MOBILE_MONEY", "GIFT_CARD", "CREDIT"]),
  originalTransactionId: z.string().optional(),
  items: z.array(refundItemSchema).optional().default([]),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;
