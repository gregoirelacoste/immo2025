"use client";

import { useState } from "react";
import type { AiEvaluation } from "@/domains/evaluation/types";
import Spinner from "@/components/ui/Spinner";
import PremiumGate from "@/components/ui/PremiumGate";

interface Props {
  propertyId: string;
  evaluation: AiEvaluation | null;
  evaluatedAt: string;
  isPremium: boolean;
}

const AXES = [
  { key: "prix" as const, label: "Prix", icon: "💰" },
  { key: "rendement" as const, label: "Rendement", icon: "📈" },
  { key: "localisation" as const, label: "Localisation", icon: "📍" },
  { key: "risques" as const, label: "Risques", icon: "⚠️" },
  { key: "hypotheses" as const, label: "Hypothèses", icon: "🔍" },
] as const;

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex-1">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function getGlobalColor(score: number): string {
  if (score >= 71) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 51) return "text-blue-600 bg-blue-50 border-blue-200";
  if (score >= 31) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

export default function AiEvaluationSection({ propertyId, evaluation, evaluatedAt, isPremium }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAxis, setExpandedAxis] = useState<string | null>(null);

  if (!isPremium) {
    return (
      <PremiumGate
        icon={
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
          </svg>
        }
        title="Évaluation IA du bien"
        description="L'IA analyse et challenge votre bien en croisant vos données avec des sources internet."
      />
    );
  }

  async function handleEvaluate() {
    setLoading(true);
    setError(null);
    try {
      const { runAiEvaluation } = await import("@/domains/evaluation/actions");
      const result = await runAiEvaluation(propertyId);
      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const formattedDate = evaluatedAt
    ? new Date(evaluatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <section className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[#1a1a2e] flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
          </svg>
          Évaluation IA
        </h3>
        <button
          onClick={handleEvaluate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Spinner />
              Analyse en cours...
            </>
          ) : evaluation ? (
            "Réévaluer"
          ) : (
            "Évaluer ce bien"
          )}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {loading && !evaluation && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
          <Spinner />
          L&apos;IA analyse votre bien avec des données internet...
        </div>
      )}

      {evaluation && (
        <div className="space-y-4">
          {/* Score global */}
          <div className={`rounded-xl border p-4 text-center ${getGlobalColor(evaluation.score_global)}`}>
            <div className="text-3xl font-bold">{evaluation.score_global}/100</div>
            <p className="text-sm mt-1 opacity-80">Score global IA</p>
          </div>

          {/* Axes détaillés */}
          <div className="space-y-2">
            {AXES.map(({ key, label, icon }) => {
              const axis = evaluation[key];
              const isExpanded = expandedAxis === key;
              return (
                <div key={key} className="border border-gray-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedAxis(isExpanded ? null : key)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-base">{icon}</span>
                    <span className="text-sm font-medium text-gray-700 min-w-[90px] text-left">{label}</span>
                    <ScoreBar score={axis.score} max={20} />
                    <span className="text-sm font-semibold text-gray-700 min-w-[40px] text-right">{axis.score}/20</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {isExpanded && axis.comment && (
                    <div className="px-3 pb-3 pt-0">
                      <p className="text-sm text-gray-600 leading-relaxed">{axis.comment}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Red flags & Points forts */}
          {evaluation.red_flags.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 uppercase mb-1.5">Red flags</p>
              <ul className="space-y-1">
                {evaluation.red_flags.map((flag, i) => (
                  <li key={i} className="text-sm text-red-700 flex gap-2">
                    <span className="shrink-0">•</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {evaluation.points_forts.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 uppercase mb-1.5">Points forts</p>
              <ul className="space-y-1">
                {evaluation.points_forts.map((point, i) => (
                  <li key={i} className="text-sm text-green-700 flex gap-2">
                    <span className="shrink-0">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Avis global */}
          {evaluation.avis_global && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Avis global</p>
              <p className="text-sm text-gray-700 leading-relaxed">{evaluation.avis_global}</p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 text-[11px] text-gray-400 pt-2">
            <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <span>
              Analyse indicative générée par IA avec recherche internet. Non contractuelle.
              {formattedDate && <> Dernière évaluation le {formattedDate}.</>}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
