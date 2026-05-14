import { z } from "zod";

export const dateRangeReportSchema = z.object({
  storeId: z.string().uuid().optional(),
  from: z.string().datetime().or(z.string().date()),
  to: z.string().datetime().or(z.string().date()),
});

export const periodReportSchema = z.object({
  storeId: z.string().uuid().optional(),
  period: z.enum(["day", "week", "month"]).default("day"),
});

export const topProductsReportSchema = dateRangeReportSchema.extend({
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export const storeReportSchema = z.object({
  storeId: z.string().uuid().optional(),
});

export type DateRangeReportInput = z.infer<typeof dateRangeReportSchema>;
export type PeriodReportInput = z.infer<typeof periodReportSchema>;
export type TopProductsReportInput = z.infer<typeof topProductsReportSchema>;
export type StoreReportInput = z.infer<typeof storeReportSchema>;
