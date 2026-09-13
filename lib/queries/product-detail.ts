import { prisma } from "@/lib/prisma";

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      descriptionEn: true,
      slug: true,
      category: { select: { nameEn: true, slug: true } },
      brand: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, alt: true, isPrimary: true } },
      options: {
        select: {
          id: true,
          nameEn: true,
          values: { select: { id: true, valueEn: true } },
        },
      },
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          sku: true,
          price: true,
          stock: true,
          optionValues: { select: { optionValueId: true } },
        },
      },
    },
  });
}
