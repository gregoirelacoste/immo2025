"use client";

import { useUserMode } from "@/contexts/UserModeContext";

interface Props {
  children: React.ReactNode;
  /** Only show in beginner mode (default true) */
  beginnerOnly?: boolean;
}

/**
 * Contextual pedagogical tip shown in beginner mode.
 * Renders a light blue info box with an explanation.
 */
export default function BeginnerTip({ children, beginnerOnly = true }: Props) {
  const { isBeginner } = useUserMode();

  if (beginnerOnly && !isBeginner) return null;

  return (
    <div className="flex gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-[13px] text-blue-700 leading-relaxed">
      <svg className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M12 2a10 10 0 100 20 10 10 0 000-20zm0 6v4" />
      </svg>
      <div>{children}</div>
    </div>
  );
}
