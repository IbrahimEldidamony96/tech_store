import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

export type ProductListFilters = {
  category?: string;
  brand?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "name_asc" | "name_desc";
  page?: number;
  limit?: number;
};

// نفس المنطق اللي كان في app/api/products/route.ts بالظبط — استخرجناه
// هنا عشان الـ Server Component (app/page.tsx) والـ API route الاتنين
// ينادوا نفس الدالة، بدل ما نكرر شرط الـ where مرتين في مكانين مختلفين
export async function getProductList(filters: ProductListFilters = {}) {
  const { category, brand, search, minPrice, maxPrice, sort = "newest", page = 1, limit = 20 } = filters;

  const where: Prisma.ProductWhereInput = { isActive: true };

  if (category) where.category = { slug: category };
  if (brand) where.brand = { slug: brand };

  if (search) {
    where.OR = [
      { nameEn: { contains: search, mode: "insensitive" } },
      { nameAr: { contains: search, mode: "insensitive" } },
    ];
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.variants = {
      some: {
        isActive: true,
        ...(minPrice !== undefined && { price: { gte: minPrice } }),
        ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
      },
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "name_asc" ? { nameEn: "asc" } : sort === "name_desc" ? { nameEn: "desc" } : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        slug: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true, alt: true } },
        category: { select: { nameEn: true, slug: true } },
        brand: { select: { name: true, slug: true } },
        variants: {
          where: { isActive: true },
          orderBy: { price: "asc" },
          take: 1,
          select: { price: true, stock: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
