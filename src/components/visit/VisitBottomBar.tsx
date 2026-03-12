"use client";

interface Props {
  progressPercent: number;
  redFlagCount: number;
  onScrollToRedFlags: () => void;
  onScrollToVerdict: () => void;
  onQuickNote: () => void;
}

export default function VisitBottomBar({
  progressPercent,
  redFlagCount,
  onScrollToRedFlags,
  onScrollToVerdict,
  onQuickNote,
}: Props) {
  const verdictReady = progressPercent >= 80;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden"
      style={{ paddingBottom: "var(--sab, 0px)" }}
    >
      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-2">
        {/* Quick note */}
        <button
          type="button"
          onClick={onQuickNote}
          className="flex items-center gap-1.5 text-gray-600 min-h-[44px] min-w-[44px] justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
          <span className="text-xs font-medium">Note</span>
        </button>

        {/* Red flags indicator */}
        <button
          type="button"
          onClick={onScrollToRedFlags}
          className="flex items-center gap-1.5 min-h-[44px] min-w-[44px] justify-center"
        >
          <span className="text-xs font-medium text-gray-600">Alertes</span>
          {redFlagCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold">
              {redFlagCount}
            </span>
          )}
        </button>

        {/* Finish / Verdict button */}
        <button
          type="button"
          onClick={onScrollToVerdict}
          className={`px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px] transition-colors ${
            verdictReady
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
          }`}
        >
          {verdictReady ? "Terminer la visite" : "Terminer"}
        </button>
      </div>
    </div>
  );
}
