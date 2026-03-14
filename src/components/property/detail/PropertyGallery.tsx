"use client";

import { useState } from "react";

interface Props {
  imageUrls: string;
  city: string;
}

export default function PropertyGallery({ imageUrls, city }: Props) {
  const images: string[] = (() => {
    try { return JSON.parse(imageUrls || "[]"); }
    catch { return []; }
  })();

  const [failed, setFailed] = useState<Set<number>>(new Set());

  const visible = images.filter((_, i) => !failed.has(i));

  if (images.length === 0 || visible.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-tiili-border overflow-hidden">
      <div className="flex gap-1 overflow-x-auto snap-x snap-mandatory">
        {images.map((url: string, i: number) => {
          if (failed.has(i)) return null;
          return (
            <div key={i} className="snap-center shrink-0 w-full md:w-auto md:max-w-[400px] aspect-[4/3] relative bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Photo ${i + 1} — ${city}`}
                className="w-full h-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
                referrerPolicy="no-referrer"
                onError={() => setFailed(prev => new Set(prev).add(i))}
              />
            </div>
          );
        })}
      </div>
      {visible.length > 1 && (
        <p className="text-xs text-gray-400 text-center py-2">
          {visible.length} photos — glissez pour voir
        </p>
      )}
    </section>
  );
}
