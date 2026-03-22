"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { SavedSearch } from "@/domains/search-bookmark/types";
import type { SiteInfo } from "@/domains/scraping/app-parsers";
import {
  renameSavedSearchAction,
  deleteSavedSearchAction,
  generateSearchLinksAction,
  saveSavedSearchAction,
} from "@/domains/search-bookmark/actions";
import type { GeneratedSearchLink } from "@/domains/search-bookmark/url-generator";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/ui/AuthGate";

// ─── Site badge styling (keyed by site source) ───

const SITE_COLORS: Record<string, string> = {
  leboncoin: "bg-orange-100 text-orange-700",
  seloger: "bg-blue-100 text-blue-700",
  pap: "bg-green-100 text-green-700",
  bienici: "bg-teal-100 text-teal-700",
  logicimmo: "bg-purple-100 text-purple-700",
  figaro: "bg-red-100 text-red-700",
  ouestfrance: "bg-sky-100 text-sky-700",
  superimmo: "bg-indigo-100 text-indigo-700",
};

function SiteBadge({ site, sites }: { site: string; sites: SiteInfo[] }) {
  const info = sites.find((s) => s.key === site);
  const cls = SITE_COLORS[site] || "bg-gray-100 text-gray-700";
  const label = info?.label || site;
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

// ─── Compatible sites modal ───

function CompatibleSitesModal({
  sites,
  onClose,
}: {
  sites: SiteInfo[];
  onClose: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sites compatibles"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#1a1a2e]">Sites compatibles</h3>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="space-y-2">
          {sites.map((s) => (
            <li key={s.key} className="flex items-center gap-2.5 py-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SITE_COLORS[s.key]?.split(" ")[0] || "bg-gray-200"}`} />
              <span className="text-sm text-gray-700">{s.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-gray-400 text-center">
          Partagez une page de recherche depuis ces sites pour la sauvegarder.
        </p>
      </div>
    </div>
  );
}

function CompatibleSitesLink({ sites }: { sites: SiteInfo[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="min-h-[44px] inline-flex items-center text-xs text-gray-400 hover:text-amber-600 underline underline-offset-2 transition-colors"
      >
        {sites.length} sites compatibles
      </button>
      {open && <CompatibleSitesModal sites={sites} onClose={() => setOpen(false)} />}
    </>
  );
}

// ─── Search card ───

function SavedSearchCard({ search, sites }: { search: SavedSearch; sites: SiteInfo[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(search.name);
  const [isPending, startTransition] = useTransition();

  function handleRename() {
    if (!name.trim() || name === search.name) {
      setName(search.name);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await renameSavedSearchAction(search.id, name.trim());
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Supprimer cette recherche ?")) return;
    startTransition(async () => {
      await deleteSavedSearchAction(search.id);
      router.refresh();
    });
  }

  const truncatedUrl = (() => {
    try {
      const parsed = new URL(search.url);
      const path = parsed.pathname + parsed.search;
      return parsed.hostname + (path.length > 40 ? path.slice(0, 40) + "…" : path);
    } catch {
      return search.url.slice(0, 50);
    }
  })();

  return (
    <div className="bg-white rounded-xl border border-tiili-border shadow-sm p-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <SiteBadge site={search.site} sites={sites} />
          <span className="text-[10px] text-gray-400">
            {new Date(search.created_at).toLocaleDateString("fr-FR")}
          </span>
        </div>

        {editing ? (
          <div className="flex items-center gap-1 mt-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setName(search.name);
                  setEditing(false);
                }
              }}
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 min-h-[44px] focus:outline-none focus:border-amber-500"
              autoFocus
              disabled={isPending}
            />
            <button
              onClick={handleRename}
              disabled={isPending}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-green-600 hover:bg-green-50 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-[#1a1a2e] text-left flex items-center gap-1 group min-h-[44px]"
          >
            <span className="truncate">{search.name}</span>
            <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
            </svg>
          </button>
        )}

        <p className="text-[11px] text-gray-400 truncate mt-0.5">{truncatedUrl}</p>
      </div>

      <div className="flex flex-col gap-1 flex-shrink-0">
        <a
          href={search.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Search generator ───

function SearchGenerator({ onSaved }: { onSaved: () => void }) {
  const [city, setCity] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [links, setLinks] = useState<GeneratedSearchLink[]>([]);
  const [cityLabel, setCityLabel] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  function handleGenerate() {
    const price = parseInt(maxPrice.replace(/\s/g, ""), 10);
    if (!city.trim()) {
      setError("Saisissez une ville");
      return;
    }
    if (!price || price <= 0) {
      setError("Saisissez un prix maximum valide");
      return;
    }
    setError("");
    setLinks([]);
    startTransition(async () => {
      const result = await generateSearchLinksAction(city.trim(), price);
      if (result.error) {
        setError(result.error);
      } else if (result.links) {
        setLinks(result.links);
        setCityLabel(result.cityLabel || city);
      }
    });
  }

  function handleSave(link: GeneratedSearchLink, index: number) {
    setSavingIndex(index);
    startTransition(async () => {
      const price = parseInt(maxPrice.replace(/\s/g, ""), 10);
      const name = `${link.label} — ${cityLabel} ≤ ${price.toLocaleString("fr-FR")} €`;
      await saveSavedSearchAction(link.url, name);
      setSavingIndex(null);
      onSaved();
    });
  }

  return (
    <div className="bg-white rounded-xl border border-tiili-border shadow-sm p-4 mb-4">
      <h2 className="text-sm font-semibold text-[#1a1a2e] mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Générer des recherches
      </h2>

      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <input
          type="text"
          placeholder="Ville (ex: Lyon)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 min-h-[44px] focus:outline-none focus:border-amber-500"
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Prix max (€)"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          className="w-full sm:w-36 text-sm border border-gray-300 rounded-lg px-3 min-h-[44px] focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="min-h-[44px] px-4 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {isPending && links.length === 0 ? "Recherche…" : "Générer"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {links.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-500">
            Résultats pour <strong>{cityLabel}</strong> — {parseInt(maxPrice.replace(/\s/g, ""), 10).toLocaleString("fr-FR")} € max
          </p>
          {links.map((link, i) => (
            <div
              key={link.site}
              className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
            >
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${SITE_COLORS[link.site] || "bg-gray-100 text-gray-700"}`}>
                {link.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-400 truncate">{link.url}</p>
              </div>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="Ouvrir"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
              <button
                onClick={() => handleSave(link, i)}
                disabled={isPending}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Sauvegarder"
              >
                {savingIndex === i ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main list ───

interface Props {
  searches: SavedSearch[];
  isLoggedIn: boolean;
  supportedSites: SiteInfo[];
}

export default function SavedSearchList({ searches, isLoggedIn, supportedSites }: Props) {
  const router = useRouter();

  if (!isLoggedIn) {
    return (
      <AuthGate
        icon={
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        }
        title="Sauvegardez vos recherches"
        description="Retrouvez vos recherches immobilières favorites en un clic. Connectez-vous pour commencer."
      >
        <CompatibleSitesLink sites={supportedSites} />
      </AuthGate>
    );
  }

  return (
    <div>
      <SearchGenerator onSaved={() => router.refresh()} />

      {searches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">
            Générez des recherches ci-dessus ou partagez une URL depuis votre navigateur.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {searches.map((s) => (
              <SavedSearchCard key={s.id} search={s} sites={supportedSites} />
            ))}
          </div>
          <div className="text-center mt-4">
            <CompatibleSitesLink sites={supportedSites} />
          </div>
        </>
      )}
    </div>
  );
}
