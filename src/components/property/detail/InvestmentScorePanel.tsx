import { getScoreLabel } from "@/components/ui/InvestmentScoreBadge";
import Spinner from "@/components/ui/Spinner";

interface ScoreBreakdown {
  netYieldScore: number;
  cashflowScore: number;
  priceVsMarketScore: number;
  rentVsMarketScore: number;
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

const CRITERIA = [
  { key: "netYieldScore" as const, label: "Rendement net", max: 30 },
  { key: "cashflowScore" as const, label: "Cash-flow", max: 25 },
  { key: "priceVsMarketScore" as const, label: "Prix vs marché", max: 25 },
  { key: "rentVsMarketScore" as const, label: "Loyer vs marché", max: 20 },
];

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

  const pct = Math.round((score / 100) * 283); // circumference of r=45 circle ≈ 283
  const label = getScoreLabel(score);

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

      <div className="flex items-center gap-6">
        {/* Circular gauge */}
        <div className="relative shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-200"
            />
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="283"
              strokeDashoffset={283 - pct}
              className={`${getScoreRingColor(score)} transition-all duration-700`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{score}</span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-gray-700 mb-3">{label}</p>
          {CRITERIA.map(({ key, label: criteriaLabel, max }) => {
            const val = breakdown[key];
            const widthPct = Math.round((val / max) * 100);
            return (
              <div key={key}>
                <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                  <span>{criteriaLabel}</span>
                  <span>{val}/{max}</span>
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
          })}
        </div>
      </div>
    </section>
  );
}
