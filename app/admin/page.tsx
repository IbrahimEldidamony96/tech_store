import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">Admin</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/orders"
          className="rounded-lg border border-steel/15 p-5 hover:border-ink"
        >
          <h2 className="font-display font-semibold text-ink">Orders</h2>
          <p className="mt-1 text-sm text-steel">
            Manage payments and shipments
          </p>
        </Link>
        <Link
          href="/admin/products"
          className="rounded-lg border border-steel/15 p-5 hover:border-ink"
        >
          <h2 className="font-display font-semibold text-ink">Products</h2>
          <p className="mt-1 text-sm text-steel">
            Create, edit, activate/deactivate
          </p>
        </Link>
        <Link
          href="/admin/categories"
          className="rounded-lg border border-steel/15 p-5 hover:border-ink"
        >
          <h2 className="font-display font-semibold text-ink">Categories</h2>
          <p className="mt-1 text-sm text-steel">Manage the category tree</p>
        </Link>
        <Link
          href="/admin/brands"
          className="rounded-lg border border-steel/15 p-5 hover:border-ink"
        >
          <h2 className="font-display font-semibold text-ink">Brands</h2>
          <p className="mt-1 text-sm text-steel">Add and view brands</p>
        </Link>
        <Link
          href="/admin/shipping-rates"
          className="rounded-lg border border-steel/15 p-5 hover:border-ink"
        >
          <h2 className="font-display font-semibold text-ink">
            Shipping Rates
          </h2>
          <p className="mt-1 text-sm text-steel">
            Set Bosta&apos;s per-governorate fee
          </p>
        </Link>
      </div>
    </div>
  );
}
