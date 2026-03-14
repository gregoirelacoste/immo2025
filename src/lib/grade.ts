export type GradeLetter = "A" | "B" | "C" | "D" | "?";

export interface Grade {
  letter: GradeLetter;
  /** Tailwind text color class */
  color: string;
  /** Tailwind bg color class */
  bg: string;
  /** Raw hex color */
  hex: string;
  /** Raw hex background */
  hexBg: string;
}

const GRADES: Record<Exclude<GradeLetter, "?">, Grade> = {
  A: { letter: "A", color: "text-green-600", bg: "bg-green-50", hex: "#16a34a", hexBg: "#f0fdf4" },
  B: { letter: "B", color: "text-blue-600", bg: "bg-blue-50", hex: "#2563eb", hexBg: "#eff6ff" },
  C: { letter: "C", color: "text-amber-600", bg: "bg-amber-50", hex: "#d97706", hexBg: "#fffbeb" },
  D: { letter: "D", color: "text-red-600", bg: "bg-red-50", hex: "#dc2626", hexBg: "#fef2f2" },
};

const UNKNOWN_GRADE: Grade = {
  letter: "?",
  color: "text-gray-400",
  bg: "bg-gray-50",
  hex: "#9ca3af",
  hexBg: "#f9fafb",
};

export function getGrade(score: number | null): Grade {
  if (score == null) return UNKNOWN_GRADE;
  if (score >= 71) return GRADES.A;
  if (score >= 51) return GRADES.B;
  if (score >= 31) return GRADES.C;
  return GRADES.D;
}

/** Color for net yield value */
export function rentaColor(renta: number): string {
  if (renta >= 7) return "text-green-600";
  if (renta >= 5) return "text-[#1a1a2e]";
  if (renta >= 4) return "text-amber-600";
  return "text-red-600";
}

/** Color for cashflow value */
export function cashflowColor(cf: number): string {
  if (cf > 50) return "text-green-600";
  if (cf >= 0) return "text-gray-500";
  if (cf > -100) return "text-amber-600";
  return "text-red-600";
}

export interface VerdictItem {
  label: string;
  /** 1 = good, 0 = neutral, -1 = bad */
  val: 1 | 0 | -1;
}

/** Quick verdict for property detail hero */
export function getVerdict(price: number, netYield: number, cashflow: number, score: number | null): VerdictItem[] {
  return [
    { label: "Prix", val: price < 150000 ? 1 : price < 200000 ? 0 : -1 },
    { label: "Renta", val: netYield >= 7 ? 1 : netYield >= 5 ? 0 : -1 },
    { label: "Cashflow", val: cashflow > 50 ? 1 : cashflow >= 0 ? 0 : -1 },
    { label: "Risque", val: (score ?? 0) > 65 ? 1 : (score ?? 0) > 45 ? 0 : -1 },
  ];
}

/** Verdict item color classes */
export function verdictColor(val: 1 | 0 | -1): { text: string; bg: string } {
  if (val === 1) return { text: "text-green-600", bg: "bg-green-50" };
  if (val === 0) return { text: "text-amber-600", bg: "bg-amber-50" };
  return { text: "text-red-600", bg: "bg-red-50" };
}

/** Border-left class based on grade */
export function gradeBorderClass(score: number | null): string {
  const g = getGrade(score);
  switch (g.letter) {
    case "A": return "border-l-green-600";
    case "B": return "border-l-blue-600";
    case "C": return "border-l-amber-600";
    case "D": return "border-l-red-600";
    default: return "border-l-gray-300";
  }
}
