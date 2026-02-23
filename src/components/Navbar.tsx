"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
              Immo2025
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/property/new"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              + Nouveau bien
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );
}
