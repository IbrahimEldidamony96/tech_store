"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type CartItem = {
  id: string;
  quantity: number;
  variant: {
    id: string;
    sku: string;
    price: number;
    stock: number;
    isActive: boolean;
    optionSummary: string;
    product: { id: string; nameEn: string; slug: string; isActive: boolean; images: { url: string }[] };
  };
};

export function CartItems({ initialItems }: { initialItems: CartItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);

  const subtotal = items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);

  // Optimistic update: نغيّر الواجهة فورًا، ولو السيرفر رفض (مخزون
  // اتغير من تاب تاني مثلاً) بنعمل router.refresh() يجيب الحالة الحقيقية
  async function updateQuantity(itemId: string, quantity: number) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)));

    const res = await fetch(`/api/cart/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });

    if (!res.ok) router.refresh();
  }

  async function removeItem(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="mt-10 text-center">
        <p className="text-steel">Your cart is empty.</p>
        <Link href="/" className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <ul className="divide-y divide-steel/10">
        {items.map((item) => {
          const image = item.variant.product.images[0];
          const unavailable = !item.variant.isActive || !item.variant.product.isActive;
          const maxQty = Math.min(10, item.variant.stock);

          return (
            <li key={item.id} className="flex gap-4 py-5">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-steel/15 bg-steel/5">
                {image && (
                  <Image
                    src={image.url}
                    alt={item.variant.product.nameEn}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                )}
              </div>

              <div className="flex-1">
                <Link
                  href={`/products/${item.variant.product.slug}`}
                  className="font-display text-sm font-medium text-ink hover:underline"
                >
                  {item.variant.product.nameEn}
                </Link>
                {item.variant.optionSummary && (
                  <p className="mt-0.5 text-xs text-steel">{item.variant.optionSummary}</p>
                )}
                <p className="mt-1 font-mono text-sm text-ink">EGP {item.variant.price.toLocaleString()}</p>

                {unavailable && <p className="mt-1 text-xs text-alert">No longer available</p>}

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-md border border-steel/25">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="px-2.5 py-1 text-steel hover:text-ink"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-7 text-center font-mono text-xs">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, Math.min(maxQty, item.quantity + 1))}
                      className="px-2.5 py-1 text-steel hover:text-ink"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-xs text-steel hover:text-alert"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-steel/15 pt-6">
        <p className="text-sm text-steel">Subtotal</p>
        <p className="font-mono text-lg font-semibold text-ink">EGP {subtotal.toLocaleString()}</p>
      </div>

      <Link
        href="/checkout"
        className="mt-4 block rounded-md bg-signal py-3 text-center text-sm font-semibold text-ink transition-opacity hover:opacity-90"
      >
        Proceed to Checkout
      </Link>
    </div>
  );
}
