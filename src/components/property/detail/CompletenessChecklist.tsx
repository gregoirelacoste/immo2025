"use client";

import { useState } from "react";
import Link from "next/link";
import { Property } from "@/domains/property/types";

interface CheckItem {
  label: string;
  done: boolean;
}

function getChecklist(p: Property): CheckItem[] {
  return [
    { label: "Prix d'achat", done: p.purchase_price > 0 },
    { label: "Surface", done: p.surface > 0 },
    { label: "Adresse / ville", done: !!(p.city && p.city.trim()) },
    { label: "Loyer mensuel", done: p.monthly_rent > 0 },
    { label: "Credit configure", done: p.loan_amount > 0 && p.interest_rate > 0 },
    { label: "Taxe fonciere", done: p.property_tax > 0 },
    { label: "Charges copro", done: p.condo_charges > 0 },
    { label: "Travaux estimes", done: p.renovation_cost > 0 || hasTravaux(p) },
    { label: "DPE renseigne", done: !!p.dpe_rating && p.dpe_rating !== "" },
  ];
}

function hasTravaux(p: Property): boolean {
  try {
    const ratings = JSON.parse(p.travaux_ratings || "{}");
    return Object.keys(ratings).length > 0;
  } catch {
    return false;
  }
}

export default function CompletenessChecklist({ property }: { property: Property }) {
  const [expanded, setExpanded] = useState(false);
  const items = getChecklist(property);
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const allDone = doneCount === total;
  const pct = Math.round((doneCount / total) * 100);

  // Don't show at all if everything is complete
  if (allDone) return null;

  const missing = items.filter((i) => !i.done);

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 bg-white rounded-xl border border-tiili-border px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        {/* Progress ring */}
        <svg className="w-8 h-8 shrink-0" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#f0f0ee"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={pct >= 80 ? "#22c55e" : pct >= 50 ? "#d97706" : "#ef4444"}
            strokeWidth="3"
            strokeDasharray={`${pct}, 100`}
            strokeLinecap="round"
          />
          <text x="18" y="21" textAnchor="middle" className="text-[10px] font-bold fill-gray-600">
            {doneCount}/{total}
          </text>
        </svg>

        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-[#1a1a2e]">
            Complétude du bien
          </p>
          <p className="text-[11px] text-gray-400">
            {missing.length} info{missing.length > 1 ? "s" : ""} manquante{missing.length > 1 ? "s" : ""} pour un calcul fiable
          </p>
        </div>

        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="bg-white rounded-b-xl border border-t-0 border-tiili-border px-4 pb-3 -mt-1">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.label} className="flex items-center gap-2 py-1">
                {item.done ? (
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <span className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />
                )}
                <span className={`text-sm ${item.done ? "text-gray-400" : "text-[#1a1a2e] font-medium"}`}>
                  {item.label}
                </span>
                {!item.done && (
                  <Link
                    href={`/property/${property.id}/edit`}
                    className="ml-auto text-[11px] text-amber-600 hover:underline whitespace-nowrap"
                  >
                    Compléter
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
