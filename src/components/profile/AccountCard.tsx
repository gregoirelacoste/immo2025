"use client";

import { signOut } from "next-auth/react";
import type { UserRole } from "@/domains/auth/types";

const ROLE_LABELS: Record<UserRole, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-red-100 text-red-700" },
  premium: { label: "Premium", className: "bg-amber-100 text-amber-700" },
  user: { label: "Gratuit", className: "bg-gray-100 text-gray-600" },
};

interface Props {
  user: {
    name: string;
    email: string;
    image: string;
    role: UserRole;
    plan: "free" | "premium";
    created_at: string;
  };
}

export default function AccountCard({ user }: Props) {
  const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.user;

  const createdDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6 mb-6">
      <div className="flex items-center gap-4">
        {user.image ? (
          <img
            src={user.image}
            alt=""
            className="w-14 h-14 rounded-full"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-xl font-bold text-amber-600">
              {(user.name || user.email || "?").charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          {user.name && (
            <p className="text-lg font-semibold text-[#1a1a2e] truncate">{user.name}</p>
          )}
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleInfo.className}`}>
              {roleInfo.label}
            </span>
            {createdDate && (
              <span className="text-xs text-gray-400">
                Membre depuis le {createdDate}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="shrink-0 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </section>
  );
}
