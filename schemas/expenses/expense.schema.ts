import { z } from "zod";

export const createExpenseSchema = z.object({
  storeId: z.string().uuid(),
  category: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "CARD", "PHONEPE_QR", "MOBILE_MONEY", "GIFT_CARD", "CREDIT"]).optional().nullable(),
  reference: z.string().max(120).optional().nullable(),
  incurredAt: z.string().datetime().optional().nullable(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
