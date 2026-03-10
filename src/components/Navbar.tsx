"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

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
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40" style={{ paddingTop: "var(--sat)" }}>
        <div className="flex items-center justify-center h-12 px-4">
          <span className="text-lg font-bold text-indigo-600">Immo2025</span>
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
        </div>
      </nav>
    </>
  );
}
