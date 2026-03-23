import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-actions";
import Navbar from "@/components/Navbar";
import AdminStatisticsClient from "@/components/admin/AdminStatisticsClient";

export default async function AdminStatisticsPage() {
  const { userId, isAdmin: admin } = await getAuthContext();
  if (!userId) redirect("/login");
  if (!admin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <a href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
            Administration
          </a>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
        </div>
        <AdminStatisticsClient />
      </main>
    </div>
  );
}
