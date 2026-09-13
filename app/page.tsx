import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getProductList } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";

type SearchParams = Promise<{ category?: string; search?: string; page?: string }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const [{ items, totalPages }, categories] = await Promise.all([
    getProductList({ category: params.category, search: params.search, page, limit: 12 }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { nameEn: "asc" },
      select: { id: true, nameEn: true, slug: true },
    }),
  ]);

  // Prisma.Decimal مش نوع UI-friendly — نحوله لـ number صريح هنا في
  // طبقة الصفحة، عشان ProductCard يفضل component بسيط بأنواع JS عادية
  const products = items.map((product) => ({
    ...product,
    variants: product.variants.map((v) => ({ price: v.price.toNumber(), stock: v.stock })),
  }));

  const activeCategory = params.category;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link
          href="/"
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            !activeCategory
              ? "border-ink bg-ink text-paper"
              : "border-steel/25 text-steel hover:border-ink hover:text-ink"
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/?category=${c.slug}`}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === c.slug
                ? "border-ink bg-ink text-paper"
                : "border-steel/25 text-steel hover:border-ink hover:text-ink"
            }`}
          >
            {c.nameEn}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="py-20 text-center text-steel">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/?${activeCategory ? `category=${activeCategory}&` : ""}page=${p}`}
              className={`flex h-9 w-9 items-center justify-center rounded-md border font-mono text-sm ${
                p === page
                  ? "border-ink bg-ink text-paper"
                  : "border-steel/25 text-steel hover:border-ink hover:text-ink"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
