"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function ShareHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Extraire l'URL depuis les paramètres de partage
    // Android partage souvent dans "text", iOS dans "url"
    const sharedUrl = searchParams.get("url");
    const sharedText = searchParams.get("text") || "";
    const sharedTitle = searchParams.get("title") || "";

    // Trouver une URL dans le texte partagé
    let url = sharedUrl || "";
    if (!url && sharedText) {
      const urlMatch = sharedText.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        url = urlMatch[0];
      }
    }

    // Combiner titre + texte pour l'IA (infos partagées par l'app source)
    const combinedText = [sharedTitle, sharedText].filter(Boolean).join("\n");

    const params = new URLSearchParams();
    if (url) params.set("url", url);
    if (combinedText) params.set("sharedText", combinedText);

    router.replace(`/property/new?${params.toString()}`);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Import de l&apos;annonce...</p>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    }>
      <ShareHandler />
    </Suspense>
  );
}
