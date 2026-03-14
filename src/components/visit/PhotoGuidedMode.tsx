"use client";

import { useCallback, useRef, useState } from "react";
import { PHOTO_GUIDE, type PhotoGuideStep } from "@/domains/visit/photo-guide";
import type { LocalVisitPhoto } from "@/domains/visit/hooks/useVisitPhotos";

interface Props {
  photos: LocalVisitPhoto[];
  onCapture: (blob: Blob, tag: string, note?: string) => Promise<LocalVisitPhoto>;
  onClose: () => void;
}

export default function PhotoGuidedMode({ photos, onCapture, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [note, setNote] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const step: PhotoGuideStep | undefined = PHOTO_GUIDE[currentStep];
  const totalSteps = PHOTO_GUIDE.length;

  const photosForStep = (stepId: string) =>
    photos.filter((p) => p.tag === stepId || p.tag === `photo_${stepId}`);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !step) return;

      setCapturing(true);
      try {
        await onCapture(file, step.id, note || undefined);
        setNote("");
      } finally {
        setCapturing(false);
        e.target.value = "";
      }
    },
    [step, note, onCapture]
  );

  const goNext = useCallback(() => {
    setNote("");
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setFinished(true);
    }
  }, [currentStep, totalSteps]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setNote("");
    }
  }, [currentStep]);

  // Free photo capture (no tag constraint)
  const freeInputRef = useRef<HTMLInputElement>(null);
  const [freeCapturing, setFreeCapturing] = useState(false);

  const handleFreeCapture = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFreeCapturing(true);
      try {
        await onCapture(file, "photo_other");
      } finally {
        setFreeCapturing(false);
        e.target.value = "";
      }
    },
    [onCapture]
  );

  // Summary view
  if (finished) {
    const takenSteps = PHOTO_GUIDE.filter((s) => photosForStep(s.id).length > 0);
    const skippedSteps = PHOTO_GUIDE.filter((s) => photosForStep(s.id).length === 0);

    return (
      <div className="fixed inset-0 z-60 bg-white overflow-y-auto" style={{ paddingTop: "var(--sat)", paddingBottom: "var(--sab)" }}>
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1a1a2e]">Recap photos</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-amber-600 font-medium min-h-[44px] px-3"
            >
              Terminer
            </button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{takenSteps.length}/{totalSteps}</p>
            <p className="text-sm text-green-600">etapes photographiees</p>
          </div>

          {takenSteps.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Prises</h3>
              {takenSteps.map((s) => {
                const stepPhotos = photosForStep(s.id);
                return (
                  <div key={s.id} className="flex items-center gap-3 bg-green-50 rounded-lg p-2">
                    <div className="flex gap-1">
                      {stepPhotos.slice(0, 3).map((p) => (
                        <img
                          key={p.localId}
                          src={p.uri}
                          alt={s.label}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1a1a2e] truncate">{s.label}</p>
                      <p className="text-xs text-gray-500">{stepPhotos.length} photo{stepPhotos.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {skippedSteps.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Non prises</h3>
              {skippedSteps.map((s) => (
                <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                  <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!step) return null;

  const stepPhotos = photosForStep(step.id);
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="fixed inset-0 z-60 bg-gray-50 flex flex-col" style={{ paddingTop: "var(--sat)", paddingBottom: "var(--sab)" }}>
      {/* Header */}
      <div className="bg-white border-b border-tiili-border px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-[#1a1a2e] min-h-[44px] flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Quitter
          </button>
          <span className="text-sm font-semibold text-amber-600">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 space-y-6">
        {/* Step card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-tiili-border p-6 text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-amber-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#1a1a2e]">{step.label}</h2>
          <p className="text-sm text-gray-500">{step.tip}</p>

          {/* Already taken photos for this step */}
          {stepPhotos.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {stepPhotos.map((p) => (
                <img
                  key={p.localId}
                  src={p.uri}
                  alt={step.label}
                  className="w-12 h-12 rounded-lg object-cover border-2 border-green-400"
                />
              ))}
              <span className="text-xs text-green-600 font-medium ml-1">
                {stepPhotos.length} prise{stepPhotos.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Note input */}
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optionnel)..."
          className="w-full max-w-sm text-sm px-4 py-2.5 border border-tiili-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />

        {/* Action buttons */}
        <div className="w-full max-w-sm space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={capturing}
            className="w-full bg-amber-600 text-white font-semibold py-3 rounded-xl min-h-[48px] hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {capturing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
                Photographier
              </>
            )}
          </button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={goPrev}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-2.5 rounded-xl min-h-[44px] hover:bg-gray-200 transition-colors text-sm"
              >
                Precedent
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="flex-1 bg-gray-100 text-gray-700 font-medium py-2.5 rounded-xl min-h-[44px] hover:bg-gray-200 transition-colors text-sm"
            >
              {stepPhotos.length > 0 ? "Suivant" : "Passer"}
            </button>
          </div>
        </div>

        {/* Free photo button */}
        <button
          type="button"
          onClick={() => freeInputRef.current?.click()}
          disabled={freeCapturing}
          className="text-sm text-amber-600 hover:text-amber-700 font-medium min-h-[44px] flex items-center gap-1"
        >
          {freeCapturing ? (
            <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Photo libre
            </>
          )}
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={freeInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFreeCapture}
        className="hidden"
      />
    </div>
  );
}
