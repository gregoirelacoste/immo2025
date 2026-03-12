"use client";

import { formatCurrency } from "@/lib/calculations";

interface Props {
  monthlyIncome: number;
  existingCredits: number;
  maxDebtRatio: number;
  interestRate: number;
  loanDuration: number;
}

/** Solve for principal given monthly payment, rate, duration */
function maxBorrowable(maxMonthly: number, annualRate: number, durationYears: number): number {
  if (maxMonthly <= 0 || durationYears <= 0) return 0;
  if (annualRate === 0) return maxMonthly * durationYears * 12;
  const r = annualRate / 100 / 12;
  const n = durationYears * 12;
  return maxMonthly * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
}

export default function BorrowingCapacity({
  monthlyIncome, existingCredits, maxDebtRatio, interestRate, loanDuration,
}: Props) {
  const maxMonthlyPayment = Math.max(0, monthlyIncome * (maxDebtRatio / 100) - existingCredits);
  const borrowable = maxBorrowable(maxMonthlyPayment, interestRate, loanDuration);
  // Prix max bien = empruntable / 1.075 (frais notaire ancien ~7.5%)
  const maxPropertyPrice = Math.round(borrowable / 1.075);

  return (
    <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
      <h3 className="text-sm font-semibold text-indigo-800 mb-2">Capacité d&apos;emprunt estimée</h3>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <span className="text-indigo-500 text-xs">Mensualité max</span>
          <p className="font-bold text-indigo-900">{formatCurrency(maxMonthlyPayment)}</p>
        </div>
        <div>
          <span className="text-indigo-500 text-xs">Empruntable</span>
          <p className="font-bold text-indigo-900">{formatCurrency(Math.round(borrowable))}</p>
        </div>
        <div>
          <span className="text-indigo-500 text-xs">Prix bien max</span>
          <p className="font-bold text-indigo-900">{formatCurrency(maxPropertyPrice)}</p>
        </div>
      </div>
      <p className="text-xs text-indigo-500 mt-2">
        Sur {loanDuration} ans à {interestRate}%, hors assurance
      </p>
    </div>
  );
}
