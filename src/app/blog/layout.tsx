import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — Blog tiili.fr",
    default: "Blog — Investissement immobilier locatif | tiili.fr",
  },
  description:
    "Guides, analyses et données pour réussir votre investissement immobilier locatif en France.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header blog minimal */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-amber-600">
            tiili.fr
          </a>
          <nav className="flex gap-6 text-sm font-medium text-gray-600">
            <a href="/guide" className="hover:text-amber-600 transition-colors">
              Guides villes
            </a>
            <a href="/blog" className="hover:text-amber-600 transition-colors">
              Blog
            </a>
            <a
              href="/dashboard"
              className="rounded-lg bg-amber-600 px-4 py-2 text-white text-sm hover:bg-amber-700 transition-colors"
            >
              Simulateur
            </a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      {/* Footer SEO */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-16">
        <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-500">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-700">tiili.fr</p>
              <p>Simulateur d&apos;investissement immobilier locatif</p>
            </div>
            <nav className="flex gap-6">
              <a href="/guide" className="hover:text-amber-600">Guides villes</a>
              <a href="/blog" className="hover:text-amber-600">Blog</a>
              <a href="/dashboard" className="hover:text-amber-600">Simulateur</a>
            </nav>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Les données présentées proviennent de sources publiques (DVF, INSEE, Géorisques).
            Les simulations sont indicatives et ne constituent pas un conseil en investissement.
          </p>
        </div>
      </footer>
    </div>
  );
}
