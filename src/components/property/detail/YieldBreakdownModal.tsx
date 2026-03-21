"use client";

import { Property, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";
import type { Simulation } from "@/domains/simulation/types";

interface Props {
  open: boolean;
  onClose: () => void;
  property: Property;
  simulation: Simulation;
  calcs: PropertyCalculations;
}

export default function YieldBreakdownModal({ open, onClose, property, simulation, calcs }: Props) {
  if (!open) return null;

  const monthlyRent = simulation.monthly_rent > 0 ? simulation.monthly_rent : property.monthly_rent;
  const annualRentBrut = monthlyRent * 12;
  const vacancyRate = simulation.vacancy_rate ?? property.vacancy_rate ?? 5;
  const annualRentNet = annualRentBrut * (1 - vacancyRate / 100);

  const purchasePrice = property.purchase_price;
  const notaryFees = calcs.total_notary_fees;
  const loanFees = simulation.loan_fees ?? property.loan_fees ?? 0;
  const renovationCost = simulation.renovation_cost ?? property.renovation_cost ?? 0;
  const furnitureCost = property.meuble_status === "meuble" ? (property.furniture_cost || 0) : 0;
  const totalProjectCost = calcs.total_project_cost;

  const condoCharges = property.condo_charges || 0;
  const propertyTax = property.property_tax || 0;
  const pnoInsurance = simulation.pno_insurance || 0;
  const maintenanceCost = (simulation.maintenance_per_m2 || 0) * (property.surface || 0);
  const gliRate = simulation.gli_rate || 0;
  const gliCost = annualRentNet * (gliRate / 100);

  const annualCharges = condoCharges + propertyTax + pnoInsurance + maintenanceCost + gliCost;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-4 md:px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#1a1a2e]">Détail des rendements</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 md:px-6 py-4 space-y-5">
          {/* Result banners */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 text-center bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Rendement brut</p>
              <p className="text-2xl font-extrabold text-gray-700 font-[family-name:var(--font-mono)]">
                {calcs.gross_yield.toFixed(2)}%
              </p>
            </div>
            <div className={`rounded-xl p-3 text-center border ${
              calcs.net_yield >= 6 ? "bg-green-50 border-green-200" : calcs.net_yield >= 4 ? "bg-blue-50 border-blue-200" : calcs.net_yield >= 2 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
            }`}>
              <p className="text-xs text-gray-500 mb-1">Rendement net</p>
              <p className={`text-2xl font-extrabold font-[family-name:var(--font-mono)] ${
                calcs.net_yield >= 6 ? "text-green-600" : calcs.net_yield >= 4 ? "text-blue-600" : calcs.net_yield >= 2 ? "text-amber-600" : "text-red-600"
              }`}>
                {calcs.net_yield.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* ═══ RENDEMENT BRUT ═══ */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-1">Rendement brut</h4>
            <p className="text-xs text-gray-400 mb-2">Loyers bruts annuels / Coût total du projet</p>
            <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
              <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-700">Loyer mensuel</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{formatCurrency(monthlyRent)}/mois × 12</p>
                </div>
                <span className="text-sm font-semibold text-green-600 font-[family-name:var(--font-mono)] shrink-0">
                  {formatCurrency(annualRentBrut)}/an
                </span>
              </div>
            </div>

            <div className="mt-2">
              <p className="text-xs text-gray-500 font-medium mb-1">÷ Coût total du projet</p>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
                <Row label="Prix d'achat" value={purchasePrice} />
                <Row label="Frais de notaire" value={notaryFees} param={notaryFees === Math.round(purchasePrice * 0.075) ? "7.5% (ancien)" : notaryFees === Math.round(purchasePrice * 0.025) ? "2.5% (neuf)" : "Manuel"} />
                {loanFees > 0 && <Row label="Frais bancaires" value={loanFees} />}
                {renovationCost > 0 && <Row label="Travaux" value={renovationCost} />}
                {furnitureCost > 0 && <Row label="Mobilier" value={furnitureCost} />}
                <div className="px-3 py-2.5 flex items-center justify-between bg-gray-100/60">
                  <span className="text-sm font-semibold text-gray-800">Total projet</span>
                  <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-gray-800">
                    {formatCurrency(totalProjectCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* Formula */}
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-amber-700">
                {formatCurrency(annualRentBrut)} ÷ {formatCurrency(totalProjectCost)} × 100 = <span className="font-bold">{calcs.gross_yield.toFixed(2)}%</span>
              </p>
            </div>
          </div>

          {/* ═══ RENDEMENT NET ═══ */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-1">Rendement net</h4>
            <p className="text-xs text-gray-400 mb-2">(Loyers nets − Charges) / Coût total du projet</p>

            <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
              <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-700">Loyers nets annuels</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{formatCurrency(annualRentBrut)} − {vacancyRate}% vacance</p>
                </div>
                <span className="text-sm font-semibold text-green-600 font-[family-name:var(--font-mono)] shrink-0">
                  {formatCurrency(annualRentNet)}/an
                </span>
              </div>
            </div>

            <div className="mt-2">
              <p className="text-xs text-gray-500 font-medium mb-1">− Charges annuelles d&apos;exploitation</p>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
                {condoCharges > 0 && <Row label="Charges de copropriété" value={condoCharges} param={`${formatCurrency(condoCharges)}/an`} />}
                {propertyTax > 0 && <Row label="Taxe foncière" value={propertyTax} param={`${formatCurrency(propertyTax)}/an`} />}
                {pnoInsurance > 0 && <Row label="Assurance PNO" value={pnoInsurance} param={`${formatCurrency(pnoInsurance)}/an`} />}
                {maintenanceCost > 0 && <Row label="Provision entretien" value={maintenanceCost} param={`${simulation.maintenance_per_m2} €/m²/an × ${property.surface} m²`} />}
                {gliCost > 0 && <Row label="GLI" value={Math.round(gliCost)} param={`${gliRate}% du loyer net`} />}
                <div className="px-3 py-2.5 flex items-center justify-between bg-gray-100/60">
                  <span className="text-sm font-semibold text-gray-800">Total charges</span>
                  <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-red-600">
                    −{formatCurrency(Math.round(annualCharges))}
                  </span>
                </div>
              </div>
            </div>

            {/* Formula */}
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-amber-700">
                ({formatCurrency(annualRentNet)} − {formatCurrency(Math.round(annualCharges))}) ÷ {formatCurrency(totalProjectCost)} × 100 = <span className="font-bold">{calcs.net_yield.toFixed(2)}%</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, param }: { label: string; value: number; param?: string }) {
  return (
    <div className="px-3 py-2.5 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm text-gray-700">{label}</p>
        {param && <p className="text-[11px] text-gray-400 mt-0.5">{param}</p>}
      </div>
      <span className="text-sm font-semibold font-[family-name:var(--font-mono)] text-gray-700 shrink-0">
        {formatCurrency(value)}
      </span>
    </div>
  );
}
