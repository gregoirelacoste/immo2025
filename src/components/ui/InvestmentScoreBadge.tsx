"use client";

import { getGrade } from "@/lib/grade";

interface Props {
  score: number | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 71) return "text-green-700 bg-green-100 border-green-200";
  if (score >= 51) return "text-blue-700 bg-blue-100 border-blue-200";
  if (score >= 31) return "text-amber-700 bg-amber-100 border-amber-200";
  return "text-red-700 bg-red-100 border-red-200";
}

function getScoreLabel(score: number): string {
  if (score >= 71) return "Excellent";
  if (score >= 51) return "Bon";
  if (score >= 31) return "Moyen";
  return "Faible";
}

export default function InvestmentScoreBadge({ score, size = "sm", showLabel = false }: Props) {
  if (score == null) return null;

  const grade = getGrade(score);

  const sizeClasses = {
    sm: "px-1.5 py-0.5 gap-1",
    md: "px-2 py-1 gap-1.5",
    lg: "px-3 py-1.5 gap-2",
  };

  const letterSize = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  const scoreSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <span className={`inline-flex items-center rounded-md ${grade.bg} ${sizeClasses[size]}`}>
      <span className={`${letterSize[size]} font-extrabold ${grade.color}`}>
        {grade.letter}
      </span>
      <span className={`${scoreSize[size]} font-bold font-[family-name:var(--font-mono)] ${grade.color}`}>
        {score}
      </span>
      {showLabel && <span className={`text-xs font-medium ${grade.color}`}>{getScoreLabel(score)}</span>}
    </span>
  );
}

export { getScoreColor, getScoreLabel };
