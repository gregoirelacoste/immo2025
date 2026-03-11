"use client";

import { useState, useRef, useCallback } from "react";
import { PhotoMetadata } from "@/domains/collect/types";

interface Props {
  onCapture: (imageData: string, metadata: PhotoMetadata) => void;
  disabled?: boolean;
}

export default function CollectorPhotoMode({ onCapture, disabled }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          // Permission refusee ou erreur → envoyer sans GPS
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

      // Wait for next tick so videoRef is rendered
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      });
    } catch {
      // Camera non disponible
      alert("Impossible d'accéder à la caméra.");
    }
  }

  function handleTakePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.85);

    stopCamera();
    setPreview(imageData);
    getGeoAndFinalize(imageData);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result as string;
      setPreview(imageData);
      getGeoAndFinalize(imageData);
    };
    reader.readAsDataURL(file);
  }

  function handleReset() {
    setPreview(null);
    stopCamera();
  }

  if (preview) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Aperçu de la photo"
            className="w-full max-h-48 object-cover"
          />
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium min-h-[44px]"
        >
          Reprendre une photo
        </button>
      </div>
    );
  }

  if (capturing) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-48 object-cover"
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />
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
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleStartCamera}
        disabled={disabled}
        className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Prendre une photo
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        Importer une image
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <p className="text-xs text-gray-400 text-center">
        Prenez en photo une vitrine d&apos;agence ou une annonce papier
      </p>
    </div>
  );
}
