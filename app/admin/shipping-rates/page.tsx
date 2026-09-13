import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getShippingRatesForAdmin } from "@/lib/queries/admin-shipping-rates";
import { ShippingRatesManager } from "@/components/admin/shipping-rates-manager";
import { BostaApiError } from "@/lib/bosta";

export default async function AdminShippingRatesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  // getShippingRatesForAdmin بتنادي Bosta لايف (getBostaCities) — لو
  // BOSTA_API_KEY مش متظبط أو Bosta واقعة، من غير try/catch هنا الصفحة
  // كلها كانت هتوقع بـ 500 عام بدل رسالة واضحة تقول المشكلة فين بالظبط
  let rates: Awaited<ReturnType<typeof getShippingRatesForAdmin>> | null = null;
  let loadError: string | null = null;
  try {
    rates = await getShippingRatesForAdmin();
  } catch (err) {
    loadError =
      err instanceof BostaApiError || err instanceof Error
        ? err.message
        : "Could not load governorates from Bosta";
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">
        Shipping Rates
      </h1>
      <p className="mt-2 text-sm text-steel">
        Bosta doesn&apos;t offer a live price-quote API — their pricing is a
        flat rate card they quote per governorate when you sign up. Enter what
        Bosta actually charges you for each governorate below; checkout uses
        this table (falling back to a default fee for any governorate you
        haven&apos;t set yet) to calculate shipping before an order is placed.
      </p>
      {loadError ? (
        <p className="mt-6 rounded-md border border-alert/30 bg-alert/5 p-4 text-sm text-alert">
          Could not load governorates from Bosta: {loadError}. Check{" "}
          <code>BOSTA_API_KEY</code> in your environment and try again.
        </p>
      ) : (
        <ShippingRatesManager initialRates={rates!} />
      )}
    </div>
  );
}
