"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Brand = { id: string; name: string; slug: string; _count: { products: number } };

const emptyForm = { name: "", slug: "" };

export function BrandsManager({ initialBrands }: { initialBrands: Brand[] }) {
  const router = useRouter();
  const [brands, setBrands] = useState(initialBrands);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function startEdit(brand: Brand) {
    setEditingId(brand.id);
    setForm({ name: brand.name, slug: brand.slug });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const url = editingId ? `/api/brands/${editingId}` : "/api/brands";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save brand");
      setSubmitting(false);
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    router.refresh();
    setSubmitting(false);
  }

  async function handleDelete(id: string, productCount: number) {
    setError("");

    // تحذير ودّي — مش منع فعلي، لأن الـ API نفسه بيسمح (onDelete: SetNull)
    if (productCount > 0) {
      const confirmed = window.confirm(
        `This brand has ${productCount} product(s). Deleting it will unlink them (their brand becomes empty), not delete the products. Continue?`
      );
      if (!confirmed) return;
    }

    const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to delete brand");
      return;
    }

    setBrands((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="mt-6 space-y-8">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 rounded-lg border border-steel/15 p-4">
        <p className="col-span-2 text-xs font-medium uppercase tracking-wide text-steel">
          {editingId ? "Editing brand" : "New brand"}
        </p>
        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="rounded-md border border-steel/25 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="slug"
          value={form.slug}
          onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
          className="rounded-md border border-steel/25 px-3 py-2 font-mono text-sm"
        />

        {error && <p className="col-span-2 text-sm text-alert">{error}</p>}

        <div className="col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-md bg-ink py-2 text-sm font-semibold text-paper disabled:opacity-40"
          >
            {submitting ? "Saving…" : editingId ? "Save Changes" : "Add Brand"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md border border-steel/25 px-4 py-2 text-sm text-steel hover:text-ink"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="py-2">Name</th>
            <th className="py-2">Slug</th>
            <th className="py-2">Products</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-steel/10">
          {brands.map((brand) => (
            <tr key={brand.id}>
              <td className="py-2 text-ink">{brand.name}</td>
              <td className="py-2 font-mono text-xs text-steel">{brand.slug}</td>
              <td className="py-2 text-steel">{brand._count.products}</td>
              <td className="py-2 space-x-3 text-right">
                <button onClick={() => startEdit(brand)} className="text-xs text-ink hover:underline">
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(brand.id, brand._count.products)}
                  className="text-xs text-steel hover:text-alert"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
