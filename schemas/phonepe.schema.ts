import { z } from "zod";

export const initiatePhonePeSchema = z.object({
  orderId: z.string().uuid(),
  amountRupees: z.number().positive(),
});

export const phonePeStatusSchema = z.object({
  merchantTransactionId: z.string().min(1),
});

export const cancelPhonePeSchema = z.object({
  merchantTransactionId: z.string().min(1),
});

export const phonePeCallbackSchema = z.object({
  response: z.string().min(1),
});
