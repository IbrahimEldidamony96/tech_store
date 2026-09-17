"use client";

import { useState } from "react";
import Image from "next/image";

type GalleryImage = {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
};

export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  // Start on whichever image is primary (falls back to the first image, or
  // -1 -> 0 -> undefined -> "No image" placeholder if the product has none).
  const primaryIndex = Math.max(
    images.findIndex((img) => img.isPrimary),
    0,
  );
  const [selectedIndex, setSelectedIndex] = useState(primaryIndex);

  const selected = images[selectedIndex];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg border border-steel/15 bg-steel/5">
        {selected ? (
          <Image
            src={selected.url}
            alt={selected.alt ?? productName}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 40vw, 90vw"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-steel">
            No image
          </div>
        )}
      </div>

      {/* Only worth a thumbnail row if there's more than one image to
          choose between. */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelectedIndex(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-current={i === selectedIndex}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-steel/5 transition-colors ${
                i === selectedIndex
                  ? "border-ink"
                  : "border-steel/15 hover:border-steel/40"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt ?? `${productName} thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
