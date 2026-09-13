import { z } from "zod";

export const variantCreateSchema = z.object({
  sku: z.string().min(1).max(100),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0),
  optionValueIds: z.array(z.string().min(1)).optional(),
});
export type VariantCreateInput = z.infer<typeof variantCreateSchema>;

export const variantUpdateSchema = z.object({
  sku: z.string().min(1).max(100).optional(),
  price: z.coerce.number().positive().optional(),
  stock: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>;
