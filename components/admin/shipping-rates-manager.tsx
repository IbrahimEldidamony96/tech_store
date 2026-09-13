"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminShippingRateRow } from "@/lib/queries/admin-shipping-rates";

type RowState = { fee: string; isActive: boolean };

function rowStateFor(rate: AdminShippingRateRow): RowState {
  return {
    fee: rate.fee !== null ? String(rate.fee) : "",
    isActive: rate.isActive,
  };
}

export function ShippingRatesManager({
  initialRates,
}: {
  initialRates: AdminShippingRateRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(
    () => new Map(initialRates.map((r) => [r.bostaCityId, rowStateFor(r)])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function updateRow(bostaCityId: string, patch: Partial<RowState>) {
    setRows((prev) => {
      const next = new Map(prev);
      next.set(bostaCityId, { ...next.get(bostaCityId)!, ...patch });
      return next;
    });
  }

  async function handleSave(rate: AdminShippingRateRow) {
    const row = rows.get(rate.bostaCityId)!;
    const fee = Number(row.fee);
    if (!row.fee || Number.isNaN(fee) || fee < 0) {
      setError(`Enter a valid fee for ${rate.cityNameEn}`);
      return;
    }

    setError("");
    setSavingId(rate.bostaCityId);

    const res = await fetch("/api/admin/shipping-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bostaCityId: rate.bostaCityId,
        cityNameEn: rate.cityNameEn,
        cityNameAr: rate.cityNameAr ?? undefined,
        fee,
        isActive: row.isActive,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Failed to save ${rate.cityNameEn}`);
      setSavingId(null);
      return;
    }

    setSavingId(null);
    router.refresh();
  }

  async function handleReset(rate: AdminShippingRateRow) {
    if (!rate.rateId) return;
    setError("");
    setSavingId(rate.bostaCityId);

    const res = await fetch(`/api/admin/shipping-rates/${rate.rateId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Failed to reset ${rate.cityNameEn}`);
      setSavingId(null);
      return;
    }

    updateRow(rate.bostaCityId, { fee: "", isActive: true });
    setSavingId(null);
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-4">
      {error && <p className="text-sm text-alert">{error}</p>}

      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="py-2">Governorate</th>
            <th className="py-2">Fee (EGP)</th>
            <th className="py-2">Active</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-steel/10">
          {initialRates.map((rate) => {
            const row = rows.get(rate.bostaCityId)!;
            const isConfigured = rate.rateId !== null;
            return (
              <tr key={rate.bostaCityId}>
                <td className="py-2 text-ink">
                  {rate.cityNameEn}
                  {rate.cityNameAr && (
                    <span className="ms-2 text-xs text-steel">
                      {rate.cityNameAr}
                    </span>
                  )}
                  {!isConfigured && (
                    <span className="ms-2 rounded bg-steel/10 px-1.5 py-0.5 text-[10px] uppercase text-steel">
                      using default
                    </span>
                  )}
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="—"
                    value={row.fee}
                    onChange={(e) =>
                      updateRow(rate.bostaCityId, { fee: e.target.value })
                    }
                    className="w-24 rounded-md border border-steel/25 px-2 py-1 text-sm"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    onChange={(e) =>
                      updateRow(rate.bostaCityId, {
                        isActive: e.target.checked,
                      })
                    }
                  />
                </td>
                <td className="py-2 space-x-3 text-right">
                  <button
                    onClick={() => handleSave(rate)}
                    disabled={savingId === rate.bostaCityId}
                    className="text-xs font-semibold text-ink hover:underline disabled:opacity-40"
                  >
                    Save
                  </button>
                  {isConfigured && (
                    <button
                      onClick={() => handleReset(rate)}
                      disabled={savingId === rate.bostaCityId}
                      className="text-xs text-steel hover:text-alert disabled:opacity-40"
                    >
                      Reset
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
