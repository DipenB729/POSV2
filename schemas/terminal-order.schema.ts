import { z } from "zod";

export const terminalOrderItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  sku: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100),
  quantity: z.number().int().positive(),
  discount: z.number().nonnegative().optional().default(0),
});

export const terminalOrderSchema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().uuid().optional().nullable(),
  discount: z
    .object({
      code: z.string().min(1),
      amount: z.number().nonnegative(),
    })
    .optional(),
  notes: z.string().max(1000).optional().nullable(),
  paymentMethod: z.enum(["CASH", "PHONEPE_QR", "ESEWA_QR"]),
  paymentReference: z.string().optional().nullable(),
  amountTendered: z.number().nonnegative(),
  items: z.array(terminalOrderItemSchema).min(1),
});

export type TerminalOrderInput = z.infer<typeof terminalOrderSchema>;
