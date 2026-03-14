"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { scrapeAndSaveProperty } from "@/domains/scraping/actions";
import { createPropertyFromText } from "@/domains/scraping/actions";
import Spinner from "@/components/ui/Spinner";

function isUrl(input: string): boolean {
  return /^https?:\/\//i.test(input.trim());
}

export default function SmartImportBar() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"url" | "text" | null>(null);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setValue(v);
    setError("");
    if (v.trim().length === 0) {
      setMode(null);
    } else {
      setMode(isUrl(v) ? "url" : "text");
    }
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");

    try {
      if (isUrl(trimmed)) {
        // Flow URL → scraping
        const { propertyId, warning, error: err } = await scrapeAndSaveProperty(trimmed);
        if (propertyId) {
          router.push(`/property/${propertyId}/edit`);
          return;
        }
        setError(warning || err || "Impossible d'extraire les données de cette URL.");
      } else {
        // Flow texte → extraction IA → nouvelle propriété
        const { propertyId, error: err } = await createPropertyFromText(trimmed);
        if (propertyId) {
          router.push(`/property/${propertyId}/edit`);
          return;
        }
        setError(err || "Impossible d'extraire les données du texte.");
      }
    } catch {
      setError("Erreur inattendue, réessayez.");
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Submit on Enter si pas de texte multiligne (mode URL)
    if (e.key === "Enter" && !e.shiftKey && mode === "url") {
      e.preventDefault();
      handleSubmit();
    }
  }

  const modeLabel =
    mode === "url"
      ? "🔗 URL détectée — import automatique"
      : mode === "text"
      ? "📋 Texte détecté — extraction IA"
      : null;

  const buttonLabel =
    mode === "url" ? "Importer" : mode === "text" ? "Analyser" : "Ajouter";

  return (
    <div className="bg-white rounded-xl border border-tiili-border p-4 md:p-5 mb-6">
      <div className="flex gap-2 items-start">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Collez un lien d'annonce ou le texte d'une annonce..."
            rows={1}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none overflow-hidden min-h-[44px] leading-relaxed"
            disabled={loading}
          />
          {modeLabel && (
            <p className="absolute -bottom-5 left-0 text-[11px] text-gray-400">
              {modeLabel}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !value.trim()}
          className="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 min-h-[44px] min-w-[100px] shrink-0 flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner /> Analyse...</> : buttonLabel}
        </button>
      </div>
      {error && (
        <p className="mt-6 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
