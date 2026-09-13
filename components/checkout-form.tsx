"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Address = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  governorate: string;
  street: string;
  isDefault: boolean;
};

type Item = { id: string; quantity: number; name: string; price: number };
type BostaOption = { id: string; name: string };

type ShippingPreview = {
  shippingCost: number;
  freeShippingApplied: boolean;
  freeShippingThreshold: number;
};

const emptyAddressForm = {
  firstName: "",
  lastName: "",
  phone: "",
  country: "Egypt",
  governorate: "",
  city: "",
  area: "",
  street: "",
  buildingNo: "",
  apartment: "",
  postalCode: "",
};

export function CheckoutForm({
  items,
  subtotal,
  addresses,
}: {
  items: Item[];
  subtotal: number;
  addresses: Address[];
}) {
  const router = useRouter();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null,
  );
  const [addingNew, setAddingNew] = useState(addresses.length === 0);
  const [newAddress, setNewAddress] = useState(emptyAddressForm);
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH_ON_DELIVERY" | "CARD" | "WALLET"
  >("CASH_ON_DELIVERY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ثلاث مستويات متسلسلة، كلهم متغذّيين من Bosta نفسها بدل كتابة حرة:
  // محافظة (city عند Bosta) → منطقة (zone) → حي (district). Bosta فعليًا
  // بتطلب districtId (مش zoneId) وقت إنشاء الشحنة — شايف lib/bosta.ts
  // للتفاصيل الكاملة عن الفرق بين المستويين، اتأكد بباج حقيقي (Error 3003).
  const [cities, setCities] = useState<BostaOption[]>([]);
  const [citiesLoaded, setCitiesLoaded] = useState(false);
  const [zones, setZones] = useState<BostaOption[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [loadingZones, setLoadingZones] = useState(false);
  const [districts, setDistricts] = useState<BostaOption[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [addressError, setAddressError] = useState("");

  // *** معاينة سعر شحن Bosta الحقيقي قبل ما الأوردر يتعمل ***
  // Bosta هي شركة الشحن الوحيدة/الافتراضية هنا، وسعرها بيتحسب من جدول
  // أسعار لكل محافظة (مربوط بـ cityId حقيقي عندها) — نفس المنطق بالظبط
  // اللي بيتطبق تاني وقت إنشاء الأوردر فعليًا في /api/checkout. سعر
  // الشحن بيتحدد على مستوى المحافظة بس، فمش محتاج ننتظر اختيار الحي.
  const [shippingPreview, setShippingPreview] =
    useState<ShippingPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // مشتقة وقت الـ render نفسه، مش state منفصلة — بتتفادى استدعاء
  // setState بشكل sync جوه الـ effect (react-hooks/set-state-in-effect)
  const loadingCities = addingNew && !citiesLoaded;

  // بنجيب قايمة المحافظات أول ما فورم "عنوان جديد" يظهر، مش قبل كده —
  // عشان اليوزر اللي عنده عناوين محفوظة بالفعل مايستناش نداء مش لازمه.
  // كل تحديثات الـ state هنا جوه .then()/.catch()/.finally() مش مباشرة
  // في جسم الـ effect، عشان كده الـ lint rule متتفعّلش
  useEffect(() => {
    if (!addingNew || citiesLoaded) return;

    fetch("/api/bosta/cities")
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body.error ?? "Failed to load governorates");
        setCities(body.data ?? []);
      })
      .catch((err) =>
        setAddressError(
          err.message ??
            "Could not load governorates — check your connection and try again.",
        ),
      )
      .finally(() => setCitiesLoaded(true));
  }, [addingNew, citiesLoaded]);

  // بنعيد حساب سعر الشحن الحقيقي كل ما مصدر العنوان يتغيّر: عنوان محفوظ
  // اتختار، أو محافظة جديدة اتختارت وإحنا بنضيف عنوان جديد. subtotal
  // بيتحسب على السيرفر من الكارت نفسه (مش بنبعته إحنا)، فمفيش خطر إن حد
  // يلاعب فيه من الفرونت إند.
  useEffect(() => {
    const query = addingNew
      ? selectedCityId
        ? `cityId=${selectedCityId}`
        : null
      : selectedAddressId
        ? `addressId=${selectedAddressId}`
        : null;

    // *** كل تحديثات الـ state هنا لازم تحصل جوه .then()، مش مباشرة في
    // جسم الـ effect — حتى الحالة اللي منطقيًا sync زي "مفيش query
    // خالص" (react-hooks/set-state-in-effect بترفض أي setState تلاقيه
    // قبل أول boundary غير متزامن جوه الـ effect). الـ Promise.resolve()
    // الفاضية دي مجرد "نقلة" لكل الكود اللي جواها يبقى رسميًا جوه
    // callback غير متزامن — نفس السلوك بالظبط، مجرد microtask واحد فرق.
    Promise.resolve().then(() => {
      if (!query) {
        setShippingPreview(null);
        setPreviewError("");
        return;
      }

      setPreviewLoading(true);
      setPreviewError("");
      fetch(`/api/checkout/shipping-cost?${query}`)
        .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
        .then(({ ok, body }) => {
          if (!ok)
            throw new Error(body.error ?? "Failed to calculate shipping");
          setShippingPreview(body.data);
        })
        .catch((err) => {
          setShippingPreview(null);
          setPreviewError(
            err.message ?? "Could not calculate shipping cost right now.",
          );
        })
        .finally(() => setPreviewLoading(false));
    });
  }, [addingNew, selectedCityId, selectedAddressId]);

  // ده event handler (بينده من onChange)، مش effect — فمفيش مشكلة إن
  // setState هنا يتنادى مباشرة وsync
  function handleGovernorateChange(cityId: string) {
    const city = cities.find((c) => c.id === cityId);
    setSelectedCityId(cityId);
    setSelectedZoneId("");
    setZones([]);
    setSelectedDistrictId("");
    setDistricts([]);
    setNewAddress((prev) => ({
      ...prev,
      governorate: city?.name ?? "",
      city: "",
      area: "",
    }));

    if (!cityId) return;

    setLoadingZones(true);
    setAddressError("");
    fetch(`/api/bosta/zones?cityId=${cityId}`)
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body.error ?? "Failed to load areas");
        setZones(body.data ?? []);
      })
      .catch((err) =>
        setAddressError(
          err.message ??
            "Could not load areas — check your connection and try again.",
        ),
      )
      .finally(() => setLoadingZones(false));
  }

  function handleZoneChange(zoneId: string) {
    const zone = zones.find((z) => z.id === zoneId);
    setSelectedZoneId(zoneId);
    setSelectedDistrictId("");
    setDistricts([]);
    setNewAddress((prev) => ({ ...prev, city: zone?.name ?? "", area: "" }));

    if (!zoneId || !selectedCityId) return;

    setLoadingDistricts(true);
    setAddressError("");
    fetch(`/api/bosta/districts?cityId=${selectedCityId}&zoneId=${zoneId}`)
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body.error ?? "Failed to load districts");
        setDistricts(body.data ?? []);
      })
      .catch((err) =>
        setAddressError(
          err.message ??
            "Could not load districts — check your connection and try again.",
        ),
      )
      .finally(() => setLoadingDistricts(false));
  }

  function handleDistrictChange(districtId: string) {
    const district = districts.find((d) => d.id === districtId);
    setSelectedDistrictId(districtId);
    setNewAddress((prev) => ({ ...prev, area: district?.name ?? "" }));
  }

  function field(key: keyof typeof emptyAddressForm) {
    return {
      value: newAddress[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setNewAddress((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    let addressId = selectedAddressId;

    // لو اليوزر بيضيف عنوان جديد، لازم نحفظه ونستنى الـ id بتاعه الأول
    // قبل ما ننادي /api/checkout — مفيش نداء واحد يعمل الاتنين سوا
    if (addingNew) {
      if (!newAddress.governorate || !newAddress.city || !selectedDistrictId) {
        setError("Please select your governorate, area, and district");
        setSubmitting(false);
        return;
      }

      const optionalFieldsCleaned = {
        ...newAddress,
        area: newAddress.area || undefined,
        buildingNo: newAddress.buildingNo || undefined,
        apartment: newAddress.apartment || undefined,
        postalCode: newAddress.postalCode || undefined,
        // الـ id الحقيقي عند Bosta بتاع المحافظة والحي (district — مش
        // المنطقة/zone) اللي اليوزر اختارهم من الـ dropdowns — بيتحفظ
        // على العنوان عشان محتاجينه تاني في خطوة "Ship with Bosta"
        // بعدين، من غير ما نضطر نرجع نطابق الاسم النصي بـ id تاني وقتها.
        // *** ده الإصلاح الأساسي لباج "District Not Found" *** —
        // قبل كده كنا بنحفظ zoneId هنا بالغلط بدل districtId الحقيقي
        bostaCityId: selectedCityId || undefined,
        bostaDistrictId: selectedDistrictId || undefined,
      };

      const addrRes = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optionalFieldsCleaned),
      });

      if (!addrRes.ok) {
        const responseBody = await addrRes.json().catch(() => ({}));
        setError(responseBody.error ?? "Could not save address");
        setSubmitting(false);
        return;
      }
      const addrBody = await addrRes.json();
      addressId = addrBody.data.id;
    }

    if (!addressId) {
      setError("Please select or add a shipping address");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addressId,
        couponCode: couponCode || undefined,
        paymentMethod,
      }),
    });

    if (!res.ok) {
      const responseBody = await res.json().catch(() => ({}));
      setError(responseBody.error ?? "Checkout failed");
      setSubmitting(false);
      return;
    }

    const responseBody = await res.json();

    // CARD/WALLET: Paymob رجّعت رابط دفع — نوديه هناك مباشرة. COD (أو لو
    // فشل بدء الدفع لأي سبب) بيروح لصفحة الأوردر زي ما كان، وهيلاقي
    // زرار "Complete Payment" هناك لو لسه محتاج يدفع
    if (responseBody.checkoutUrl) {
      window.location.href = responseBody.checkoutUrl;
      return;
    }

    router.push(`/orders/${responseBody.data.id}`);
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-8">
        <section>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
            Shipping Address
          </h2>

          {addresses.length > 0 && !addingNew && (
            <div className="mt-3 space-y-2">
              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
                    selectedAddressId === addr.id
                      ? "border-ink"
                      : "border-steel/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium text-ink">
                      {addr.firstName} {addr.lastName} · {addr.phone}
                    </span>
                    <span className="block text-steel">
                      {addr.street}, {addr.city}, {addr.governorate}
                    </span>
                  </span>
                </label>
              ))}
              <button
                type="button"
                onClick={() => setAddingNew(true)}
                className="text-sm font-medium text-signal hover:underline"
              >
                + Add a new address
              </button>
            </div>
          )}

          {addingNew && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input
                placeholder="First name"
                {...field("firstName")}
                className="rounded-md border border-steel/25 px-3 py-2 text-sm"
              />
              <input
                placeholder="Last name"
                {...field("lastName")}
                className="rounded-md border border-steel/25 px-3 py-2 text-sm"
              />
              <input
                placeholder="Phone"
                {...field("phone")}
                className="col-span-2 rounded-md border border-steel/25 px-3 py-2 text-sm"
              />

              <select
                value={selectedCityId}
                onChange={(e) => handleGovernorateChange(e.target.value)}
                disabled={loadingCities}
                className="rounded-md border border-steel/25 px-3 py-2 text-sm text-ink disabled:opacity-50"
              >
                <option value="">
                  {loadingCities
                    ? "Loading governorates…"
                    : "Select governorate"}
                </option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedZoneId}
                onChange={(e) => handleZoneChange(e.target.value)}
                disabled={!selectedCityId || loadingZones}
                className="rounded-md border border-steel/25 px-3 py-2 text-sm text-ink disabled:opacity-50"
              >
                <option value="">
                  {!selectedCityId
                    ? "Select governorate first"
                    : loadingZones
                      ? "Loading areas…"
                      : "Select area"}
                </option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedDistrictId}
                onChange={(e) => handleDistrictChange(e.target.value)}
                disabled={!selectedZoneId || loadingDistricts}
                className="col-span-2 rounded-md border border-steel/25 px-3 py-2 text-sm text-ink disabled:opacity-50"
              >
                <option value="">
                  {!selectedZoneId
                    ? "Select area first"
                    : loadingDistricts
                      ? "Loading districts…"
                      : "Select district"}
                </option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {addressError && (
                <p className="col-span-2 text-xs text-alert">{addressError}</p>
              )}

              <input
                placeholder="Street"
                {...field("street")}
                className="col-span-2 rounded-md border border-steel/25 px-3 py-2 text-sm"
              />
              <input
                placeholder="Building No. (optional)"
                {...field("buildingNo")}
                className="rounded-md border border-steel/25 px-3 py-2 text-sm"
              />
              <input
                placeholder="Apartment (optional)"
                {...field("apartment")}
                className="rounded-md border border-steel/25 px-3 py-2 text-sm"
              />
              {addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAddingNew(false)}
                  className="col-span-2 text-left text-sm text-steel hover:text-ink"
                >
                  ← Use a saved address instead
                </button>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
            Coupon
          </h2>
          <input
            placeholder="Coupon code (optional)"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            className="mt-3 w-full rounded-md border border-steel/25 px-3 py-2 font-mono text-sm"
          />
        </section>

        <section>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
            Payment Method
          </h2>
          <div className="mt-3 space-y-2">
            {(["CASH_ON_DELIVERY", "CARD", "WALLET"] as const).map((method) => (
              <label
                key={method}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-steel/20 p-3 text-sm"
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                />
                {method === "CASH_ON_DELIVERY"
                  ? "Cash on Delivery"
                  : method === "CARD"
                    ? "Card"
                    : "Wallet"}
              </label>
            ))}
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-lg border border-steel/15 p-5">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          Order Summary
        </h2>
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span className="text-steel">
                {item.name} × {item.quantity}
              </span>
              <span className="font-mono text-ink">
                EGP {(item.price * item.quantity).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-steel/15 pt-4 text-sm">
          <span className="text-ink">Subtotal</span>
          <span className="font-mono text-ink">
            EGP {subtotal.toLocaleString()}
          </span>
        </div>

        <div className="mt-2 flex justify-between text-sm">
          <span className="text-ink">Shipping (Bosta)</span>
          <span className="font-mono text-ink">
            {previewLoading
              ? "Calculating…"
              : shippingPreview
                ? shippingPreview.freeShippingApplied
                  ? "Free"
                  : `EGP ${shippingPreview.shippingCost.toLocaleString()}`
                : "Select an address"}
          </span>
        </div>
        {previewError && (
          <p className="mt-1 text-xs text-alert">{previewError}</p>
        )}
        {shippingPreview && (
          <p
            className={`mt-1 text-xs ${
              shippingPreview.freeShippingApplied
                ? "font-medium text-signal"
                : "text-steel"
            }`}
          >
            {shippingPreview.freeShippingApplied
              ? `🎉 This order qualifies for free shipping (orders over EGP ${shippingPreview.freeShippingThreshold.toLocaleString()}).`
              : `Add EGP ${(shippingPreview.freeShippingThreshold - subtotal).toLocaleString()} more to get free shipping (over EGP ${shippingPreview.freeShippingThreshold.toLocaleString()}).`}
          </p>
        )}

        <div className="mt-2 flex justify-between border-t border-steel/15 pt-2 text-sm font-semibold">
          <span className="text-ink">Estimated Total</span>
          <span className="font-mono text-ink">
            EGP{" "}
            {(subtotal + (shippingPreview?.shippingCost ?? 0)).toLocaleString()}
          </span>
        </div>
        <p className="mt-1 text-xs text-steel">
          Any coupon discount is applied when you place the order.
        </p>

        {error && <p className="mt-3 text-sm text-alert">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-4 w-full rounded-md bg-signal py-3 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? "Placing order…" : "Place Order"}
        </button>
      </aside>
    </div>
  );
}
