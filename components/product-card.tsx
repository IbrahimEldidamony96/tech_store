import Link from "next/link";
import Image from "next/image";

type ProductCardProps = {
  product: {
    id: string;
    nameEn: string;
    slug: string;
    images: { url: string; alt: string | null }[];
    brand: { name: string } | null;
    variants: { price: number; stock: number }[];
  };
};

export function ProductCard({ product }: ProductCardProps) {
  const image = product.images[0];
  const variant = product.variants[0];
  const outOfStock = !variant || variant.stock === 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-lg border border-steel/15 bg-white transition-colors hover:border-ink"
    >
      <div className="relative aspect-square overflow-hidden bg-steel/5">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.nameEn}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-steel">No image</div>
        )}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded bg-alert px-2 py-0.5 font-mono text-[11px] font-medium text-white">
            OUT OF STOCK
          </span>
        )}
      </div>

      <div className="p-3">
        {product.brand && (
          <p className="font-mono text-[11px] uppercase tracking-wide text-steel">{product.brand.name}</p>
        )}
        <h3 className="mt-0.5 truncate font-display text-sm font-medium text-ink">{product.nameEn}</h3>
        <p className="mt-1.5 font-mono text-sm font-semibold text-ink">
          {variant ? `EGP ${variant.price.toLocaleString()}` : "—"}
        </p>
      </div>
    </Link>
  );
}
