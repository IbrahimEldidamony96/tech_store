import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProductForAdminEdit } from "@/lib/queries/admin-products";
import { ProductForm } from "@/components/admin/product-form";
import { ProductVariantsSection } from "@/components/admin/product-variants-section";

type Params = Promise<{ id: string }>;

export default async function EditProductPage({ params }: { params: Params }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { id } = await params;

  const [product, categories, brands, options, variants] = await Promise.all([
    getProductForAdminEdit(id),
    prisma.category.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.productOption.findMany({
      where: { productId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        values: { select: { id: true, valueEn: true, valueAr: true } },
      },
    }),
    prisma.productVariant.findMany({
      where: { productId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        sku: true,
        price: true,
        stock: true,
        isActive: true,
        optionValues: { select: { optionValue: { select: { valueEn: true } } } },
      },
    }),
  ]);

  if (!product) notFound();

  // Decimal -> number وبناء ملخص الخصائص ("Black / 128GB") من العلاقات المتداخلة
  const mappedVariants = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    price: v.price.toNumber(),
    stock: v.stock,
    isActive: v.isActive,
    optionSummary: v.optionValues.map((ov) => ov.optionValue.valueEn).join(" / "),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">Edit Product</h1>
      <ProductForm
        categories={categories}
        brands={brands}
        initialData={{
          id: product.id,
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          slug: product.slug,
          descriptionEn: product.descriptionEn ?? "",
          descriptionAr: product.descriptionAr ?? "",
          categoryId: product.categoryId,
          brandId: product.brandId ?? "",
        }}
      />
      <ProductVariantsSection productId={product.id} initialOptions={options} initialVariants={mappedVariants} />
    </div>
  );
}
