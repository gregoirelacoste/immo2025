import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-actions";
import { getAllRoadmapItems, getAllFeedback } from "@/domains/roadmap/repository";
import Navbar from "@/components/Navbar";
import AdminRoadmapClient from "@/components/admin/roadmap/AdminRoadmapClient";

export default async function AdminRoadmapPage() {
  const { userId, isAdmin: admin } = await getAuthContext();
  if (!userId) redirect("/login");
  if (!admin) redirect("/dashboard");

  const [items, feedbackList] = await Promise.all([
    getAllRoadmapItems(),
    getAllFeedback(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <a href="/admin" className="text-sm text-amber-600 hover:underline">
            ← Admin
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Roadmap</h1>
          <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Admin</span>
        </div>
        <AdminRoadmapClient initialItems={items} feedbackList={feedbackList} />
      </main>
    </div>
  );
}
