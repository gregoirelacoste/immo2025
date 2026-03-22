"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  text: string;
}

export default function HelpTip({ text }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block ml-1 align-middle">
      <button
        onClick={() => setOpen(!open)}
        className="w-[18px] h-[18px] rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold inline-flex items-center justify-center hover:bg-amber-100 hover:text-amber-700 transition-colors"
        aria-label="Aide"
      >
        ?
      </button>
      {open && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1a1a2e] text-white text-xs leading-relaxed rounded-lg px-3 py-2.5 w-60 shadow-lg pointer-events-auto">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#1a1a2e]" />
        </span>
      )}
    </span>
  );
}
