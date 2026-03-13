"use client";

import { useState, useEffect, useRef } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (isVisitMode) return null;

  const menuItems = (
    <>
      <Link
        href="/localities"
        className={`block px-4 py-3 text-sm font-medium ${
          isActive("/localities") ? "text-indigo-600 bg-indigo-50" : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        Localités
      </Link>
      <Link
        href="/compare"
        className={`block px-4 py-3 text-sm font-medium ${
          isActive("/compare") ? "text-indigo-600 bg-indigo-50" : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        Comparer
      </Link>
      <Link
        href="/portfolio"
        className={`block px-4 py-3 text-sm font-medium ${
          isActive("/portfolio") ? "text-indigo-600 bg-indigo-50" : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        Patrimoine
      </Link>
      {session?.user && (
        <Link
          href="/profile"
          className={`block px-4 py-3 text-sm font-medium ${
            isActive("/profile") ? "text-indigo-600 bg-indigo-50" : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          Profil
        </Link>
      )}
      <div className="border-t border-gray-100" />
      {session?.user ? (
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Déconnexion
        </button>
      ) : (
        <>
          <Link
            href="/login"
            className="block px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Créer un compte
          </Link>
        </>
      )}
    </>
  );

  const burgerIcon = (
    <button
      onClick={() => setMenuOpen((o) => !o)}
      className="p-2 -mr-2 text-gray-600 hover:text-gray-900"
      aria-label="Menu"
    >
      {menuOpen ? (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      )}
    </button>
  );

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:block bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
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
            </div>
            <div className="relative" ref={menuRef}>
              {burgerIcon}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                  {menuItems}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40" style={{ paddingTop: "var(--sat)" }}>
        <div className="flex items-center justify-between h-12 px-4">
          <span className="text-lg font-bold text-indigo-600">Immo2025</span>
          <div className="relative" ref={menuRef}>
            {burgerIcon}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                {menuItems}
              </div>
            )}
          </div>
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
