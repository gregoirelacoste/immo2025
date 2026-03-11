"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { processShareForPreview, confirmShareProperty, SharePreviewData } from "@/domains/collect/share-actions";
import { ShareData } from "@/domains/collect/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

interface Props {
  sessionId: string;
  initialData: ShareData;
}

const SOURCE_LABELS: Record<string, string> = {
  leboncoin: "LeBonCoin",
  seloger: "SeLoger",
  pap: "PAP",
  generic: "Lien web",
};

const METHOD_LABELS: Record<string, string> = {
  scrape: "Scraping automatique",
  photo: "Analyse photo (IA Vision)",
  text: "Extraction texte (IA)",
  manual: "Aucune donnée extraite",
};

function formatPrice(n: number | undefined): string {
  if (!n) return "—";
  return n.toLocaleString("fr-FR") + " €";
}

export default function SharePreview({ sessionId, initialData }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<SharePreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    processShareForPreview(sessionId).then((result) => {
      setLoading(false);
      if (result.success && result.preview) {
        setPreview(result.preview);
      } else {
        setError(result.error || "Impossible de traiter le partage.");
      }
    });
  }, [sessionId]);

  async function handleConfirm() {
    if (!preview) return;
    setConfirming(true);
    setError(null);

    const result = await confirmShareProperty(preview);
    if (result.propertyId) {
      router.push(`/property/${result.propertyId}/edit`);
    } else {
      setError(result.error || "Erreur lors de la création.");
      setConfirming(false);
    }
  }

  function handleCancel() {
    router.push("/dashboard");
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-8">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">Analyse du contenu partagé...</p>
          {initialData.url && (
            <p className="text-xs text-gray-400 truncate max-w-full">{initialData.url}</p>
          )}
          {initialData.images.length > 0 && (
            <p className="text-xs text-gray-400">
              {initialData.images.length} image{initialData.images.length > 1 ? "s" : ""} à analyser
            </p>
          )}
        </div>
      </Card>
    );
  }

  // Error state
  if (error && !preview) {
    return (
      <Card>
        <Alert variant="error">{error}</Alert>
        <div className="mt-4">
          <Button variant="secondary" onClick={handleCancel}>
            Retour au tableau de bord
          </Button>
        </div>
      </Card>
    );
  }

  if (!preview) return null;

  const d = preview.extractedData;
  const hasData = d.purchase_price || d.city || d.surface;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Aperçu du partage</h1>
        <p className="text-sm text-gray-500 mt-1">
          Source : {SOURCE_LABELS[preview.source] || preview.source}
          {" · "}
          {METHOD_LABELS[preview.method]}
        </p>
      </div>

      {error && <Alert variant="warning">{error}</Alert>}

      {/* Shared images preview */}
      {initialData.images.length > 0 && (
        <Card padding="sm">
          <p className="text-xs font-medium text-gray-500 mb-2">Images partagées</p>
          <div className="flex gap-2 overflow-x-auto">
            {initialData.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Image ${i + 1}`}
                className="h-24 w-auto rounded-lg object-cover flex-shrink-0"
              />
            ))}
          </div>
        </Card>
      )}

      {/* Shared URL */}
      {initialData.url && (
        <Card padding="sm">
          <p className="text-xs font-medium text-gray-500 mb-1">URL partagée</p>
          <p className="text-sm text-indigo-600 truncate">{initialData.url}</p>
        </Card>
      )}

      {/* Extracted data preview */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Données extraites</h2>
        {hasData ? (
          <div className="space-y-2">
            {d.purchase_price != null && (
              <PreviewRow label="Prix" value={formatPrice(d.purchase_price)} />
            )}
            {d.surface != null && (
              <PreviewRow label="Surface" value={`${d.surface} m²`} />
            )}
            {d.city && (
              <PreviewRow label="Ville" value={`${d.city}${d.postal_code ? ` (${d.postal_code})` : ""}`} />
            )}
            {d.address && <PreviewRow label="Adresse" value={d.address} />}
            {d.property_type && (
              <PreviewRow label="Type" value={d.property_type === "neuf" ? "Neuf" : "Ancien"} />
            )}
            {d.monthly_rent != null && d.monthly_rent > 0 && (
              <PreviewRow label="Loyer" value={formatPrice(d.monthly_rent) + "/mois"} />
            )}
            {d.description && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-700 mt-1 line-clamp-3">{d.description}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">
            Aucune donnée immobilière détectée. Vous pourrez compléter manuellement.
          </p>
        )}
      </Card>

      {/* Multi-listing notice */}
      {preview.multiListings && preview.multiListings.length > 1 && (
        <Alert variant="info">
          {preview.multiListings.length} annonces détectées dans l&apos;image.
          Vous pourrez choisir après la création.
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleConfirm}
          loading={confirming}
          className="flex-1"
        >
          Confirmer et enregistrer
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={handleCancel}
          disabled={confirming}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}
