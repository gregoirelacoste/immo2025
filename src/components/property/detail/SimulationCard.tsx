"use client";

import { Property, PropertyCalculations } from "@/domains/property/types";
import { Simulation } from "@/domains/simulation/types";
import { calculateSimulation, formatCurrency, formatPercent } from "@/lib/calculations";

interface Props {
  property: Property;
  simulation: Simulation;
  isActive: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
  canDelete: boolean;
}

export default function SimulationCard({
  property,
  simulation,
  isActive,
  onSelect,
  onDuplicate,
  onDelete,
  canDelete,
}: Props) {
  const calcs = calculateSimulation(property, simulation);

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-xl border p-4 cursor-pointer transition-all ${
        isActive
          ? "border-amber-400 bg-amber-50/50 shadow-sm ring-1 ring-amber-200"
          : "border-tiili-border bg-white hover:border-gray-300"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[#1a1a2e] truncate">{simulation.name}</h4>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Dupliquer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Key params summary */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 mb-3">
        <span>Apport: {formatCurrency(simulation.personal_contribution)}</span>
        <span>Durée: {simulation.loan_duration} ans</span>
        <span>Taux: {simulation.interest_rate}%</span>
        <span>Loyer: {formatCurrency(simulation.monthly_rent)}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className={`text-lg font-bold font-[family-name:var(--font-mono)] ${
            calcs.net_yield >= 6 ? "text-green-600" : calcs.net_yield >= 4 ? "text-blue-600" : calcs.net_yield >= 2 ? "text-amber-600" : "text-red-600"
          }`}>
            {calcs.net_yield.toFixed(2)}%
          </p>
          <p className="text-[10px] text-gray-500 font-medium">Renta nette</p>
        </div>
        <div className="text-center">
          <p className={`text-lg font-bold font-[family-name:var(--font-mono)] ${
            calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            {calcs.monthly_cashflow > 0 ? "+" : ""}{Math.round(calcs.monthly_cashflow)}{"\u202f"}&euro;
          </p>
          <p className="text-[10px] text-gray-500 font-medium">Cash-flow</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-700 font-[family-name:var(--font-mono)]">
            {formatCurrency(calcs.total_loan_cost)}
          </p>
          <p className="text-[10px] text-gray-500 font-medium">Coût crédit</p>
        </div>
      </div>
    </div>
  );
}
