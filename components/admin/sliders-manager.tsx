"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageUploader } from "@/components/image-uploader";

export type SliderItem = {
  id: string;
  url: string;
  alt: string | null;
  link: string | null;
  isActive: boolean;
  sortOrder: number;
};

type SlidePatch = Partial<
  Pick<SliderItem, "alt" | "link" | "isActive" | "sortOrder">
>;

export function SlidersManager({
  initialSlides,
}: {
  initialSlides: SliderItem[];
}) {
  const [slides, setSlides] = useState<SliderItem[]>(initialSlides);
  const [error, setError] = useState("");

  const sorted = [...slides].sort((a, b) => a.sortOrder - b.sortOrder);

  async function addSlide(url: string) {
    setError("");
    const res = await fetch("/api/admin/sliders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to add slide");
      return;
    }

    const body = await res.json();
    setSlides((prev) => [...prev, body.data]);
  }

  async function updateSlide(id: string, patch: SlidePatch) {
    setError("");
    const res = await fetch(`/api/admin/sliders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update slide");
      return;
    }

    const body = await res.json();
    setSlides((prev) => prev.map((s) => (s.id === id ? body.data : s)));
  }

  async function deleteSlide(id: string) {
    setError("");
    const res = await fetch(`/api/admin/sliders/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to delete slide");
      return;
    }

    setSlides((prev) => prev.filter((s) => s.id !== id));
  }

  function move(id: string, direction: "up" | "down") {
    const index = sorted.findIndex((s) => s.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;

    const a = sorted[index];
    const b = sorted[swapWith];

    // Two independent PATCH calls swapping sortOrder — same simple
    // approach as the product-images reorder, fine for a single admin.
    updateSlide(a.id, { sortOrder: b.sortOrder });
    updateSlide(b.id, { sortOrder: a.sortOrder });
  }

  return (
    <div className="rounded-lg border border-steel/15 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">
        Slides
      </p>
      <p className="mt-1 text-xs text-steel">
        Leave the link blank for a slide that just shows an image with no
        click-through. Only active slides show up in the homepage carousel.
      </p>

      {sorted.length === 0 && (
        <p className="mt-4 text-xs text-steel">No slides yet.</p>
      )}

      <div className="mt-4 space-y-3">
        {sorted.map((slide, i) => (
          <div
            key={slide.id}
            className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center ${
              slide.isActive ? "border-steel/15" : "border-steel/15 opacity-50"
            }`}
          >
            <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-md bg-steel/5 sm:h-16 sm:w-28">
              <Image
                src={slide.url}
                alt={slide.alt ?? ""}
                fill
                className="object-cover"
                sizes="112px"
              />
            </div>

            <div className="flex-1 space-y-2">
              <input
                defaultValue={slide.alt ?? ""}
                placeholder="Alt text"
                onBlur={(e) =>
                  e.target.value !== (slide.alt ?? "") &&
                  updateSlide(slide.id, { alt: e.target.value })
                }
                className="w-full rounded border border-steel/15 px-2 py-1 text-xs text-ink focus:border-ink"
              />
              <input
                defaultValue={slide.link ?? ""}
                placeholder="Link (optional) — /products/... or https://..."
                onBlur={(e) =>
                  e.target.value !== (slide.link ?? "") &&
                  updateSlide(slide.id, { link: e.target.value })
                }
                className="w-full rounded border border-steel/15 px-2 py-1 text-xs text-ink focus:border-ink"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  updateSlide(slide.id, { isActive: !slide.isActive })
                }
                className={`rounded-md border px-2 py-1 font-medium ${
                  slide.isActive
                    ? "border-steel/25 text-steel hover:border-ink hover:text-ink"
                    : "border-ink bg-ink text-paper"
                }`}
              >
                {slide.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                onClick={() => move(slide.id, "up")}
                disabled={i === 0}
                className="text-steel hover:text-ink disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(slide.id, "down")}
                disabled={i === sorted.length - 1}
                className="text-steel hover:text-ink disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => deleteSlide(slide.id)}
                className="text-alert hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-steel/10 pt-4">
        <p className="text-xs font-medium text-steel">Add slide</p>
        <ImageUploader value="" onChange={addSlide} folder="sliders" />
      </div>

      {error && <p className="mt-2 text-xs text-alert">{error}</p>}
    </div>
  );
}
