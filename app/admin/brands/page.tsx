import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllBrandsForAdmin } from "@/lib/queries/admin-brands";
import { BrandsManager } from "@/components/admin/brands-manager";

export default async function AdminBrandsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const brands = await getAllBrandsForAdmin();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">Brands</h1>
      <BrandsManager initialBrands={brands} />
    </div>
  );
}
