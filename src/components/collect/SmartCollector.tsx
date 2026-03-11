"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { scrapeAndSaveProperty, createPropertyFromText, extractAndUpdateFromText } from "@/domains/scraping/actions";
import { rescrapeProperty } from "@/domains/property/actions";
import { CollectMode, PhotoMetadata } from "@/domains/collect/types";
import CollectorPhotoMode from "@/components/collect/CollectorPhotoMode";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

interface Props {
  /** If provided, updates existing property instead of creating new */
  existingPropertyId?: string;
  /** Called after successful collection */
  onSuccess?: (result: { propertyId: string; mode: string }) => void;
  /** Compact mode for dashboard (no photo tab, smaller) */
  compact?: boolean;
}

const URL_REGEX = /^https?:\/\//i;

function isUrl(input: string): boolean {
  return URL_REGEX.test(input.trim());
}

type Tab = { mode: CollectMode; label: string; icon: string };

const TABS: Tab[] = [
  { mode: "url", label: "URL", icon: "\uD83D\uDD17" },
  { mode: "text", label: "Texte", icon: "\uD83D\uDCDD" },
  { mode: "photo", label: "Photo", icon: "\uD83D\uDCF7" },
];

export default function SmartCollector({ existingPropertyId, onSuccess, compact }: Props) {
  const [activeMode, setActiveMode] = useState<CollectMode>("url");
  const [urlValue, setUrlValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const [photoData, setPhotoData] = useState<{ imageData: string; metadata: PhotoMetadata } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const visibleTabs = compact ? TABS.filter((t) => t.mode !== "photo") : TABS;

  const handleTabChange = useCallback((mode: CollectMode) => {
    setActiveMode(mode);
    setError("");
    setSuccess("");
  }, []);

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUrlValue(e.target.value);
    setError("");
    setSuccess("");
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setError("");
    setSuccess("");

    // Smart detection: auto-switch to URL mode if a URL is pasted
    if (isUrl(v)) {
      setActiveMode("url");
      setUrlValue(v.trim());
      setTextValue("");
      return;
    }

    setTextValue(v);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }

  function handlePhotoCapture(imageData: string, metadata: PhotoMetadata) {
    setPhotoData({ imageData, metadata });
    setError("");
    setSuccess("");
  }

  function handleUrlKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleTextKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Submit on Enter without Shift in compact mode (single-line feel)
    if (e.key === "Enter" && !e.shiftKey && compact) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const canSubmit =
    (activeMode === "url" && urlValue.trim().length > 0) ||
    (activeMode === "text" && textValue.trim().length > 0) ||
    (activeMode === "photo" && photoData != null);

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (activeMode === "url") {
        const trimmedUrl = urlValue.trim();
        if (existingPropertyId) {
          // Rescrape existing property
          const result = await rescrapeProperty(existingPropertyId);
          if (result.success) {
            setSuccess("Bien mis à jour avec les nouvelles données.");
            onSuccess?.({ propertyId: existingPropertyId, mode: "url" });
            router.refresh();
          } else {
            setError(result.error || "Impossible de re-scraper cette URL.");
          }
        } else {
          // Create new from URL
          const { propertyId, warning, error: err } = await scrapeAndSaveProperty(trimmedUrl);
          if (propertyId) {
            onSuccess?.({ propertyId, mode: "url" });
            router.push(`/property/${propertyId}/edit`);
            return;
          }
          setError(warning || err || "Impossible d'extraire les données de cette URL.");
        }
      } else if (activeMode === "text") {
        const trimmedText = textValue.trim();
        if (existingPropertyId) {
          // Update existing from text
          const result = await extractAndUpdateFromText(existingPropertyId, trimmedText);
          if (result.success) {
            setSuccess("Bien mis à jour avec les données extraites.");
            onSuccess?.({ propertyId: existingPropertyId, mode: "text" });
            router.refresh();
          } else {
            setError(result.error || "Impossible d'extraire les données du texte.");
          }
        } else {
          // Create new from text
          const { propertyId, error: err } = await createPropertyFromText(trimmedText);
          if (propertyId) {
            onSuccess?.({ propertyId, mode: "text" });
            router.push(`/property/${propertyId}/edit`);
            return;
          }
          setError(err || "Impossible d'extraire les données du texte.");
        }
      } else if (activeMode === "photo") {
        // Photo mode: not yet implemented
        setError("Bientôt disponible — l'analyse de photos arrive prochainement.");
      }
    } catch {
      setError("Erreur inattendue, réessayez.");
    }

    setLoading(false);
  }

  const buttonLabel =
    activeMode === "url" ? "Importer" : activeMode === "text" ? "Analyser" : "Analyser";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {visibleTabs.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            onClick={() => handleTabChange(tab.mode)}
            disabled={loading}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
              activeMode === tab.mode
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="space-y-3">
        {activeMode === "url" && (
          <div className="flex gap-2 items-start">
            <input
              type="url"
              value={urlValue}
              onChange={handleUrlChange}
              onKeyDown={handleUrlKeyDown}
              placeholder="https://www.leboncoin.fr/ad/ventes_immobilieres/..."
              disabled={loading}
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !urlValue.trim()}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px] min-w-[100px] shrink-0 flex items-center justify-center gap-2"
            >
              {loading ? <><Spinner /> Import...</> : buttonLabel}
            </button>
          </div>
        )}

        {activeMode === "text" && (
          <>
            <textarea
              ref={textareaRef}
              value={textValue}
              onChange={handleTextChange}
              onKeyDown={handleTextKeyDown}
              placeholder="Collez le texte d'une annonce immobilière..."
              rows={compact ? 2 : 4}
              disabled={loading}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none overflow-hidden min-h-[44px] leading-relaxed"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !textValue.trim()}
              className="w-full px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
            >
              {loading ? <><Spinner /> Analyse...</> : buttonLabel}
            </button>
          </>
        )}

        {activeMode === "photo" && (
          <>
            <CollectorPhotoMode
              onCapture={handlePhotoCapture}
              disabled={loading}
            />
            {photoData && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
              >
                {loading ? <><Spinner /> Analyse...</> : buttonLabel}
              </button>
            )}
          </>
        )}
      </div>

      {/* Feedback */}
      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mt-3">
          {success}
        </Alert>
      )}
    </div>
  );
}
