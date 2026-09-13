"use client";

import { useState } from "react";

export function CompletePaymentButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body.error ?? "Could not start payment");
      setLoading(false);
      return;
    }

    window.location.href = body.data.checkoutUrl;
  }

  return (
    <div className="mt-4">
      {error && <p className="mb-2 text-sm text-alert">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-signal px-4 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40"
      >
        {loading ? "Redirecting to payment…" : "Complete Payment"}
      </button>
    </div>
  );
}
