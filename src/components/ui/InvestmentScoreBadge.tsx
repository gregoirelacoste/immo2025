"use client";

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

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full border ${getScoreColor(score)} ${sizeClasses[size]}`}>
      {score}
      {showLabel && <span className="font-medium">{getScoreLabel(score)}</span>}
    </span>
  );
}

export { getScoreColor, getScoreLabel };
