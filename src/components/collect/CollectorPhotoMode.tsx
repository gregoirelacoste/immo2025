"use client";

import { useState, useRef, useCallback } from "react";
import { PhotoMetadata } from "@/domains/collect/types";

const MAX_PHOTOS = 5;
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.7;

function resizeImage(source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  let srcW: number, srcH: number;
  if (source instanceof HTMLVideoElement) {
    srcW = source.videoWidth;
    srcH = source.videoHeight;
  } else if (source instanceof HTMLCanvasElement) {
    srcW = source.width;
    srcH = source.height;
  } else {
    srcW = source.naturalWidth;
    srcH = source.naturalHeight;
  }

  if (srcW > MAX_WIDTH) {
    const ratio = MAX_WIDTH / srcW;
    canvas.width = MAX_WIDTH;
    canvas.height = Math.round(srcH * ratio);
  } else {
    canvas.width = srcW;
    canvas.height = srcH;
  }

  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function loadFileAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
    img.src = url;
  });
}

interface Props {
  onCapture: (imageData: string, metadata: PhotoMetadata) => void;
  onAnalyze?: (photoIndex: number) => void;
  analyzingIndex?: number | null;
  photos?: string[];
  onRemove?: (index: number) => void;
  disabled?: boolean;
}

export default function CollectorPhotoMode({ onCapture, onAnalyze, analyzingIndex, photos = [], onRemove, disabled }: Props) {
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAddMore = photos.length < MAX_PHOTOS;

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCapturing(false);
  }, []);

  function getGeoAndFinalize(imageData: string) {
    const meta: PhotoMetadata = { takenAt: new Date().toISOString() };
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { meta.latitude = pos.coords.latitude; meta.longitude = pos.coords.longitude; onCapture(imageData, meta); },
        () => { onCapture(imageData, meta); },
        { timeout: 5000 }
      );
    } else {
      onCapture(imageData, meta);
    }
  }

  async function handleStartCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCapturing(true);
      requestAnimationFrame(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      });
    } catch {
      alert("Impossible d'accéder à la caméra.");
    }
  }

  function handleTakePhoto() {
    if (!videoRef.current) return;
    const imageData = resizeImage(videoRef.current);
    stopCamera();
    getGeoAndFinalize(imageData);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const remaining = MAX_PHOTOS - photos.length;
    for (const file of Array.from(files).slice(0, remaining)) {
      try {
        const img = await loadFileAsImage(file);
        const imageData = resizeImage(img);
        getGeoAndFinalize(imageData);
      } catch { /* skip */ }
    }
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-tiili-border aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  disabled={disabled}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/80"
                  aria-label={`Supprimer photo ${i + 1}`}
                >
                  x
                </button>
              )}
              {onAnalyze && (
                <button
                  type="button"
                  onClick={() => onAnalyze(i)}
                  disabled={disabled || analyzingIndex != null}
                  className="absolute bottom-1 right-1 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-0.5"
                  aria-label={`Analyser photo ${i + 1}`}
                >
                  {analyzingIndex === i ? (
                    <span className="animate-pulse">Analyse...</span>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      IA
                    </>
                  )}
                </button>
              )}
              {i === 0 && (
                <span className="absolute bottom-1 left-1 bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                  Couverture
                </span>
              )}
            </div>
          ))}

          {/* Add photo tile — in the grid for easy access */}
          {canAddMore && !capturing && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-amber-400 hover:text-amber-500 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-[10px]">Ajouter</span>
            </button>
          )}
        </div>
      )}

      {/* Camera viewfinder */}
      {capturing && (
        <>
          <div className="relative rounded-lg overflow-hidden border border-tiili-border bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-48 object-cover" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleTakePhoto} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 min-h-[44px]">
              Capturer
            </button>
            <button type="button" onClick={stopCamera} className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 min-h-[44px]">
              Annuler
            </button>
          </div>
        </>
      )}

      {/* Main action: single prominent button when no photos yet */}
      {!capturing && canAddMore && photos.length === 0 && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full px-4 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-amber-400 hover:text-amber-600 transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Ajouter des photos
        </button>
      )}

      {/* Secondary: camera button (below grid when photos exist) */}
      {!capturing && canAddMore && (
        <button
          type="button"
          onClick={handleStartCamera}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm text-gray-500 hover:text-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Prendre une photo
        </button>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />

      <p className="text-xs text-gray-400 text-center">
        {photos.length}/{MAX_PHOTOS} photos
        {canAddMore ? " — ajoutez des photos du bien ou d'une annonce" : " — maximum atteint"}
      </p>
    </div>
  );
}
