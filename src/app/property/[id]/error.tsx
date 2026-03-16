"use client";

import Link from "next/link";

export default function PropertyError({
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
        <h1 className="text-xl font-bold text-[#1a1a2e]">Erreur de chargement</h1>
        <p className="text-sm text-gray-500">
          Impossible de charger ce bien. Il a peut-être été supprimé.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Retour au dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
