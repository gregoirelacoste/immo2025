import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-actions";
import { getArticleStats, listArticles } from "@/domains/blog/repository";
import Navbar from "@/components/Navbar";
import AdminBlogClient from "@/components/admin/blog/AdminBlogClient";

export default async function AdminBlogPage() {
  const { userId, isAdmin: admin } = await getAuthContext();
  if (!userId) redirect("/login");
  if (!admin) redirect("/dashboard");

  const [stats, { articles }] = await Promise.all([
    getArticleStats(),
    listArticles({ limit: 50 }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <a href="/admin" className="text-sm text-amber-600 hover:underline">
            ← Admin
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Admin</span>
        </div>
        <AdminBlogClient stats={stats} initialArticles={articles} />
      </main>
    </div>
  );
}
