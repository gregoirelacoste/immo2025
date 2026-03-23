"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Property } from "@/domains/property/types";
import type { Simulation } from "@/domains/simulation/types";
import { calculateAll, calculateSimulation, formatCurrency, formatPercent, getEffectivePrice } from "@/lib/calculations";
import CompareSelector from "./CompareSelector";

const MAX_SELECTED = 4;

type MetricRow = {
  label: string;
  values: (string | number)[];
  raw: number[];
  best: "max" | "min" | "none";
};

type SectionDef = {
  title: string;
  rows: MetricRow[];
};

function buildSections(properties: Property[], simulationsMap: Record<string, Simulation>): SectionDef[] {
  const calcs = properties.map((p) => {
    const sim = simulationsMap[p.id];
    return sim ? calculateSimulation(p, sim) : calculateAll(p);
  });

  const row = (
    label: string,
    getter: (p: Property, c: ReturnType<typeof calculateAll>, i: number) => { display: string | number; raw: number },
    best: "max" | "min" | "none" = "none"
  ): MetricRow => {
    const results = properties.map((p, i) => getter(p, calcs[i], i));
    return {
      label,
      values: results.map((r) => r.display),
      raw: results.map((r) => r.raw),
      best,
    };
  };

  return [
    {
      title: "Bien",
      rows: [
        row("Ville", (p) => ({ display: p.city || "-", raw: 0 })),
        row("Surface", (p) => ({ display: p.surface > 0 ? `${p.surface} m²` : "-", raw: p.surface }), "max"),
        row("Prix d'achat", (p) => ({ display: formatCurrency(getEffectivePrice(p)), raw: getEffectivePrice(p) }), "min"),
        row("Prix/m²", (p) => {
          const v = p.surface > 0 ? Math.round(getEffectivePrice(p) / p.surface) : 0;
          return { display: v > 0 ? formatCurrency(v) : "-", raw: v };
        }, "min"),
        row("DPE", (p) => ({ display: p.dpe_rating || "-", raw: p.dpe_rating ? (72 - p.dpe_rating.charCodeAt(0)) : -999 }), "max"),
      ],
    },
    {
      title: "Financement",
      rows: [
        row("Apport", (p) => ({ display: formatCurrency(p.personal_contribution), raw: p.personal_contribution }), "min"),
        row("Emprunt", (p) => ({ display: formatCurrency(p.loan_amount), raw: p.loan_amount })),
        row("Mensualite (credit+assurance)", (_p, c) => {
          const v = c.monthly_payment + c.monthly_insurance;
          return { display: formatCurrency(Math.round(v)), raw: v };
        }, "min"),
        row("Cout total projet", (_p, c) => ({ display: formatCurrency(c.total_project_cost), raw: c.total_project_cost }), "min"),
      ],
    },
    {
      title: "Rentabilite",
      rows: [
        row("Loyer mensuel", (p) => ({ display: formatCurrency(p.monthly_rent), raw: p.monthly_rent }), "max"),
        row("Renta brute", (_p, c) => ({ display: formatPercent(c.gross_yield), raw: c.gross_yield }), "max"),
        row("Renta nette", (_p, c) => ({ display: formatPercent(c.net_yield), raw: c.net_yield }), "max"),
        row("Renta net-net", (_p, c) => ({ display: formatPercent(c.net_net_yield), raw: c.net_net_yield }), "max"),
        row("Cash-flow/mois", (_p, c) => ({ display: formatCurrency(Math.round(c.monthly_cashflow)), raw: c.monthly_cashflow }), "max"),
      ],
    },
    {
      title: "Fiscalite",
      rows: [
        row("Impot Micro-BIC", (_p, c) => ({ display: formatCurrency(c.fiscal.micro_bic_tax), raw: c.fiscal.micro_bic_tax }), "min"),
        row("Impot LMNP Reel", (_p, c) => ({ display: formatCurrency(c.fiscal.lmnp_reel_tax), raw: c.fiscal.lmnp_reel_tax }), "min"),
        row("Economie fiscale", (_p, c) => ({ display: formatCurrency(c.fiscal.fiscal_savings), raw: c.fiscal.fiscal_savings }), "max"),
      ],
    },
    {
      title: "Score",
      rows: [
        row("Score investissement", (p) => {
          const v = p.investment_score;
          return { display: v != null ? `${v}/100` : "-", raw: v ?? -1 };
        }, "max"),
      ],
    },
  ];
}

function getBestIndex(raw: number[], best: "max" | "min" | "none"): number | null {
  if (best === "none") return null;
  const validValues = raw.filter((v) => v > -999);
  if (validValues.length < 2) return null;
  const target = best === "max" ? Math.max(...validValues) : Math.min(...validValues);
  // Only highlight if not all equal
  if (validValues.every((v) => v === target)) return null;
  return raw.indexOf(target);
}

interface CompareViewProps {
  properties: Property[];
  simulationsMap: Record<string, Simulation>;
}

export default function CompareView({ properties, simulationsMap }: CompareViewProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const handleToggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedProperties = useMemo(
    () => properties.filter((p) => selected.includes(p.id)),
    [properties, selected]
  );

  const sections = useMemo(
    () => (comparing ? buildSections(selectedProperties, simulationsMap) : []),
    [comparing, selectedProperties]
  );

  if (!comparing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Comparer des biens</h1>
          <span className="text-sm text-gray-500">
            {selected.length}/{MAX_SELECTED} selectionnes
          </span>
        </div>

        {properties.length === 0 ? (
          <p className="text-gray-500 text-center py-12">
            Aucun bien disponible. Ajoutez des biens depuis le dashboard.
          </p>
        ) : (
          <>
            <CompareSelector
              properties={properties}
              selected={selected}
              onToggle={handleToggle}
              maxSelected={MAX_SELECTED}
            />
            <div className="mt-6 flex justify-center">
              <button
                disabled={selected.length < 2}
                onClick={() => setComparing(true)}
                className="px-6 py-3 bg-amber-600 text-white font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-700 transition-colors"
              >
                Comparer ({selected.length})
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Comparison table
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Comparaison</h1>
        <button
          onClick={() => setComparing(false)}
          className="text-sm text-amber-600 hover:text-amber-800 font-medium"
        >
          Modifier la selection
        </button>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full min-w-[600px] border-collapse">
          {/* Header: property names */}
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 w-44 min-w-[176px]" />
              {selectedProperties.map((p) => {
                const images: string[] = p.image_urls ? (() => { try { return JSON.parse(p.image_urls); } catch { return []; } })() : [];
                const thumb = images[0] || null;
                return (
                  <th key={p.id} className="px-3 py-3 text-center min-w-[140px]">
                    {thumb && (
                      <div className="w-full h-16 mb-1 rounded-lg overflow-hidden bg-gray-100 mx-auto max-w-[160px] relative">
                        <Image src={thumb} alt={p.city || ""} fill className="object-cover" sizes="160px" unoptimized />
                      </div>
                    )}
                    <p className="font-semibold text-sm text-[#1a1a2e] truncate">
                      {p.city || "Ville inconnue"}
                    </p>
                    {p.address && (
                      <p className="text-xs text-gray-500 truncate">{p.address}</p>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {sections.map((section) => (
              <>
                {/* Section header */}
                <tr key={`section-${section.title}`}>
                  <td
                    colSpan={selectedProperties.length + 1}
                    className="pt-5 pb-2 px-3 text-xs font-bold text-amber-600 uppercase tracking-wider border-b border-amber-100"
                  >
                    {section.title}
                  </td>
                </tr>

                {/* Metric rows */}
                {section.rows.map((row) => {
                  const bestIdx = getBestIndex(row.raw, row.best);
                  return (
                    <tr key={`${section.title}-${row.label}`} className="border-b border-gray-100">
                      <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2.5 text-sm text-gray-600 font-medium whitespace-nowrap">
                        {row.label}
                      </td>
                      {row.values.map((val, i) => (
                        <td
                          key={i}
                          className={`px-3 py-2.5 text-sm text-center font-medium whitespace-nowrap ${
                            bestIdx === i
                              ? "bg-green-50 text-green-700"
                              : "text-[#1a1a2e]"
                          }`}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
