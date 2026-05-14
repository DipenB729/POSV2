import { z } from "zod";

const nullableUuid = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const nullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => (value === "" ? null : value));

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  categoryId: nullableUuid,
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (typeof value === "string" ? value === "true" : undefined)),
});

export const productVariantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  sku: z.string().min(2).max(80),
  barcode: nullableString,
  price_modifier: z.coerce.number().default(0),
  attributes: z.record(z.string(), z.unknown()).optional().default({}),
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(180),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  sku: z.string().min(2).max(80),
  barcode: nullableString,
  description: nullableString,
  image_url: z.string().url().optional().nullable(),
  category_id: z.string().uuid(),
  supplier_id: nullableUuid,
  cost_price: z.coerce.number().nonnegative(),
  selling_price: z.coerce.number().nonnegative(),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  discountable: z.coerce.boolean().optional().default(true),
  is_active: z.coerce.boolean().optional().default(true),
  variants: z.array(productVariantSchema).optional().default([]),
});

export const updateProductSchema = createProductSchema.partial().extend({
  variants: z.array(productVariantSchema).optional(),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
