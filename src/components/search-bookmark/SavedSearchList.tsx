"use client";

import { useState, useTransition } from "react";
import { SavedSearch } from "@/domains/search-bookmark/types";
import {
  renameSavedSearchAction,
  deleteSavedSearchAction,
} from "@/domains/search-bookmark/actions";
import { useRouter } from "next/navigation";

function SiteBadge({ site }: { site: string }) {
  const colors: Record<string, string> = {
    leboncoin: "bg-orange-100 text-orange-700",
    seloger: "bg-blue-100 text-blue-700",
    pap: "bg-green-100 text-green-700",
  };
  const labels: Record<string, string> = {
    leboncoin: "Leboncoin",
    seloger: "SeLoger",
    pap: "PAP",
  };
  const cls = colors[site] || "bg-gray-100 text-gray-700";
  const label = labels[site] || site;
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

function SavedSearchCard({ search }: { search: SavedSearch }) {
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
          <SiteBadge site={search.site} />
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
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
              autoFocus
              disabled={isPending}
            />
            <button
              onClick={handleRename}
              disabled={isPending}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-green-600 hover:bg-green-50 rounded"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-[#1a1a2e] text-left flex items-center gap-1 group"
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

export default function SavedSearchList({
  searches,
  isLoggedIn,
}: {
  searches: SavedSearch[];
  isLoggedIn: boolean;
}) {
  if (!isLoggedIn) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2">Connectez-vous pour sauvegarder vos recherches.</p>
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-amber-50 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        <p className="text-gray-600 font-medium mb-1">Aucune recherche sauvegardée</p>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
          Partagez une page de recherche Leboncoin depuis l&apos;app pour l&apos;ajouter ici.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {searches.map((s) => (
        <SavedSearchCard key={s.id} search={s} />
      ))}
    </div>
  );
}
