"use client";

import { useState } from "react";
import { scrapeAndSaveProperty } from "@/domains/scraping/actions";
import Spinner from "@/components/ui/Spinner";
import Alert from "@/components/ui/Alert";

interface Props {
  onScrapeError: (url: string) => void;
}

export default function ScrapeImportSection({ onScrapeError }: Props) {
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleScrape() {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setErrorMsg("");

    try {
      const { propertyId, error, warning } = await scrapeAndSaveProperty(scrapeUrl.trim());

      if (propertyId) {
        window.location.href = `/property/${propertyId}/edit`;
        return;
      }

      setScraping(false);
      const msg = (warning || error || "Impossible d'extraire les données.") +
        " Saisissez-les manuellement ci-dessous.";
      setErrorMsg(msg);
      onScrapeError(scrapeUrl.trim());
    } catch {
      setScraping(false);
      setErrorMsg("Erreur inattendue. Saisissez les données manuellement.");
    }
  }

  const inputClass =
    "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base min-h-[44px]";

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-2">Importer depuis une annonce</h2>
      <p className="text-sm text-gray-500 mb-4">
        Collez le lien d&apos;une annonce (LeBonCoin, SeLoger, PAP, Bien&apos;ici...) — le bien sera import&eacute; et sauvegard&eacute; automatiquement.
      </p>

      <div className="flex gap-2">
        <input
          type="url"
          value={scrapeUrl}
          onChange={(e) => setScrapeUrl(e.target.value)}
          placeholder="https://www.leboncoin.fr/ad/ventes_immobilieres/..."
          className={inputClass + " flex-1"}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleScrape();
            }
          }}
        />
        <button
          type="button"
          onClick={handleScrape}
          disabled={scraping || !scrapeUrl.trim()}
          className="px-5 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px] min-w-[100px] shrink-0"
        >
          {scraping ? (
            <span className="flex items-center gap-2">
              <Spinner />
              Import...
            </span>
          ) : (
            "Importer"
          )}
        </button>
      </div>

      {errorMsg && (
        <Alert variant="warning" className="mt-3">
          {errorMsg}
        </Alert>
      )}
    </section>
  );
}
