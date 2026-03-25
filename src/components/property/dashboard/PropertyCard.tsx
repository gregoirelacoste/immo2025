"use client";

import Link from "next/link";
import { Property, PropertyCalculations, ExitSimulation, PROPERTY_STATUS_CONFIG, type PropertyStatus } from "@/domains/property/types";
import { getGrade, cashflowColor } from "@/lib/grade";
import { useUserMode } from "@/contexts/UserModeContext";

interface Props {
  property: Property;
  calcs: PropertyCalculations;
  exitSim: ExitSimulation;
  index?: number;
}

/** Format number with narrow non-breaking spaces */
function fmt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
}

/** Relative time ago in French */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}j`;
}

function getRentaBarWidth(renta: number): number {
  const clamped = Math.max(0, Math.min(renta, 8));
  return (clamped / 8) * 100;
}

function getRentaColor(renta: number): string {
  if (renta >= 5) return "#059669";
  if (renta >= 3) return "#d97706";
  if (renta < 0) return "#dc2626";
  return "#f59e0b";
}

const SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: "#0d9488", text: "#f0fdfa" },
  B: { bg: "#2563eb", text: "#eff6ff" },
  C: { bg: "#d97706", text: "#fffbeb" },
  D: { bg: "#dc2626", text: "#fef2f2" },
  "?": { bg: "#9ca3af", text: "#f9fafb" },
};

function getCashflowPrefix(cf: number): string {
  return cf > 0 ? "+" : "";
}

export default function PropertyCard({ property: p, calcs: c, exitSim, index = 0 }: Props) {
  const { isBeginner } = useUserMode();
  const grade = getGrade(p.investment_score);
  const status = (p.property_status || "added") as PropertyStatus;
  const scoreNum = p.investment_score ?? 0;
  const scoreLetter = grade.letter;
  const colors = SCORE_COLORS[scoreLetter] || SCORE_COLORS["?"];
  const isPositiveCf = c.monthly_cashflow >= 0;
  const rentaWidth = getRentaBarWidth(c.net_yield);
  const rentaColor = getRentaColor(c.net_yield);
  const cfColor = cashflowColor(c.monthly_cashflow);

  return (
    <Link
      href={`/property/${p.id}`}
      className={`flex items-center gap-3.5 px-3.5 py-3 rounded-[14px] border transition-all active:scale-[0.99] ${
        isPositiveCf
          ? "bg-green-50/60 border-green-200"
          : "bg-white border-[#f0ece4]"
      }`}
      style={{
        animationDelay: `${index * 0.06}s`,
      }}
    >
      {/* Score brick */}
      <div
        className="w-[54px] h-[62px] rounded-md flex flex-col items-center justify-center shrink-0 relative overflow-hidden"
        style={{ background: colors.bg }}
      >
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.1,
            background: `repeating-linear-gradient(0deg, transparent, transparent 19px, ${colors.text} 19px, ${colors.text} 20px)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.07,
            background: `repeating-linear-gradient(90deg, transparent, transparent 25px, ${colors.text} 25px, ${colors.text} 26px)`,
          }}
        />
        <span className="text-[11px] font-bold leading-none z-10" style={{ color: colors.text, opacity: 0.8 }}>
          {scoreLetter}
        </span>
        <span className="text-[20px] font-extrabold leading-tight z-10" style={{ color: colors.text }}>
          {scoreNum}
        </span>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        {/* Line 1: City + Quartier */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className={`w-[7px] h-[7px] rounded-full shrink-0 ${PROPERTY_STATUS_CONFIG[status]?.dotColor || "bg-gray-400"}`}
          />
          <span className="text-[15px] font-bold text-[#1a1612] tracking-tight truncate">
            {p.city}
          </span>
          {p.neighborhood && (
            <>
              <span className="text-[13px] text-[#9c8e7c]">·</span>
              <span className="text-[13px] text-[#78716c] font-medium truncate">
                {p.neighborhood}
              </span>
            </>
          )}
        </div>

        {/* Line 2: Type + surface + état */}
        <div className="flex items-center gap-1 mb-2">
          <span className="text-[11px] font-semibold text-[#78716c] bg-[#f5f0ea] rounded px-1.5 py-px tracking-wide">
            {p.surface}m²
          </span>
          <span className="text-[12px] text-[#a39888]">
            · {p.property_type === "neuf" ? "Neuf" : "Ancien"}
          </span>
        </div>

        {/* Line 3: Prix + Renta bar + Cashflow */}
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-bold text-[#44403c] tabular-nums min-w-[72px]">
            {fmt(p.purchase_price)}{"\u202f"}€
          </span>

          {/* Renta bar */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[90px]">
            <div className="flex-1 h-1 rounded-full bg-[#f3f0eb] overflow-hidden min-w-[40px]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(rentaWidth, 2)}%`,
                  background: rentaColor,
                }}
              />
            </div>
            <span
              className="text-[13px] font-bold tabular-nums min-w-[36px] text-right"
              style={{ color: rentaColor }}
            >
              {c.net_yield.toFixed(1)}%
            </span>
          </div>

          {/* Cashflow */}
          <span className={`text-[13px] font-bold tabular-nums ml-auto ${cfColor}`}>
            {getCashflowPrefix(c.monthly_cashflow)}{Math.round(c.monthly_cashflow)}€
          </span>
        </div>

        {/* Line 4: ROI + Profit net (projection) — expert only */}
        {!isBeginner && exitSim.holdingDuration > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[11px] font-bold tabular-nums ${exitSim.roi >= 0 ? "text-green-600" : "text-red-600"}`}>
              ROI {exitSim.roi > 0 ? "+" : ""}{exitSim.roi.toFixed(0)}%
            </span>
            <span className={`text-[11px] font-semibold tabular-nums ${exitSim.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {exitSim.netProfit > 0 ? "+" : ""}{fmt(exitSim.netProfit)}{"\u202f"}€
            </span>
            <span className="text-[10px] text-[#bdb4a7]">
              /{exitSim.holdingDuration}a
            </span>
          </div>
        )}
      </div>

      {/* Time */}
      <span className="text-[11px] text-[#bdb4a7] self-start shrink-0">
        {timeAgo(p.created_at)}
      </span>
    </Link>
  );
}
