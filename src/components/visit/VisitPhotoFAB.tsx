"use client";

import { useRef, useState, useEffect } from "react";

interface Props {
  photoCount: number;
  onCapture: (blob: Blob) => void;
}

export default function VisitPhotoFAB({ photoCount, onCapture }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Flash animation
    setFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 150);

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);

    onCapture(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <>
      {/* Flash overlay */}
      {flash && (
        <div className="fixed inset-0 z-70 bg-white/80 pointer-events-none animate-pulse" />
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="fixed right-4 z-50 w-14 h-14 rounded-full bg-amber-600 text-white shadow-lg shadow-amber-600/30 flex items-center justify-center hover:bg-amber-700 transition-all active:scale-90 md:right-8"
        style={{ bottom: "calc(72px + var(--sab, 0px))" }}
      >
        {/* Camera icon */}
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
        </svg>

        {/* Photo count badge */}
        {photoCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold animate-bounce-once">
            {photoCount}
          </span>
        )}
      </button>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
    </>
  );
}
