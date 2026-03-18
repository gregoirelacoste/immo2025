import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-actions";
import { getAllLocalities, getLocalitySnapshotsBatch } from "@/domains/locality/repository";
import Navbar from "@/components/Navbar";
import AdminLocalitiesClient from "@/components/admin/AdminLocalitiesClient";

export default async function AdminPage() {
  const { userId, isAdmin: admin } = await getAuthContext();
  if (!userId) redirect("/login");
  if (!admin) redirect("/dashboard");

  const localities = await getAllLocalities();
  const dataMap = await getLocalitySnapshotsBatch(localities.map((l) => l.id));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Admin</span>
        </div>
        <div className="mb-6 flex gap-3 flex-wrap">
          <a
            href="/admin/equipments"
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <span>🔧</span>
            <span>Equipements</span>
            <span className="text-gray-400">→</span>
          </a>
          <a
            href="/admin/visit-config"
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <span>📋</span>
            <span>Config visite</span>
            <span className="text-gray-400">→</span>
          </a>
          <a
            href="/admin/blog"
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <span>📝</span>
            <span>Blog</span>
            <span className="text-gray-400">→</span>
          </a>
        </div>
        <AdminLocalitiesClient localities={localities} dataMap={dataMap} />
      </main>
    </div>
  );
}
