"use client";

import Link from "next/link";
import { ReactNode } from "react";

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

/**
 * Reusable CTA block for features that require authentication.
 * Shows an icon, title, description, optional extra content, and
 * "Créer un compte" / "Se connecter" buttons.
 */
export default function AuthGate({ icon, title, description, children }: Props) {
  return (
    <div className="text-center py-16 px-4">
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
    </div>
  );
}
