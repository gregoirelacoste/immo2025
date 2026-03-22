import { redirect } from "next/navigation";
import { saveSavedSearchAction } from "@/domains/search-bookmark/actions";

export default async function ShareSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; title?: string }>;
}) {
  const params = await searchParams;
  const url = params.url || "";
  const title = params.title || "";

  if (!url) {
    redirect("/searches");
  }

  await saveSavedSearchAction(url, title || undefined);
  redirect("/searches");
}
