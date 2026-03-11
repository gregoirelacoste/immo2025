"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { processShareAndCreate } from "@/domains/collect/share-actions";
import Spinner from "@/components/ui/Spinner";

interface Props {
  sessionId: string;
  url?: string;
  imageCount: number;
}

export default function SharePreview({ sessionId, url, imageCount }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    processShareAndCreate(sessionId).then((result) => {
      if (result.propertyId) {
        router.replace(`/property/${result.propertyId}/edit`);
      } else {
        setError(result.error || "Impossible de traiter le partage.");
      }
    });
  }, [sessionId, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-indigo-600 underline"
        >
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <Spinner size="lg" />
      <p className="text-sm text-gray-600 font-medium">
        Création du bien en cours...
      </p>
      {url && (
        <p className="text-xs text-gray-400 truncate max-w-full">{url}</p>
      )}
      {imageCount > 0 && (
        <p className="text-xs text-gray-400">
          {imageCount} image{imageCount > 1 ? "s" : ""} à analyser
        </p>
      )}
    </div>
  );
}
