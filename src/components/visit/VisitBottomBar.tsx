"use client";

import type { VisitPhase } from "@/domains/visit/types";

interface Props {
  currentPhase: VisitPhase;
  onPhaseChange: (phase: VisitPhase) => void;
  redFlagCount?: number;
  photoCount?: number;
}

const PHASES: { key: VisitPhase; label: string; icon: string }[] = [
  { key: "avant", label: "Préparer", icon: "📋" },
  { key: "pendant", label: "Visiter", icon: "📸" },
  { key: "apres", label: "Analyser", icon: "📊" },
];

export default function VisitBottomBar({
  currentPhase,
  onPhaseChange,
  redFlagCount = 0,
  photoCount = 0,
}: Props) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-tiili-border"
      style={{ paddingBottom: "var(--sab, 0px)" }}
    >
      <div className="max-w-lg mx-auto flex items-center">
        {PHASES.map((phase) => {
          const isActive = currentPhase === phase.key;
          return (
            <button
              key={phase.key}
              type="button"
              onClick={() => onPhaseChange(phase.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[52px] transition-colors relative ${
                isActive
                  ? "text-amber-700"
                  : "text-gray-500"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-2 right-2 h-0.5 bg-amber-600 rounded-full" />
              )}
              <span className="text-base leading-none">{phase.icon}</span>
              <span className={`text-[11px] ${isActive ? "font-bold" : "font-medium"}`}>
                {phase.label}
              </span>
              {/* Badges */}
              {phase.key === "pendant" && photoCount > 0 && (
                <span className="absolute top-1 right-1/4 w-4 h-4 bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {photoCount > 9 ? "9+" : photoCount}
                </span>
              )}
              {phase.key === "apres" && redFlagCount > 0 && (
                <span className="absolute top-1 right-1/4 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {redFlagCount > 9 ? "9+" : redFlagCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
