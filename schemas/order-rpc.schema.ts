import { z } from "zod";

export const posOrderItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive().optional(),
  tax_rate: z.number().min(0).optional(),
  discount: z.number().nonnegative().optional(),
}).superRefine((item, context) => {
  if (item.unit_price && (item.discount ?? 0) > item.unit_price * item.quantity) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Item discount cannot exceed line subtotal",
      path: ["discount"],
    });
  }
});

export const posOrderPaymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "PHONEPE_QR", "ESEWA_QR", "MOBILE_MONEY", "GIFT_CARD", "CREDIT"]),
  amount: z.number().positive(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
  reference: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createPosOrderRpcSchema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  discountId: z.string().uuid().nullable().optional(),
  items: z.array(posOrderItemSchema).min(1),
  payments: z.array(posOrderPaymentSchema).min(1),
  notes: z.string().nullable().optional(),
});

export const createOrderRefundRpcSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(1),
  method: z.enum(["CASH", "CARD", "PHONEPE_QR", "ESEWA_QR", "MOBILE_MONEY", "GIFT_CARD", "CREDIT"]),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type CreatePosOrderRpcInput = z.infer<typeof createPosOrderRpcSchema>;
export type CreateOrderRefundRpcInput = z.infer<typeof createOrderRefundRpcSchema>;
