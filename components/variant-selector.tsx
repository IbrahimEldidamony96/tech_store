"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type OptionValue = { id: string; valueEn: string };
type Option = { id: string; nameEn: string; values: OptionValue[] };
type Variant = { id: string; sku: string; price: number; stock: number; optionValueIds: string[] };

export function VariantSelector({ options, variants }: { options: Option[]; variants: Variant[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "added" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // لازم اليوزر يختار قيمة لكل Option (لون + مساحة مثلاً) قبل ما نعرف
  // الـ variant المحدد. بنقارن مجموعة الاختيارات (بعد ترتيبها) مع
  // مجموعة optionValueIds بتاعة كل variant — تطابق كامل = ده هو
  const matchedVariant = useMemo(() => {
    if (Object.keys(selected).length !== options.length) return null;
    const selectedIds = Object.values(selected).sort();
    return (
      variants.find((v) => {
        const ids = [...v.optionValueIds].sort();
        return ids.length === selectedIds.length && ids.every((id, i) => id === selectedIds[i]);
      }) ?? null
    );
  }, [selected, options.length, variants]);

  const maxQuantity = matchedVariant ? Math.min(10, matchedVariant.stock) : 10;

  async function handleAddToCart() {
    if (!matchedVariant) return;
    setStatus("loading");
    setErrorMessage("");

    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: matchedVariant.id, quantity }),
    });

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    if (!res.ok) {
      const responseBody = await res.json().catch(() => ({}));
      setErrorMessage(responseBody.error ?? "Something went wrong");
      setStatus("error");
      return;
    }

    setStatus("added");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="space-y-5">
      {options.map((option) => (
        <div key={option.id}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-steel">{option.nameEn}</p>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const isSelected = selected[option.id] === value.id;
              return (
                <button
                  key={value.id}
                  type="button"
                  onClick={() => setSelected((prev) => ({ ...prev, [option.id]: value.id }))}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isSelected ? "border-ink bg-ink text-paper" : "border-steel/25 text-ink hover:border-ink"
                  }`}
                >
                  {value.valueEn}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="border-t border-steel/15 pt-5">
        {matchedVariant ? (
          <>
            <p className="font-mono text-2xl font-semibold text-ink">
              EGP {matchedVariant.price.toLocaleString()}
            </p>
            <p className="mt-1 font-mono text-xs text-steel">
              SKU: {matchedVariant.sku} ·{" "}
              {matchedVariant.stock === 0 ? (
                <span className="text-alert">Out of stock</span>
              ) : (
                `${matchedVariant.stock} in stock`
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-steel">
            {options.length === 0 ? "" : "Select all options to see price and availability"}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center rounded-md border border-steel/25">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-steel hover:text-ink"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center font-mono text-sm">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              className="px-3 py-2 text-steel hover:text-ink"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!matchedVariant || matchedVariant.stock === 0 || status === "loading"}
            className="flex-1 rounded-md bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "loading" ? "Adding…" : status === "added" ? "Added ✓" : "Add to Cart"}
          </button>
        </div>

        {status === "error" && <p className="mt-2 text-sm text-alert">{errorMessage}</p>}
      </div>
    </div>
  );
}
