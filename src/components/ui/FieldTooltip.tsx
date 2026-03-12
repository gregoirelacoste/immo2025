"use client";

import { useState } from "react";

interface Props {
  text: string;
}

export default function FieldTooltip({ text }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex ml-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold leading-none inline-flex items-center justify-center hover:bg-gray-300 transition-colors"
        aria-label="Aide"
      >
        ?
      </button>
      {open && (
        <span className="absolute left-0 top-6 z-20 w-56 p-2 rounded-lg bg-gray-800 text-white text-xs leading-relaxed shadow-lg">
          {text}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-1 right-1.5 text-gray-400 hover:text-white text-[10px]"
          >
            ✕
          </button>
        </span>
      )}
    </span>
  );
}
