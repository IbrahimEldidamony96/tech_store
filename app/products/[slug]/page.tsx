import { notFound } from "next/navigation";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProductBySlug } from "@/lib/queries/product-detail";
import { getProductReviews } from "@/lib/queries/reviews";
import { VariantSelector } from "@/components/variant-selector";
import { WishlistButton } from "@/components/wishlist-button";
import { ReviewsSection } from "@/components/reviews-section";

type Params = Promise<{ slug: string }>;

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  // بنجيب حالة الـ wishlist الحقيقية من غير ما نستنى اليوزر يضغط —
  // من غيرها القلب هيبان "مش محفوظ" حتى لو محفوظ فعلاً، لحد أول ضغطة
  const session = await auth();
  let initialSaved = false;
  if (session?.user) {
    const existing = await prisma.wishlistItem.findFirst({
      where: { productId: product.id, wishlist: { userId: session.user.id } },
      select: { id: true },
    });
    initialSaved = !!existing;
  }

  const reviews = await getProductReviews(product.id, 1, 10);

  // نفس مبدأ Decimal -> number من صفحة الهوم — الـ Client Component
  // (VariantSelector) محتاج أنواع JS عادية، مش Prisma.Decimal
  const variants = product.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    price: v.price.toNumber(),
    stock: v.stock,
    optionValueIds: v.optionValues.map((ov) => ov.optionValueId),
  }));

  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-lg border border-steel/15 bg-steel/5">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt ?? product.nameEn}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 40vw, 90vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-steel">No image</div>
          )}
        </div>

        <div>
          {product.brand && (
            <p className="font-mono text-xs uppercase tracking-wide text-steel">{product.brand.name}</p>
          )}

          <div className="mt-1 flex items-start justify-between gap-4">
            <h1 className="font-display text-2xl font-bold text-ink">{product.nameEn}</h1>
            <WishlistButton productId={product.id} initialSaved={initialSaved} />
          </div>

          {reviews.total > 0 && (
            <p className="mt-2 text-sm text-steel">
              ★ {reviews.average.toFixed(1)} · {reviews.total} review{reviews.total === 1 ? "" : "s"}
            </p>
          )}

          {product.descriptionEn && (
            <p className="mt-4 text-sm leading-relaxed text-steel">{product.descriptionEn}</p>
          )}

          <div className="mt-6">
            <VariantSelector options={product.options} variants={variants} />
          </div>
        </div>
      </div>

      <ReviewsSection reviews={reviews} />
    </div>
  );
}
