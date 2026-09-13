"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProductActiveToggle({
  productId,
  initialActive,
}: {
  productId: string;
  initialActive: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !active }),
    });

    if (res.ok) {
      setActive((prev) => !prev);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-40 ${
        active ? "bg-signal/20 text-ink hover:bg-alert/20 hover:text-alert" : "bg-steel/10 text-steel hover:bg-signal/20 hover:text-ink"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}
