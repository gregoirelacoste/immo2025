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

export default function LoanCostBreakdownModal({ open, onClose, property, simulation, calcs }: Props) {
  if (!open) return null;

  const { loanBreakdown: lb } = calcs;
  const loanDuration = simulation.loan_duration;
  const loanFees = simulation.loan_fees ?? property.loan_fees ?? 0;
  const totalMonths = loanDuration * 12;
  // Derive loanAmount from total interest: totalPayments - totalInterest = loanAmount
  const loanAmount = calcs.monthly_payment * totalMonths - lb.totalInterest;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-4 md:px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#1a1a2e]">Détail du coût du crédit</h3>
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
          {/* Result banner */}
          <div className="rounded-xl p-4 text-center bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Coût total du crédit</p>
            <p className="text-3xl font-extrabold text-gray-800 font-[family-name:var(--font-mono)]">
              {formatCurrency(calcs.total_loan_cost)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              soit {loanAmount > 0 ? Math.round(calcs.total_loan_cost / loanAmount * 100) : 0}% du montant emprunté
            </p>
          </div>

          {/* Paramètres du prêt */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Paramètres du prêt</h4>
            <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
              <Row label="Montant emprunté" value={formatCurrency(Math.round(loanAmount))} />
              <Row label="Taux d'intérêt" value={`${simulation.interest_rate}%`} />
              <Row label="Durée" value={`${loanDuration} ans (${totalMonths} mois)`} />
              <Row label="Taux assurance" value={`${simulation.insurance_rate}%`} />
              <Row label="Mensualité crédit" value={`${formatCurrency(calcs.monthly_payment)}/mois`} />
              <Row label="Assurance emprunteur" value={`${formatCurrency(calcs.monthly_insurance)}/mois`} />
            </div>
          </div>

          {/* Décomposition du coût */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Décomposition du coût total</h4>
            <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
              <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-700">Intérêts cumulés</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatCurrency(calcs.monthly_payment)} × {totalMonths} mois − {formatCurrency(Math.round(loanAmount))}
                  </p>
                </div>
                <span className="text-sm font-semibold font-[family-name:var(--font-mono)] text-red-600 shrink-0">
                  {formatCurrency(lb.totalInterest)}
                </span>
              </div>
              <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-700">Assurance emprunteur</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatCurrency(calcs.monthly_insurance)} × {totalMonths} mois
                  </p>
                </div>
                <span className="text-sm font-semibold font-[family-name:var(--font-mono)] text-red-600 shrink-0">
                  {formatCurrency(lb.totalInsurance)}
                </span>
              </div>
              {loanFees > 0 && (
                <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-700">Frais de dossier bancaire</p>
                  </div>
                  <span className="text-sm font-semibold font-[family-name:var(--font-mono)] text-red-600 shrink-0">
                    {formatCurrency(loanFees)}
                  </span>
                </div>
              )}
              <div className="px-3 py-2.5 flex items-center justify-between bg-gray-100/60">
                <span className="text-sm font-semibold text-gray-800">Total coût crédit</span>
                <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-gray-800">
                  {formatCurrency(calcs.total_loan_cost)}
                </span>
              </div>
            </div>
          </div>

          {/* Répartition année 1 */}
          {lb.year1Interest > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Répartition en année 1</h4>
              <p className="text-xs text-gray-400 mb-2">Sur chaque mensualité de {formatCurrency(calcs.monthly_payment)}</p>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
                <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-700">Part intérêts (année 1)</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      ~{formatCurrency(Math.round(lb.year1Interest / 12))}/mois en moyenne
                    </p>
                  </div>
                  <span className="text-sm font-semibold font-[family-name:var(--font-mono)] text-red-600 shrink-0">
                    {formatCurrency(lb.year1Interest)}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-700">Part capital remboursé (année 1)</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      ~{formatCurrency(Math.round(lb.year1Capital / 12))}/mois en moyenne
                    </p>
                  </div>
                  <span className="text-sm font-semibold font-[family-name:var(--font-mono)] text-green-600 shrink-0">
                    {formatCurrency(lb.year1Capital)}
                  </span>
                </div>
              </div>

              {/* Visual bar */}
              <div className="mt-3 h-3 rounded-full overflow-hidden bg-gray-200 flex">
                <div
                  className="bg-red-400 h-full"
                  style={{ width: `${Math.round(lb.year1Interest / (lb.year1Interest + lb.year1Capital) * 100)}%` }}
                />
                <div
                  className="bg-green-400 h-full"
                  style={{ width: `${Math.round(lb.year1Capital / (lb.year1Interest + lb.year1Capital) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>Intérêts ({Math.round(lb.year1Interest / (lb.year1Interest + lb.year1Capital) * 100)}%)</span>
                <span>Capital ({Math.round(lb.year1Capital / (lb.year1Interest + lb.year1Capital) * 100)}%)</span>
              </div>
            </div>
          )}

          {/* Formule */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-amber-700">
              {formatCurrency(lb.totalInterest)} intérêts + {formatCurrency(lb.totalInsurance)} assurance
              {loanFees > 0 ? ` + ${formatCurrency(loanFees)} frais` : ""}
              {" "}= <span className="font-bold">{formatCurrency(calcs.total_loan_cost)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5 flex items-center justify-between gap-2">
      <p className="text-sm text-gray-700">{label}</p>
      <span className="text-sm font-semibold font-[family-name:var(--font-mono)] text-gray-700 shrink-0">{value}</span>
    </div>
  );
}
