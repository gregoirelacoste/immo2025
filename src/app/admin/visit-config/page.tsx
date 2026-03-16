import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-actions";
import { getItemsByType } from "@/domains/reference/service";
import Navbar from "@/components/Navbar";
import AdminVisitConfigClient from "@/components/admin/AdminVisitConfigClient";
import Link from "next/link";

export default async function AdminVisitConfigPage() {
  const { userId, isAdmin: admin } = await getAuthContext();
  if (!userId) redirect("/login");
  if (!admin) redirect("/dashboard");

  const [checklist, photoTags, redFlags, sellerQuestions] = await Promise.all([
    getItemsByType("checklist"),
    getItemsByType("photo_tag"),
    getItemsByType("red_flag"),
    getItemsByType("seller_question"),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Configuration visite</h1>
          <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Admin</span>
        </div>
        <AdminVisitConfigClient
          checklist={checklist}
          photoTags={photoTags}
          redFlags={redFlags}
          sellerQuestions={sellerQuestions}
        />
      </main>
    </div>
  );
}
