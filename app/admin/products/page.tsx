import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getAllProductsForAdmin } from "@/lib/queries/admin-products";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";

export default async function AdminProductsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const products = await getAllProductsForAdmin();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Products</h1>
        <Link href="/admin/products/new" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
          + New Product
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-steel/15">
        <table className="w-full text-sm">
          <thead className="bg-steel/5 text-left text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Brand</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel/10">
            {products.map((p) => {
              const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-ink">{p.nameEn}</td>
                  <td className="px-4 py-3 text-steel">{p.category.nameEn}</td>
                  <td className="px-4 py-3 text-steel">{p.brand?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-steel">{totalStock}</td>
                  <td className="px-4 py-3">
                    <ProductActiveToggle productId={p.id} initialActive={p.isActive} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/products/${p.id}/edit`} className="text-xs text-ink hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
