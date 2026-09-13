"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  parent: { nameEn: string } | null;
  parentId?: string | null;
  _count: { products: number; children: number };
};

type ParentOption = { id: string; nameEn: string };

const emptyForm = { nameEn: "", nameAr: "", slug: "", parentId: "" };

export function CategoriesManager({
  initialCategories,
  parentOptions,
}: {
  initialCategories: Category[];
  parentOptions: ParentOption[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({ nameEn: cat.nameEn, nameAr: cat.nameAr, slug: cat.slug, parentId: cat.parentId ?? "" });
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

    const url = editingId ? `/api/categories/${editingId}` : "/api/categories";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, parentId: form.parentId || undefined }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save category");
      setSubmitting(false);
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    router.refresh();
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    setError("");
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to delete category");
      return;
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mt-6 space-y-8">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 rounded-lg border border-steel/15 p-4">
        <p className="col-span-2 text-xs font-medium uppercase tracking-wide text-steel">
          {editingId ? "Editing category" : "New category"}
        </p>
        <input
          required
          placeholder="Name (EN)"
          value={form.nameEn}
          onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
          className="rounded-md border border-steel/25 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="الاسم (عربي)"
          dir="rtl"
          value={form.nameAr}
          onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
          className="rounded-md border border-steel/25 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="slug"
          value={form.slug}
          onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
          className="rounded-md border border-steel/25 px-3 py-2 font-mono text-sm"
        />
        <select
          value={form.parentId}
          onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
          className="rounded-md border border-steel/25 px-3 py-2 text-sm"
        >
          <option value="">No parent (top-level)</option>
          {parentOptions
            .filter((p) => p.id !== editingId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameEn}
              </option>
            ))}
        </select>

        {error && <p className="col-span-2 text-sm text-alert">{error}</p>}

        <div className="col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-md bg-ink py-2 text-sm font-semibold text-paper disabled:opacity-40"
          >
            {submitting ? "Saving…" : editingId ? "Save Changes" : "Add Category"}
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
            <th className="py-2">Parent</th>
            <th className="py-2">Products</th>
            <th className="py-2">Children</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-steel/10">
          {categories.map((cat) => (
            <tr key={cat.id}>
              <td className="py-2 text-ink">{cat.nameEn}</td>
              <td className="py-2 text-steel">{cat.parent?.nameEn ?? "—"}</td>
              <td className="py-2 text-steel">{cat._count.products}</td>
              <td className="py-2 text-steel">{cat._count.children}</td>
              <td className="py-2 space-x-3 text-right">
                <button onClick={() => startEdit(cat)} className="text-xs text-ink hover:underline">
                  Edit
                </button>
                <button onClick={() => handleDelete(cat.id)} className="text-xs text-steel hover:text-alert">
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
