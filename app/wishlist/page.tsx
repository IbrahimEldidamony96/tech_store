import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWishlistForUser } from "@/lib/queries/wishlist";
import { WishlistItems } from "@/components/wishlist-items";

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/wishlist");

  const items = await getWishlistForUser(session.user.id);

  // نفس تحويل Decimal -> number المتكرر من صفحات الكارت والمنتج
  const mapped = items.map((item) => ({
    id: item.id,
    product: {
      id: item.product.id,
      nameEn: item.product.nameEn,
      slug: item.product.slug,
      isActive: item.product.isActive,
      image: item.product.images[0]?.url ?? null,
      price: item.product.variants[0]?.price.toNumber() ?? null,
      stock: item.product.variants[0]?.stock ?? 0,
    },
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">Your Wishlist</h1>
      <WishlistItems initialItems={mapped} />
    </div>
  );
}
