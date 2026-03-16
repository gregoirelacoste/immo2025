"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f3ef] px-4">
      <div className="bg-white rounded-xl border border-tiili-border p-8 max-w-md w-full text-center space-y-4">
        <div className="text-4xl">⚠</div>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Une erreur est survenue</h1>
        <p className="text-sm text-gray-500">
          {error.message || "Quelque chose s'est mal passé. Veuillez réessayer."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors min-h-[44px]"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
