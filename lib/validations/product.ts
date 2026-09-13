import { z } from "zod";

// ---------- GET /api/products (query params) ----------
export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.string().optional(), // category slug
  brand: z.string().optional(), // brand slug
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().min(1).max(100).optional(),
  // price_asc/price_desc غير مدعومة دلوقتي — السبب موضح في route.ts
  sort: z.enum(["newest", "name_asc", "name_desc"]).default("newest"),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

// ---------- POST /api/products (body) ----------
export const productCreateSchema = z.object({
  nameEn: z.string().min(1).max(200),
  nameAr: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "slug: حروف إنجليزية صغيرة وأرقام وشرطات فقط"),
  descriptionEn: z.string().max(5000).optional(),
  descriptionAr: z.string().max(5000).optional(),
  categoryId: z.string().min(1),
  brandId: z.string().min(1).optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

// ---------- PATCH /api/products/[id] (body) ----------
// partial() = كل الحقول تبقى اختيارية، الأدمن ممكن يبعت حقل واحد بس يتعدل.
// isActive مش موجود في productCreateSchema (منتج جديد نشط افتراضيًا دايمًا)،
// فلازم نضيفه هنا صراحة عشان PATCH يقدر "يرجّع" منتج بعد ما يتوقف
export const productUpdateSchema = productCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
