"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { scrapeAndSaveProperty, createPropertyFromText } from "@/domains/scraping/actions";
import { savePropertyPhotos } from "@/domains/property/actions";
import { addCollectUrl, removeCollectUrl, addCollectText, removeCollectText } from "@/domains/collect/actions";
import { CollectMode, PhotoMetadata } from "@/domains/collect/types";
import CollectorPhotoMode from "@/components/collect/CollectorPhotoMode";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.7;

interface Props {
  existingPropertyId?: string;
  existingPhotos?: string[];
  existingCollectUrls?: string[];
  existingCollectTexts?: string[];
  sourceUrl?: string;
  onSuccess?: (result: { propertyId: string; mode: string }) => void;
  compact?: boolean;
}

const URL_REGEX = /^https?:\/\//i;

function isUrl(input: string): boolean {
  return URL_REGEX.test(input.trim());
}

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

export default function SmartCollector({
  existingPropertyId,
  existingPhotos,
  existingCollectUrls,
  existingCollectTexts,
  sourceUrl,
  onSuccess,
  compact,
}: Props) {
  const [activeMode, setActiveMode] = useState<CollectMode>("url");
  const [urlValue, setUrlValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const [photos, setPhotos] = useState<string[]>(existingPhotos || []);
  const [collectUrls, setCollectUrls] = useState<string[]>(existingCollectUrls || []);
  const [collectTexts, setCollectTexts] = useState<string[]>(existingCollectTexts || []);
  const [currentSourceUrl, setCurrentSourceUrl] = useState(sourceUrl || "");
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

  // --- Paste: intercept images ---

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
  }

  // --- Drag & drop ---

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
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

  // --- Input handlers ---

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
    if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
  }

  function handleTextKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && compact) { e.preventDefault(); handleSubmit(); }
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
          // Add URL to existing property
          const result = await addCollectUrl(existingPropertyId, trimmedUrl);
          if (result.success) {
            setCollectUrls((prev) => [...prev, trimmedUrl]);
            if (collectUrls.length === 0) {
              // First URL → became source
              setCurrentSourceUrl(trimmedUrl);
              setSuccess("URL importée et données mises à jour.");
            } else {
              setSuccess("URL ajoutée.");
            }
            setUrlValue("");
            onSuccess?.({ propertyId: existingPropertyId, mode: "url" });
            router.refresh();
          } else {
            setError(result.error || "Erreur lors de l'ajout de l'URL.");
          }
        } else {
          // New property: scrape + create
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
          // Add text to existing property
          const result = await addCollectText(existingPropertyId, trimmedText);
          if (result.success) {
            setCollectTexts((prev) => [...prev, trimmedText]);
            setSuccess("Texte analysé et données mises à jour.");
            setTextValue("");
            onSuccess?.({ propertyId: existingPropertyId, mode: "text" });
            router.refresh();
          } else {
            setError(result.error || "Erreur lors de l'analyse du texte.");
          }
        } else {
          // New property: create from text
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

  // --- Remove handlers ---

  async function handleRemoveUrl(index: number) {
    if (!existingPropertyId || loading) return;
    setLoading(true);
    setError("");

    const result = await removeCollectUrl(existingPropertyId, index);
    if (result.success) {
      const newUrls = collectUrls.filter((_, i) => i !== index);
      setCollectUrls(newUrls);
      setCurrentSourceUrl(newUrls.length > 0 ? newUrls[0] : "");
      if (newUrls.length > 0 && index === 0) {
        setSuccess("URL source mise à jour — rescraping en cours...");
      }
      router.refresh();
    } else {
      setError(result.error || "Erreur lors de la suppression.");
    }
    setLoading(false);
  }

  async function handleRemoveText(index: number) {
    if (!existingPropertyId || loading) return;
    setLoading(true);
    setError("");

    const result = await removeCollectText(existingPropertyId, index);
    if (result.success) {
      setCollectTexts((prev) => prev.filter((_, i) => i !== index));
      router.refresh();
    } else {
      setError(result.error || "Erreur lors de la suppression.");
    }
    setLoading(false);
  }

  // --- Render ---

  const buttonLabel = activeMode === "url"
    ? (existingPropertyId ? "Ajouter" : "Importer")
    : "Analyser";

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border p-4 md:p-5 transition-colors ${
        isDragOver ? "border-indigo-400 border-dashed border-2 bg-indigo-50" : "border-gray-200"
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
            {tab.mode === "url" && collectUrls.length > 0 && (
              <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                {collectUrls.length}
              </span>
            )}
            {tab.mode === "text" && collectTexts.length > 0 && (
              <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                {collectTexts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="text-center py-6 text-indigo-500 font-medium text-sm">
          Déposez votre image ici
        </div>
      )}

      {/* Content */}
      {!isDragOver && (
        <div className="space-y-3">
          {/* URL tab */}
          {activeMode === "url" && (
            <>
              <input
                type="url"
                value={urlValue}
                onChange={handleUrlChange}
                onKeyDown={handleUrlKeyDown}
                placeholder="https://www.leboncoin.fr/ad/ventes_immobilieres/..."
                disabled={loading}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !urlValue.trim()}
                className="w-full px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
              >
                {loading ? <><Spinner /> Import...</> : buttonLabel}
              </button>

              {/* URL list */}
              {collectUrls.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-medium text-gray-500">URLs collectées</p>
                  {collectUrls.map((url, i) => {
                    const isSource = url === currentSourceUrl;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          isSource
                            ? "bg-indigo-50 border border-indigo-200"
                            : "bg-gray-50 border border-gray-200"
                        }`}
                      >
                        {isSource && (
                          <span className="shrink-0 text-[10px] font-semibold bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                            SOURCE
                          </span>
                        )}
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 truncate hover:underline ${
                            isSource ? "text-indigo-700 font-medium" : "text-gray-600"
                          }`}
                        >
                          {url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
                        </a>
                        {existingPropertyId && (
                          <button
                            type="button"
                            onClick={() => handleRemoveUrl(i)}
                            disabled={loading}
                            className="shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            aria-label="Supprimer cette URL"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Text tab */}
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

              {/* Text list (folded) */}
              {collectTexts.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-medium text-gray-500">Textes collectés</p>
                  {collectTexts.map((text, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm"
                    >
                      <p className="flex-1 text-gray-600 line-clamp-2 text-xs leading-relaxed">
                        {text.slice(0, 150)}{text.length > 150 ? "…" : ""}
                      </p>
                      {existingPropertyId && (
                        <button
                          type="button"
                          onClick={() => handleRemoveText(i)}
                          disabled={loading}
                          className="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          aria-label="Supprimer ce texte"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Photo tab */}
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
      {error && <Alert variant="error" className="mt-3">{error}</Alert>}
      {success && <Alert variant="success" className="mt-3">{success}</Alert>}
    </div>
  );
}
