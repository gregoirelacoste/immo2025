import { getScoreLabel } from "@/components/ui/InvestmentScoreBadge";
import Spinner from "@/components/ui/Spinner";

interface ScoreBreakdown {
  netYieldScore: number;
  cashflowScore: number;
  priceVsMarketScore: number;
  rentVsMarketScore: number;
  demographicScore: number;
  incomeScore: number;
  employmentScore: number;
  attractivenessScore: number;
  total: number;
}

interface Props {
  score: number | null;
  breakdown: ScoreBreakdown | null;
  status: string;
  error?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function getScoreRingColor(score: number): string {
  if (score >= 71) return "text-green-500";
  if (score >= 51) return "text-blue-500";
  if (score >= 31) return "text-amber-500";
  return "text-red-500";
}

function getScoreBg(score: number): string {
  if (score >= 71) return "from-green-50 to-emerald-50 border-green-200";
  if (score >= 51) return "from-blue-50 to-indigo-50 border-blue-200";
  if (score >= 31) return "from-amber-50 to-yellow-50 border-amber-200";
  return "from-red-50 to-orange-50 border-red-200";
}

const FINANCIAL_CRITERIA = [
  { key: "netYieldScore" as const, label: "Rendement net", max: 20 },
  { key: "cashflowScore" as const, label: "Cash-flow", max: 15 },
  { key: "priceVsMarketScore" as const, label: "Prix vs marché", max: 15 },
  { key: "rentVsMarketScore" as const, label: "Loyer vs marché", max: 10 },
];

const SOCIO_CRITERIA = [
  { key: "demographicScore" as const, label: "Démographie", max: 10 },
  { key: "incomeScore" as const, label: "Revenus", max: 10 },
  { key: "employmentScore" as const, label: "Emploi", max: 10 },
  { key: "attractivenessScore" as const, label: "Attractivité", max: 10 },
];

function CriteriaBar({ label, value, max }: { label: string; value: number; max: number }) {
  const widthPct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            widthPct >= 70 ? "bg-green-500" : widthPct >= 40 ? "bg-amber-500" : "bg-red-400"
          }`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

export default function InvestmentScorePanel({ score, breakdown, status, error, onRefresh, refreshing }: Props) {
  if (status === "running") {
    return (
      <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 md:p-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Spinner />
          Analyse en cours...
        </div>
      </section>
    );
  }

  if (status === "error" && error) {
    return (
      <section className="bg-red-50 rounded-xl border border-red-200 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-600">Erreur d&apos;analyse : {error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="text-sm text-red-600 underline hover:text-red-800"
            >
              Réessayer
            </button>
          )}
        </div>
      </section>
    );
  }

  if (score == null || !breakdown) return null;

  const pct = Math.round((score / 100) * 283);
  const label = getScoreLabel(score);
  // Check if we have socio-economic data (not just neutral defaults)
  const hasSocioData = breakdown.demographicScore !== 5 || breakdown.incomeScore !== 5 ||
    breakdown.employmentScore !== 5 || breakdown.attractivenessScore !== 5;

  return (
    <section className={`bg-gradient-to-br ${getScoreBg(score)} rounded-xl border p-4 md:p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Score d&apos;investissement</h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="text-xs text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
          >
            {refreshing ? "Actualisation..." : "Actualiser"}
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Circular gauge */}
        <div className="relative shrink-0">
          <svg width="120" height="120" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="7" className="text-gray-200" />
            <circle
              cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="7"
              strokeLinecap="round" strokeDasharray="283" strokeDashoffset={283 - pct}
              className={`${getScoreRingColor(score)} transition-all duration-700`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">{score}</span>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        </div>

        {/* Breakdown — 2 columns */}
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Financier</p>
            {FINANCIAL_CRITERIA.map(({ key, label: l, max }) => (
              <CriteriaBar key={key} label={l} value={breakdown[key] ?? 0} max={max} />
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Socio-économique
              {!hasSocioData && <span className="font-normal normal-case ml-1">(données partielles)</span>}
            </p>
            {SOCIO_CRITERIA.map(({ key, label: l, max }) => (
              <CriteriaBar key={key} label={l} value={breakdown[key] ?? 0} max={max} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
