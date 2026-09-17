import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllSlidersForAdmin } from "@/lib/queries/sliders";
import { SlidersManager } from "@/components/admin/sliders-manager";

export default async function AdminSlidersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const slides = await getAllSlidersForAdmin();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">
        Homepage Slider
      </h1>
      <p className="mt-2 text-sm text-steel">
        Manage the image carousel shown at the top of the homepage. Order
        top-to-bottom here matches left-to-right in the carousel.
      </p>

      <div className="mt-6">
        <SlidersManager initialSlides={slides} />
      </div>
    </div>
  );
}
