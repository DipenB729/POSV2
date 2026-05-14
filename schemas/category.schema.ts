import { z } from "zod";

const nullableUuid = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const categoryQuerySchema = z.object({
  search: z.string().optional(),
  parentId: nullableUuid,
  includeDeleted: z.coerce.boolean().optional().default(false),
});

export const createCategorySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  description: z.string().max(500).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  parent_id: nullableUuid,
});

export const updateCategorySchema = createCategorySchema.partial();

export type CategoryQuery = z.infer<typeof categoryQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
