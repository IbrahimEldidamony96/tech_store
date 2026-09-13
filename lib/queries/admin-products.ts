import { prisma } from "@/lib/prisma";

export async function getAllProductsForAdmin() {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nameEn: true,
      slug: true,
      isActive: true,
      category: { select: { nameEn: true } },
      brand: { select: { name: true } },
      variants: { select: { stock: true } },
    },
  });
}

export async function getProductForAdminEdit(id: string) {
  return prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      slug: true,
      descriptionEn: true,
      descriptionAr: true,
      categoryId: true,
      brandId: true,
      isActive: true,
    },
  });
}
