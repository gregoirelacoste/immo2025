"use client";

import type { Equipment } from "@/domains/property/equipment-service";

const CATEGORY_LABELS: Record<string, string> = {
  exterieur: "Extérieur",
  confort: "Confort",
  securite: "Sécurité",
  technique: "Technique",
  general: "Autres",
};

const CATEGORY_ORDER = ["exterieur", "securite", "confort", "technique", "general"];

interface Props {
  selected: string[];
  onChange: (amenities: string[]) => void;
  equipments: Equipment[];
}

export default function AmenitiesSection({ selected, onChange, equipments }: Props) {
  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  // Grouper par catégorie
  const byCategory = new Map<string, Equipment[]>();
  for (const eq of equipments) {
    const cat = eq.category || "general";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(eq);
  }

  const sortedCategories = CATEGORY_ORDER.filter((c) => byCategory.has(c));
  // Ajouter les catégories non prévues
  for (const cat of byCategory.keys()) {
    if (!sortedCategories.includes(cat)) sortedCategories.push(cat);
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Equipements</h2>
      {sortedCategories.map((cat) => (
        <div key={cat} className="mb-3 last:mb-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            {CATEGORY_LABELS[cat] || cat}
          </p>
          <div className="flex flex-wrap gap-2">
            {byCategory.get(cat)!.map((eq) => {
              const active = selected.includes(eq.key);
              return (
                <button
                  key={eq.key}
                  type="button"
                  onClick={() => toggle(eq.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                    active
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-gray-100 text-gray-600 border border-tiili-border hover:bg-gray-200"
                  }`}
                >
                  <span>{eq.icon}</span>
                  <span>{eq.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
