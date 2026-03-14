"use client";

import { signOut } from "next-auth/react";

interface Props {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function ProfileClient({ user }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1a1a2e]">Profil</h1>

      <div className="bg-white rounded-xl shadow-sm border border-tiili-border p-6">
        <div className="flex items-center gap-4 mb-6">
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-amber-600">
                {(user.name || user.email || "?").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            {user.name && (
              <p className="text-lg font-semibold text-[#1a1a2e]">{user.name}</p>
            )}
            {user.email && (
              <p className="text-sm text-gray-500">{user.email}</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
