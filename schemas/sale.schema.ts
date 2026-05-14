import { z } from "zod";

export const saleLineSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(1),
});

export const createSaleSchema = z.object({
  cashierId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  paymentMethod: z.enum(["cash", "card", "phonepe"]),
  lines: z.array(saleLineSchema).min(1),
});

export type SaleLineInput = z.infer<typeof saleLineSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
