"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  photoCount: number;
  isRecording: boolean;
  onCapture: (blob: Blob) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export default function LiveActionBar({
  photoCount,
  isRecording,
  onCapture,
  onStartRecording,
  onStopRecording,
  notes,
  onNotesChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      onCapture(file);
      e.target.value = "";
      // Flash effect
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
      if (navigator.vibrate) navigator.vibrate(30);
    },
    [onCapture],
  );

  const handleVoice = useCallback(() => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  }, [isRecording, onStartRecording, onStopRecording]);

  return (
    <>
      {/* Flash overlay */}
      {flash && (
        <div className="fixed inset-0 bg-white/80 z-50 pointer-events-none" />
      )}

      {/* Notes bottom sheet */}
      {showNotes && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotes(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl p-4"
            style={{ paddingBottom: "calc(1rem + var(--sab, 0px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#1a1a2e] mb-2">
              Note rapide
            </h3>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Tapez votre note ici…"
              className="w-full min-h-[120px] px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowNotes(false)}
              className="mt-2 w-full py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-lg min-h-[44px]"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg"
        style={{ paddingBottom: "var(--sab, 0px)" }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-center gap-3 px-4 py-2">
          {/* Voice note button */}
          <button
            type="button"
            onClick={handleVoice}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[56px] rounded-xl transition-colors ${
              isRecording
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-700 active:bg-gray-200"
            }`}
          >
            {isRecording ? (
              <>
                <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                <span className="text-[10px] font-bold">STOP</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
                <span className="text-[10px] font-medium">Note</span>
              </>
            )}
          </button>

          {/* Photo capture button (main, larger) */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex flex-col items-center justify-center gap-0.5 min-h-[64px] min-w-[100px] bg-amber-500 text-white rounded-xl active:bg-amber-600 shadow-md"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
            <span className="text-[10px] font-bold">PHOTO</span>
            {photoCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {photoCount}
              </span>
            )}
          </button>

          {/* Text note button */}
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className="relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[56px] bg-gray-100 text-gray-700 rounded-xl active:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
            <span className="text-[10px] font-medium">Texte</span>
            {notes.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Hidden file input for camera */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </>
  );
}
