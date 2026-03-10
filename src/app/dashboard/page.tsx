import { getAllProperties } from "@/lib/db";
import Navbar from "@/components/Navbar";
import DashboardClient from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const properties = await getAllProperties();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardClient properties={properties} />
      </main>
    </div>
  );
}
