"use client";

import { AMENITY_KEYS, AMENITY_LABELS, AMENITY_ICONS, type AmenityKey } from "@/domains/property/amenities";

interface Props {
  selected: AmenityKey[];
  onChange: (amenities: AmenityKey[]) => void;
}

export default function AmenitiesSection({ selected, onChange }: Props) {
  const toggle = (key: AmenityKey) => {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Equipements</h2>
      <div className="flex flex-wrap gap-2">
        {AMENITY_KEYS.map((key) => {
          const active = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                active
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-gray-100 text-gray-600 border border-tiili-border hover:bg-gray-200"
              }`}
            >
              <span>{AMENITY_ICONS[key]}</span>
              <span>{AMENITY_LABELS[key]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
