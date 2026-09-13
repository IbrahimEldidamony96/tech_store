import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllCategoriesForAdmin } from "@/lib/queries/admin-categories";
import { CategoriesManager } from "@/components/admin/categories-manager";

export default async function AdminCategoriesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const categories = await getAllCategoriesForAdmin();
  const parentOptions = categories.map((c) => ({ id: c.id, nameEn: c.nameEn }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">Categories</h1>
      <CategoriesManager initialCategories={categories} parentOptions={parentOptions} />
    </div>
  );
}
