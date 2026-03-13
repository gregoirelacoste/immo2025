"use client";

import { useState } from "react";
import { AlertResult } from "@/domains/alert/check-alerts";

interface Props {
  alertResult: AlertResult;
}

export default function AlertBadge({ alertResult }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (alertResult.alerts.length === 0) return null;

  const passedCount = alertResult.alerts.filter((a) => a.passed).length;
  const totalCount = alertResult.alerts.length;
  const allPassed = alertResult.matchesAll;
  const somePassed = passedCount > 0 && !allPassed;

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${
          allPassed
            ? "bg-green-100 text-green-700"
            : somePassed
            ? "bg-amber-100 text-amber-700"
            : "bg-red-100 text-red-700"
        }`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        {allPassed ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        )}
        <span>{passedCount}/{totalCount}</span>
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50">
          <p className="text-xs font-semibold text-gray-700 mb-2">Alertes seuils</p>
          <div className="space-y-1.5">
            {alertResult.alerts.map((alert) => (
              <div key={alert.type} className="flex items-start gap-2 text-xs">
                <span className={alert.passed ? "text-green-600" : "text-red-500"}>
                  {alert.passed ? "\u2713" : "\u2717"}
                </span>
                <div>
                  <span className="font-medium text-gray-700">{alert.label}:</span>{" "}
                  <span className="text-gray-500">{alert.value}</span>
                  <span className="text-gray-400"> ({alert.threshold})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
