import { z } from "zod";

const nullableUuid = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const movementTypeSchema = z.enum([
  "SALE",
  "RETURN",
  "PURCHASE_RECEIVED",
  "ADJUSTMENT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "DAMAGE",
]);

export const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  storeId: nullableUuid,
  search: z.string().optional(),
  lowStock: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (typeof value === "string" ? value === "true" : undefined)),
});

export const movementHistoryQuerySchema = z.object({
  inventoryItemId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export const inventoryAdjustmentSchema = z.object({
  inventoryItemId: z.string().uuid(),
  type: movementTypeSchema.default("ADJUSTMENT"),
  quantity: z.coerce.number().int().refine((value) => value !== 0, "Quantity cannot be zero"),
  reason: z.string().min(3).max(500),
  referenceId: nullableUuid,
});

export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;
export type MovementHistoryQuery = z.infer<typeof movementHistoryQuerySchema>;
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;
