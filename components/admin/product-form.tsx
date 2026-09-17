"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; nameEn: string };
type Brand = { id: string; name: string };

type FormData = {
  id?: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  descriptionEn: string;
  descriptionAr: string;
  categoryId: string;
  brandId: string;
};

const empty: FormData = {
  nameEn: "",
  nameAr: "",
  slug: "",
  descriptionEn: "",
  descriptionAr: "",
  categoryId: "",
  brandId: "",
};

const emptyVariant = { sku: "", price: "", stock: "" };

export function ProductForm({
  categories,
  brands,
  initialData,
}: {
  categories: Category[];
  brands: Brand[];
  initialData?: FormData;
}) {
  const router = useRouter();
  const isEdit = !!initialData?.id;
  const [form, setForm] = useState<FormData>(initialData ?? empty);
  const [variant, setVariant] = useState(emptyVariant);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  function field(key: keyof FormData) {
    return {
      value: form[key] ?? "",
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
      ) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      slug: form.slug,
      descriptionEn: form.descriptionEn || undefined,
      descriptionAr: form.descriptionAr || undefined,
      categoryId: form.categoryId,
      brandId: form.brandId || undefined,
    };

    const url = isEdit ? `/api/products/${initialData!.id}` : "/api/products";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save product");
      setSubmitting(false);
      return;
    }

    const body = await res.json();

    // الـ variant الافتراضي اختياري فعليًا — لو السكو فاضي، معناها اليوزر
    // عايز يضيف Options/Variants حقيقية بنفسه في صفحة الـ edit بعد كده،
    // فمنعملش أي طلب هنا خالص
    if (!isEdit && variant.sku.trim() !== "") {
      const variantRes = await fetch(`/api/products/${body.data.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: variant.sku,
          price: Number(variant.price),
          stock: Number(variant.stock),
        }),
      });

      if (!variantRes.ok) {
        const vBody = await variantRes.json().catch(() => ({}));
        setError(
          `Product created, but the variant failed: ${vBody.error ?? "unknown error"}`,
        );
        setSubmitting(false);
        return;
      }
    }

    if (!isEdit) {
      // منتج جديد — نروح لصفحة الـ edit بتاعه على طول، عشان يقدر يضيف
      // Options وVariants حقيقية من نفس المكان اللي شافه في صفحة التعديل،
      // بدل ما يرجع للقائمة ويدور عليه تاني
      router.push(`/admin/products/${body.data.id}/edit`);
      router.refresh();
      return;
    }

    // تعديل منتج موجود — منسيبش الصفحة خالص، عشان أقسام Options/Variants
    // اللي تحت (لو موجودة) تفضل شغالة على نفس الصفحة دي
    setSubmitting(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-2 gap-4">
      <input
        required
        placeholder="Name (EN)"
        {...field("nameEn")}
        className="rounded-md border border-steel/25 px-3 py-2 text-sm"
      />
      <input
        required
        placeholder="الاسم (عربي)"
        dir="rtl"
        {...field("nameAr")}
        className="rounded-md border border-steel/25 px-3 py-2 text-sm"
      />
      <input
        required
        placeholder="slug"
        {...field("slug")}
        className="col-span-2 rounded-md border border-steel/25 px-3 py-2 font-mono text-sm"
      />
      <textarea
        placeholder="Description (EN)"
        rows={3}
        {...field("descriptionEn")}
        className="rounded-md border border-steel/25 px-3 py-2 text-sm"
      />
      <textarea
        placeholder="الوصف (عربي)"
        dir="rtl"
        rows={3}
        {...field("descriptionAr")}
        className="rounded-md border border-steel/25 px-3 py-2 text-sm"
      />

      <select
        required
        {...field("categoryId")}
        className="rounded-md border border-steel/25 px-3 py-2 text-sm"
      >
        <option value="">Select category…</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nameEn}
          </option>
        ))}
      </select>

      <select
        {...field("brandId")}
        className="rounded-md border border-steel/25 px-3 py-2 text-sm"
      >
        <option value="">No brand</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      {!isEdit && (
        <>
          <p className="col-span-2 mt-2 text-xs font-medium uppercase tracking-wide text-steel">
            Default variant (optional — leave blank to configure
            options/variants after creating)
          </p>
          <input
            placeholder="SKU"
            value={variant.sku}
            onChange={(e) => setVariant((p) => ({ ...p, sku: e.target.value }))}
            className="rounded-md border border-steel/25 px-3 py-2 font-mono text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            value={variant.price}
            onChange={(e) =>
              setVariant((p) => ({ ...p, price: e.target.value }))
            }
            className="rounded-md border border-steel/25 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Stock"
            value={variant.stock}
            onChange={(e) =>
              setVariant((p) => ({ ...p, stock: e.target.value }))
            }
            className="col-span-2 rounded-md border border-steel/25 px-3 py-2 text-sm"
          />
        </>
      )}

      {error && <p className="col-span-2 text-sm text-alert">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="col-span-2 rounded-md bg-signal py-2.5 text-sm font-semibold text-ink disabled:opacity-40"
      >
        {submitting
          ? "Saving…"
          : saved
            ? "Saved ✓"
            : isEdit
              ? "Save Changes"
              : "Create Product"}
      </button>

      {!isEdit && (
        <p className="col-span-2 text-xs text-steel">
          Fill the SKU above for one simple variant, or leave it blank and add
          proper option-based variants (color × storage, etc.) on the next page.
        </p>
      )}
    </form>
  );
}
