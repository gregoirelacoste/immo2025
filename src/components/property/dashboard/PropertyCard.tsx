"use client";

import Link from "next/link";
import { Property, PropertyCalculations, PROPERTY_STATUS_CONFIG, type PropertyStatus } from "@/domains/property/types";
import { getGrade, rentaColor, cashflowColor, gradeBorderClass } from "@/lib/grade";

interface Props {
  property: Property;
  calcs: PropertyCalculations;
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

export default function PropertyCard({ property: p, calcs: c }: Props) {
  const grade = getGrade(p.investment_score);
  const status = (p.property_status || "added") as PropertyStatus;

  return (
    <Link
      href={`/property/${p.id}`}
      className={`block bg-white rounded-[10px] border-l-4 ${gradeBorderClass(p.investment_score)} overflow-hidden active:bg-gray-50/50 transition-colors relative`}
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
    >
      {/* Grade watermark */}
      <div
        className={`absolute -top-0.5 right-1.5 text-[54px] font-black leading-none pointer-events-none select-none ${grade.color}`}
        style={{ opacity: 0.06, fontFamily: "var(--font-sans)" }}
      >
        {grade.letter}
      </div>

      <div className="px-2.5 py-2.5 pb-[9px]">
        {/* Row 1: City + Score badge */}
        <div className="flex justify-between items-center mb-px">
          <div className="flex items-center gap-1.5">
            <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${PROPERTY_STATUS_CONFIG[status]?.dotColor || "bg-gray-400"}`} />
            <span className="text-[15px] font-extrabold text-[#1a1a2e] tracking-tight truncate">
              {p.city}
            </span>
          </div>
          {p.investment_score != null && (
            <div className={`flex items-center gap-1 px-[7px] py-0.5 rounded-md ${grade.bg}`}>
              <span className={`text-[11px] font-extrabold ${grade.color}`}>{grade.letter}</span>
              <span className={`text-[12px] font-bold font-[family-name:var(--font-mono)] ${grade.color}`}>
                {p.investment_score}
              </span>
            </div>
          )}
        </div>

        {/* Row 2: Context — minimal */}
        <div className="text-[11px] text-[#b0b0b8] font-medium mb-2 pl-[11px]">
          {p.property_type === "neuf" ? "Neuf" : "Ancien"} · {p.surface}m² · {timeAgo(p.created_at)}
        </div>

        {/* Row 3: The numbers — IDE-highlighted */}
        <div className="flex justify-between items-baseline pl-[11px]">
          {/* Price */}
          <span className="text-[14px] font-bold text-gray-700 tracking-tight">
            {fmt(p.purchase_price)}{"\u202f"}€
          </span>

          {/* Renta */}
          <span className={`text-[16px] font-extrabold font-[family-name:var(--font-mono)] tracking-tighter ${rentaColor(c.net_yield)}`}>
            {c.net_yield.toFixed(1)}%
          </span>

          {/* Cashflow */}
          <span className={`text-[14px] font-bold font-[family-name:var(--font-mono)] tracking-tight ${cashflowColor(c.monthly_cashflow)}`}>
            {c.monthly_cashflow > 0 ? "+" : ""}{Math.round(c.monthly_cashflow)}€
          </span>
        </div>
      </div>
    </Link>
  );
}
