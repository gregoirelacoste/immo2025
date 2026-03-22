"use client";

import Link from "next/link";
import { ReactNode, useState, useEffect, useCallback } from "react";

interface Props {
  /** Icon rendered inside the amber circle (SVG element) */
  icon: ReactNode;
  /** Main title, e.g. "Sauvegardez vos recherches" */
  title: string;
  /** Short description below the title */
  description: string;
  /** Optional extra content between the description and the CTA buttons */
  children?: ReactNode;
}

/** Shared CTA content used by both inline and modal variants */
function AuthGateContent({ icon, title, description, children }: Props) {
  return (
    <>
      <div className="w-16 h-16 mx-auto mb-4 bg-amber-50 rounded-full flex items-center justify-center">
        {icon}
      </div>
      <p className="text-gray-700 font-medium mb-1">{title}</p>
      <p className="text-gray-400 text-sm max-w-xs mx-auto mb-2">
        {description}
      </p>
      {children && <div className="mb-6">{children}</div>}
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/register"
          className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 transition-colors shadow-[0_2px_8px_rgba(217,119,6,0.25)]"
        >
          Créer un compte
        </Link>
        <Link
          href="/login"
          className="text-sm text-amber-600 hover:underline min-h-[44px] inline-flex items-center"
        >
          Déjà un compte ? Se connecter
        </Link>
      </div>
    </>
  );
}

/**
 * Inline CTA block for features that require authentication.
 * Replaces the page content when the user is not logged in.
 */
export default function AuthGate(props: Props) {
  return (
    <div className="text-center py-16 px-4">
      <AuthGateContent {...props} />
    </div>
  );
}

/**
 * Modal variant of AuthGate — opens as an overlay.
 * Use when the feature button stays visible but requires auth on click.
 */
export function AuthGateModal(props: Props & { onClose: () => void }) {
  const { onClose, ...contentProps } = props;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={contentProps.title}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <AuthGateContent {...contentProps} />
      </div>
    </div>
  );
}

/**
 * Hook helper — wraps a callback to show AuthGateModal if not logged in.
 * Returns [handleClick, modalElement] to render in the component.
 */
export function useAuthGate(
  isLoggedIn: boolean,
  gateProps: Props
): [() => void, ReactNode] {
  const [showGate, setShowGate] = useState(false);

  const handleClick = useCallback(() => {
    if (!isLoggedIn) {
      setShowGate(true);
    }
  }, [isLoggedIn]);

  const modal = showGate ? (
    <AuthGateModal {...gateProps} onClose={() => setShowGate(false)} />
  ) : null;

  return [handleClick, modal];
}
