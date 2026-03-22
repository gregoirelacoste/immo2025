"use client";

import { useMemo, useState } from "react";
import { Property } from "@/domains/property/types";
import { Simulation } from "@/domains/simulation/types";
import { formatCurrency, getEffectiveRent } from "@/lib/calculations";
import { useAuthGate } from "@/components/ui/AuthGate";

interface Props {
  property: Property;
  simulations: Simulation[];
  activeSim: Simulation;
  activeSimId: string;
  isLoggedIn?: boolean;
  onSimSwitch: (simId: string) => void;
  onOpenDrawer: () => void;
}

export default function SimulationBanner({ property, simulations, activeSim, activeSimId, isLoggedIn = false, onSimSwitch, onOpenDrawer }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [handleGatedClick, authModal] = useAuthGate(isLoggedIn, {
    icon: (
      <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.505-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25Z" />
      </svg>
    ),
    title: "Simulez vos scénarios",
    description: "Comparez différents taux, durées et loyers pour optimiser votre investissement.",
  });

  const isSystem = activeSimId === "__system__";
  const effectiveRent = useMemo(() => getEffectiveRent(property, activeSim), [property, activeSim]);

  const allOptions = [
    { id: "__system__", name: "Défaut", isSystem: true },
    ...simulations.map((s) => ({ id: s.id, name: s.name, isSystem: false })),
  ];

  return (
    <div className="bg-white/90 backdrop-blur border-b border-tiili-border -mx-4 px-4 md:-mx-6 md:px-6 py-2">
      <div className="flex items-center justify-between gap-2">
        {/* Left: scenario selector */}
        <div className="relative min-w-0 flex-1">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 min-w-0 group"
          >
            <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.505-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25Z" />
            </svg>
            <span className="text-xs font-semibold text-[#1a1a2e] truncate">
              {activeSim.name}
            </span>
            {isSystem && (
              <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-blue-50 text-blue-600 shrink-0">
                Synchro auto
              </span>
            )}
            <svg className="w-3 h-3 text-gray-400 shrink-0 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl border border-tiili-border shadow-lg z-50 py-1">
                {allOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setDropdownOpen(false);
                      onSimSwitch(opt.id);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                      opt.id === activeSimId
                        ? "bg-amber-50 text-amber-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {opt.isSystem && (
                      <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    )}
                    <span className="truncate">{opt.name}</span>
                    {opt.id === activeSimId && (
                      <svg className="w-3.5 h-3.5 text-amber-600 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Center: summary KPIs */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-500 shrink-0">
          <span>{activeSim.interest_rate}% / {activeSim.loan_duration} ans</span>
          <span className="text-gray-300">|</span>
          <span>{formatCurrency(effectiveRent)}/mois</span>
        </div>

        {/* Right: edit button */}
        <button
          onClick={isLoggedIn ? onOpenDrawer : handleGatedClick}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
          Simuler
        </button>
      </div>
      {authModal}
    </div>
  );
}
