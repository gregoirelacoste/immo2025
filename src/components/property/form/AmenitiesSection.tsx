"use client";

import { AMENITY_KEYS, AMENITY_LABELS, AMENITY_ICONS, type AmenityKey } from "@/domains/property/amenities";

interface Props {
  selected: AmenityKey[];
  onChange: (amenities: AmenityKey[]) => void;
  readOnly?: boolean;
}

export default function AmenitiesSection({ selected, onChange, readOnly }: Props) {
  const toggle = (key: AmenityKey) => {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  // In readOnly mode, only show selected amenities
  if (readOnly) {
    if (selected.length === 0) return null;
    return (
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Equipements</h2>
        <div className="flex flex-wrap gap-2">
          {selected.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 border border-indigo-300"
            >
              <span>{AMENITY_ICONS[key]}</span>
              <span>{AMENITY_LABELS[key]}</span>
            </span>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
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
                  ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                  : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
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
