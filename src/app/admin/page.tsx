import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserById } from "@/domains/auth/repository";
import { getAllLocalities, getLocalityDataHistory } from "@/domains/locality/repository";
import type { LocalityData } from "@/domains/locality/types";
import Navbar from "@/components/Navbar";
import AdminLocalitiesClient from "@/components/admin/AdminLocalitiesClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await getUserById(session.user.id);
  if (user?.role !== "admin") redirect("/dashboard");

  const localities = await getAllLocalities();
  const dataMap: Record<string, LocalityData[]> = {};
  for (const loc of localities) {
    dataMap[loc.id] = await getLocalityDataHistory(loc.id);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Admin</span>
        </div>
        <AdminLocalitiesClient localities={localities} dataMap={dataMap} />
      </main>
    </div>
  );
}
