"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { scrapeAndSaveProperty, createPropertyFromText, extractAndUpdateFromText } from "@/domains/scraping/actions";
import { rescrapeProperty, savePropertyPhotos } from "@/domains/property/actions";
import { CollectMode, PhotoMetadata } from "@/domains/collect/types";
import CollectorPhotoMode from "@/components/collect/CollectorPhotoMode";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.7;

interface Props {
  existingPropertyId?: string;
  existingPhotos?: string[];
  onSuccess?: (result: { propertyId: string; mode: string }) => void;
  compact?: boolean;
}

const URL_REGEX = /^https?:\/\//i;

function isUrl(input: string): boolean {
  return URL_REGEX.test(input.trim());
}

/** Resize a file to a compressed JPEG data URL */
function resizeFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      if (img.naturalWidth > MAX_WIDTH) {
        const ratio = MAX_WIDTH / img.naturalWidth;
        canvas.width = MAX_WIDTH;
        canvas.height = Math.round(img.naturalHeight * ratio);
      } else {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible"));
    };
    img.src = url;
  });
}

type Tab = { mode: CollectMode; label: string; icon: string };

const TABS: Tab[] = [
  { mode: "url", label: "URL", icon: "🔗" },
  { mode: "text", label: "Texte", icon: "📝" },
  { mode: "photo", label: "Photo", icon: "📷" },
];

export default function SmartCollector({ existingPropertyId, existingPhotos, onSuccess, compact }: Props) {
  const [activeMode, setActiveMode] = useState<CollectMode>("url");
  const [urlValue, setUrlValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const [photos, setPhotos] = useState<string[]>(existingPhotos || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTabChange = useCallback((mode: CollectMode) => {
    setActiveMode(mode);
    setError("");
    setSuccess("");
  }, []);

  // --- Photo helpers ---

  function addPhoto(imageData: string) {
    setPhotos((prev) => {
      if (prev.length >= 5) return prev;
      const updated = [...prev, imageData];
      if (existingPropertyId) {
        savePropertyPhotos(existingPropertyId, JSON.stringify(updated)).then((r) => {
          if (r.success) setSuccess(`Photo ajoutée (${updated.length}/5)`);
        });
      }
      return updated;
    });
    // Auto-switch to photo tab so user sees the result
    setActiveMode("photo");
    setError("");
  }

  function handlePhotoCapture(imageData: string, _metadata: PhotoMetadata) {
    addPhoto(imageData);
  }

  function handlePhotoRemove(index: number) {
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    if (existingPropertyId) {
      savePropertyPhotos(existingPropertyId, JSON.stringify(updated)).then((r) => {
        if (r.success) setSuccess("Photo supprimée");
      });
    }
  }

  // --- Paste: intercept images from clipboard on any tab ---

  async function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file || photos.length >= 5) return;
        try {
          const data = await resizeFile(file);
          addPhoto(data);
        } catch { /* skip */ }
        return;
      }
    }
    // No image found → let default paste behavior proceed (text goes into input/textarea)
  }

  // --- Drag & drop: accept images on the whole component ---

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only reset if leaving the component (not a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    const remaining = 5 - photos.length;
    for (const file of files.slice(0, remaining)) {
      try {
        const data = await resizeFile(file);
        addPhoto(data);
      } catch { /* skip */ }
    }
  }

  // --- Text/URL handlers ---

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUrlValue(e.target.value);
    setError("");
    setSuccess("");
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setError("");
    setSuccess("");

    if (isUrl(v)) {
      setActiveMode("url");
      setUrlValue(v.trim());
      setTextValue("");
      return;
    }

    setTextValue(v);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }

  function handleUrlKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleTextKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && compact) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // --- Submit ---

  const canSubmit =
    (activeMode === "url" && urlValue.trim().length > 0) ||
    (activeMode === "text" && textValue.trim().length > 0);

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (activeMode === "url") {
        const trimmedUrl = urlValue.trim();
        if (existingPropertyId) {
          const result = await rescrapeProperty(existingPropertyId);
          if (result.success) {
            setSuccess("Bien mis à jour avec les nouvelles données.");
            onSuccess?.({ propertyId: existingPropertyId, mode: "url" });
            router.refresh();
          } else {
            setError(result.error || "Impossible de re-scraper cette URL.");
          }
        } else {
          const { propertyId, warning, error: err } = await scrapeAndSaveProperty(trimmedUrl);
          if (propertyId) {
            if (photos.length > 0) {
              await savePropertyPhotos(propertyId, JSON.stringify(photos));
            }
            onSuccess?.({ propertyId, mode: "url" });
            router.push(`/property/${propertyId}/edit`);
            return;
          }
          setError(warning || err || "Impossible d'extraire les données de cette URL.");
        }
      } else if (activeMode === "text") {
        const trimmedText = textValue.trim();
        if (existingPropertyId) {
          const result = await extractAndUpdateFromText(existingPropertyId, trimmedText);
          if (result.success) {
            setSuccess("Bien mis à jour avec les données extraites.");
            onSuccess?.({ propertyId: existingPropertyId, mode: "text" });
            router.refresh();
          } else {
            setError(result.error || "Impossible d'extraire les données du texte.");
          }
        } else {
          const { propertyId, error: err } = await createPropertyFromText(trimmedText);
          if (propertyId) {
            if (photos.length > 0) {
              await savePropertyPhotos(propertyId, JSON.stringify(photos));
            }
            onSuccess?.({ propertyId, mode: "text" });
            router.push(`/property/${propertyId}/edit`);
            return;
          }
          setError(err || "Impossible d'extraire les données du texte.");
        }
      }
    } catch {
      setError("Erreur inattendue, réessayez.");
    }

    setLoading(false);
  }

  const buttonLabel = activeMode === "url" ? "Importer" : "Analyser";

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border p-4 md:p-5 transition-colors ${
        isDragOver
          ? "border-indigo-400 border-dashed border-2 bg-indigo-50"
          : "border-gray-200"
      }`}
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {TABS.map((tab) => (
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
            {tab.mode === "photo" && photos.length > 0 && (
              <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                {photos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Drag overlay hint */}
      {isDragOver && (
        <div className="text-center py-6 text-indigo-500 font-medium text-sm">
          Déposez votre image ici
        </div>
      )}

      {/* Content area */}
      {!isDragOver && (
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
            <CollectorPhotoMode
              onCapture={handlePhotoCapture}
              photos={photos}
              onRemove={handlePhotoRemove}
              disabled={loading}
            />
          )}
        </div>
      )}

      {/* Feedback */}
      {error && (
        <Alert variant="error" className="mt-3">{error}</Alert>
      )}
      {success && (
        <Alert variant="success" className="mt-3">{success}</Alert>
      )}
    </div>
  );
}
