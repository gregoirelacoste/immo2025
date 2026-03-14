"use client";

import type { RedFlag } from "@/domains/visit/types";

interface Props {
  redFlags: RedFlag[];
  flaggedKeys: string[];
  onToggle: (key: string) => void;
}

export default function VisitRedFlags({ redFlags, flaggedKeys, onToggle }: Props) {
  const criticalFlags = redFlags.filter((f) => f.severity === "critical");
  const warningFlags = redFlags.filter((f) => f.severity === "warning");
  const flaggedCount = flaggedKeys.length;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wide">Alertes</h2>
        {flaggedCount > 0 && (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold">
            {flaggedCount}
          </span>
        )}
      </div>

      {/* Critical flags */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
          Critiques
        </p>
        {criticalFlags.map((flag) => (
          <FlagRow
            key={flag.key}
            flag={flag}
            checked={flaggedKeys.includes(flag.key)}
            onToggle={() => onToggle(flag.key)}
          />
        ))}
      </div>

      {/* Warning flags */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
          Attention
        </p>
        {warningFlags.map((flag) => (
          <FlagRow
            key={flag.key}
            flag={flag}
            checked={flaggedKeys.includes(flag.key)}
            onToggle={() => onToggle(flag.key)}
          />
        ))}
      </div>
    </section>
  );
}

function FlagRow({
  flag,
  checked,
  onToggle,
}: {
  flag: RedFlag;
  checked: boolean;
  onToggle: () => void;
}) {
  const isCritical = flag.severity === "critical";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left min-h-[44px] transition-all active:scale-[0.98] ${
        checked
          ? isCritical
            ? "bg-red-100 ring-2 ring-red-400"
            : "bg-amber-100 ring-2 ring-amber-400"
          : "bg-white border border-tiili-border hover:bg-gray-50"
      }`}
    >
      {/* Checkbox */}
      <div
        className={`w-6 h-6 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${
          checked
            ? isCritical
              ? "bg-red-600 border-red-600"
              : "bg-amber-600 border-amber-600"
            : "border-gray-300"
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1a1a2e]">{flag.label}</p>
        {flag.hint && (
          <p className="text-xs text-gray-500 mt-0.5">{flag.hint}</p>
        )}
      </div>
    </button>
  );
}
