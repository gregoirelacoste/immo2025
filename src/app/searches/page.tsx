import { getAuthContext } from "@/lib/auth-actions";
import { getSavedSearches } from "@/domains/search-bookmark/repository";
import { SUPPORTED_SITES } from "@/domains/scraping/app-parsers";
import Navbar from "@/components/Navbar";
import SavedSearchList from "@/components/search-bookmark/SavedSearchList";

export default async function SearchesPage() {
  const { userId } = await getAuthContext();
  const searches = userId ? await getSavedSearches(userId) : [];

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-8 md:py-8">
        <h1 className="text-xl font-bold text-[#1a1a2e] mb-4">Recherches sauvegardées</h1>
        <SavedSearchList searches={searches} isLoggedIn={!!userId} supportedSites={SUPPORTED_SITES} />
      </main>
    </div>
  );
}
