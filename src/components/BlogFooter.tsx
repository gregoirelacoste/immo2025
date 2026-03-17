import Link from "next/link";

export default function BlogFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 mt-16">
      <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-500">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <Link href="/" className="font-semibold text-gray-700 hover:text-amber-600">
              tiili.io
            </Link>
            <p>Simulateur d&apos;investissement immobilier locatif</p>
          </div>
          <nav className="flex gap-6">
            <Link href="/guide" className="hover:text-amber-600">Guides villes</Link>
            <Link href="/blog" className="hover:text-amber-600">Blog</Link>
            <Link href="/dashboard" className="hover:text-amber-600">Simulateur</Link>
            <Link href="/property/new" className="hover:text-amber-600">+ Nouveau bien</Link>
          </nav>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Les données présentées proviennent de sources publiques (DVF, INSEE, Géorisques).
          Les simulations sont indicatives et ne constituent pas un conseil en investissement.
        </p>
      </div>
    </footer>
  );
}
