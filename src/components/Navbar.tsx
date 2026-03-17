"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import AppVersion from "@/components/AppVersion";
import { captureStreetPhoto } from "@/domains/photo/street-capture";
import { createPropertyFromPhoto } from "@/domains/photo/street-actions";

/** tiili brick logo mark */
function TiiliLogo() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" fill="none" className="shrink-0">
      <rect x="0" y="0" width="12" height="7" rx="2" fill="#b45309" />
      <rect x="13" y="0" width="9" height="7" rx="2" fill="#d97706" />
      <rect x="3" y="8.5" width="10" height="7" rx="2" fill="#d97706" />
      <rect x="14" y="8.5" width="8" height="7" rx="2" fill="#f59e0b" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const handleStreetPhoto = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const result = await captureStreetPhoto();
      if (!result) return;

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

  const userRole = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;
  const isUserAdmin = userRole === "admin";
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");
  const isVisitMode = /^\/property\/[^/]+\/visit/.test(pathname);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isVisitMode) return null;

  const drawerLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`block px-6 py-3 text-sm font-medium transition-colors ${
        isActive(href) ? "text-amber-700 bg-amber-50" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );

  const burgerIcon = (
    <button
      onClick={() => setMenuOpen((o) => !o)}
      className="p-2 -mr-2 text-gray-600 hover:text-[#1a1a2e]"
      aria-label="Menu"
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </button>
  );

  const drawer = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-[60] transition-opacity duration-300 ${
          menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      />
      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white shadow-xl z-[70] transform transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-tiili-border">
          <span className="text-lg font-bold text-amber-700">Menu</span>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-2 -mr-2 text-gray-600 hover:text-[#1a1a2e]"
            aria-label="Fermer"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="py-2">
          {drawerLink("/dashboard", "Dashboard")}
          {drawerLink("/property/new", "+ Nouveau bien")}
          <div className="border-t border-gray-100 my-1" />
          {drawerLink("/compare", "Comparer")}
          {drawerLink("/portfolio", "Patrimoine")}
          <div className="border-t border-gray-100 my-1" />
          {drawerLink("/guide", "Guides villes")}
          {drawerLink("/blog", "Blog")}
          {session?.user && drawerLink("/profile", "Profil")}
          {isUserAdmin && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <Link
                href="/admin"
                className={`block px-6 py-3 text-sm font-medium transition-colors ${
                  isActive("/admin")
                    ? "text-red-600 bg-red-50"
                    : "text-red-600 hover:bg-red-50"
                }`}
              >
                Admin
              </Link>
            </>
          )}
          <div className="border-t border-gray-100 my-1" />
          {session?.user ? (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="block w-full text-left px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Deconnexion
            </button>
          ) : (
            <>
              {drawerLink("/login", "Se connecter")}
              {drawerLink("/register", "Creer un compte")}
            </>
          )}
        </nav>
      </div>
    </>
  );

  return (
    <>
      {/* Drawer (shared between desktop and mobile) */}
      {drawer}

      {/* Desktop top nav */}
      <nav className="hidden md:block bg-white border-b border-tiili-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                <TiiliLogo />
                <span className="text-xl font-extrabold text-[#1a1a2e] tracking-tight">tiili</span>
                <span className="text-xs text-[#c4b5a0] font-medium">.io</span>
              </Link>
              <Link
                href="/dashboard"
                className={`text-sm font-medium ${
                  isActive("/dashboard") ? "text-amber-700" : "text-gray-600 hover:text-[#1a1a2e]"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/property/new"
                className={`text-sm font-medium ${
                  isActive("/property/new") ? "text-amber-700" : "text-gray-600 hover:text-[#1a1a2e]"
                }`}
              >
                + Nouveau bien
              </Link>
              <Link
                href="/guide"
                className={`text-sm font-medium ${
                  isActive("/guide") ? "text-amber-700" : "text-gray-600 hover:text-[#1a1a2e]"
                }`}
              >
                Guides
              </Link>
              <Link
                href="/blog"
                className={`text-sm font-medium ${
                  isActive("/blog") ? "text-amber-700" : "text-gray-600 hover:text-[#1a1a2e]"
                }`}
              >
                Blog
              </Link>
            </div>
            {burgerIcon}
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav className="md:hidden bg-white border-b border-tiili-border sticky top-0 z-40" style={{ paddingTop: "var(--sat)" }}>
        <div className="flex items-center justify-between h-12 px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <TiiliLogo />
            <span className="text-lg font-extrabold text-[#1a1a2e] tracking-tight">tiili</span>
            <span className="text-[11px] text-[#c4b5a0] font-medium">.io</span>
          </Link>
          {session?.user ? (
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-400 flex items-center justify-center text-white text-sm font-bold"
              aria-label="Menu"
            >
              {session.user.name?.charAt(0)?.toUpperCase() || "?"}
            </button>
          ) : (
            burgerIcon
          )}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-tiili-border z-50"
        style={{ paddingBottom: "var(--sab)" }}
      >
        <div className="flex items-stretch">
          <Link
            href="/dashboard"
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] ${
              isActive("/dashboard") && !isActive("/property")
                ? "text-[#1a1a2e]"
                : "text-[#b0b0b8]"
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
            <span className="text-[9px] mt-0.5 font-semibold tracking-wide">Dashboard</span>
          </Link>
          <Link
            href="/property/new"
            className="flex-1 flex flex-col items-center justify-center py-2 min-h-[56px]"
          >
            <span className="w-9 h-9 -mt-3 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xl shadow-[0_2px_8px_rgba(217,119,6,0.25)]">
              +
            </span>
            <span className="text-[9px] font-semibold tracking-wide text-[#b0b0b8]">Nouveau</span>
          </Link>
          {session?.user && (
            <button
              type="button"
              onClick={handleStreetPhoto}
              disabled={capturing}
              className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] text-[#b0b0b8] ${capturing ? "opacity-50" : ""}`}
            >
              {capturing ? (
                <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
              )}
              <span className="text-[9px] mt-0.5 font-semibold tracking-wide">Photo</span>
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
