"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import AppVersion from "@/components/AppVersion";
import { captureStreetPhoto } from "@/domains/photo/street-capture";
import { createPropertyFromPhoto } from "@/domains/photo/street-actions";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [capturing, setCapturing] = useState(false);

  const handleStreetPhoto = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const result = await captureStreetPhoto();
      if (!result) {
        setCapturing(false);
        return;
      }

      const formData = new FormData();
      formData.set("file", result.file);
      formData.set("latitude", String(result.latitude));
      formData.set("longitude", String(result.longitude));

      const { propertyId, error } = await createPropertyFromPhoto(formData);
      if (propertyId) {
        router.push(`/property/${propertyId}/edit`);
      } else {
        console.error("Street photo error:", error);
      }
    } catch (e) {
      console.error("Street photo error:", e);
    } finally {
      setCapturing(false);
    }
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");
  const isVisitMode = /^\/property\/[^/]+\/visit/.test(pathname);

  // Hide navbar entirely during visit mode (visit has its own bottom bar)
  if (isVisitMode) return null;

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:block bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold text-indigo-600 flex items-baseline gap-1">
                Immo2025
              </Link>
              <Link
                href="/dashboard"
                className={`text-sm font-medium ${
                  isActive("/dashboard") ? "text-indigo-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/property/new"
                className={`text-sm font-medium ${
                  isActive("/property/new") ? "text-indigo-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                + Nouveau bien
              </Link>
              <Link
                href="/compare"
                className={`text-sm font-medium ${
                  isActive("/compare") ? "text-indigo-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Comparer
              </Link>
              <Link
                href="/portfolio"
                className={`text-sm font-medium ${
                  isActive("/portfolio") ? "text-indigo-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Patrimoine
              </Link>
              <Link
                href="/profile"
                className={`text-sm font-medium ${
                  isActive("/profile") ? "text-indigo-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Profil
              </Link>
            </div>
            {session?.user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                Connexion
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40" style={{ paddingTop: "var(--sat)" }}>
        <div className="flex items-center justify-between h-12 px-4">
          <span className="text-lg font-bold text-indigo-600">Immo2025</span>
          {session?.user ? (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Déconnexion
            </button>
          ) : (
            <Link href="/login" className="text-xs font-medium text-indigo-600">
              Connexion
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
        style={{ paddingBottom: "var(--sab)" }}
      >
        <div className="flex items-stretch">
          <Link
            href="/dashboard"
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] ${
              isActive("/dashboard") && !isActive("/property")
                ? "text-indigo-600"
                : "text-gray-500"
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
            <span className="text-xs mt-0.5 font-medium">Dashboard</span>
          </Link>
          <Link
            href="/property/new"
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] ${
              isActive("/property/new")
                ? "text-indigo-600"
                : "text-gray-500"
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-xs mt-0.5 font-medium">Nouveau</span>
          </Link>
          {session?.user && (
            <button
              type="button"
              onClick={handleStreetPhoto}
              disabled={capturing}
              className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] text-gray-500 ${capturing ? "opacity-50" : ""}`}
            >
              {capturing ? (
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
              )}
              <span className="text-xs mt-0.5 font-medium">Photo</span>
            </button>
          )}
          <Link
            href="/compare"
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] ${
              isActive("/compare")
                ? "text-indigo-600"
                : "text-gray-500"
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            <span className="text-xs mt-0.5 font-medium">Comparer</span>
          </Link>
          <Link
            href="/profile"
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] ${
              isActive("/profile")
                ? "text-indigo-600"
                : "text-gray-500"
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <span className="text-xs mt-0.5 font-medium">Profil</span>
          </Link>
        </div>
        <AppVersion />
      </nav>

      {/* Desktop footer version */}
      <div className="hidden md:block fixed bottom-0 right-0 p-2">
        <AppVersion />
      </div>
    </>
  );
}
