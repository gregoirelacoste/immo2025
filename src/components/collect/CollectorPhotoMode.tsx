"use client";

import { useState, useRef, useCallback } from "react";
import { PhotoMetadata } from "@/domains/collect/types";

const MAX_PHOTOS = 5;
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.7;

/** Resize an image to max MAX_WIDTH px wide, return as JPEG data URL */
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

/** Load a File as an HTMLImageElement for resizing */
function loadFileAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger l'image"));
    };
    img.src = url;
  });
}

interface Props {
  /** Called when a new photo is captured/uploaded */
  onCapture: (imageData: string, metadata: PhotoMetadata) => void;
  /** Already captured photos (data URLs or remote URLs) */
  photos?: string[];
  /** Called to remove a photo by index */
  onRemove?: (index: number) => void;
  disabled?: boolean;
}

export default function CollectorPhotoMode({ onCapture, photos = [], onRemove, disabled }: Props) {
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
        (pos) => {
          meta.latitude = pos.coords.latitude;
          meta.longitude = pos.coords.longitude;
          onCapture(imageData, meta);
        },
        () => {
          onCapture(imageData, meta);
        },
        { timeout: 5000 }
      );
    } else {
      onCapture(imageData, meta);
    }
  }

  async function handleStartCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCapturing(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      });
    } catch {
      alert("Impossible d'acceder a la camera.");
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
    const toProcess = Array.from(files).slice(0, remaining);

    for (const file of toProcess) {
      try {
        const img = await loadFileAsImage(file);
        const imageData = resizeImage(img);
        getGeoAndFinalize(imageData);
      } catch {
        // Skip files that can't be loaded
      }
    }

    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-gray-200 aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
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
              {i === 0 && (
                <span className="absolute bottom-1 left-1 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                  Couverture
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Camera viewfinder */}
      {capturing && (
        <>
          <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-48 object-cover"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTakePhoto}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors min-h-[44px]"
            >
              Capturer
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              Annuler
            </button>
          </div>
        </>
      )}

      {/* Action buttons */}
      {!capturing && canAddMore && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleStartCamera}
            disabled={disabled}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Prendre une photo
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Importer
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      <p className="text-xs text-gray-400 text-center">
        {photos.length}/{MAX_PHOTOS} photos
        {canAddMore ? " — ajoutez des photos du bien ou d'une annonce" : " — maximum atteint"}
      </p>
    </div>
  );
}
