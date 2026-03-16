import Navbar from "@/components/Navbar";

export default function RentalLoading() {
  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="bg-white rounded-xl border border-tiili-border p-6 space-y-3">
            <div className="h-6 bg-gray-200 rounded w-32" />
            <div className="h-40 bg-gray-100 rounded" />
          </div>
        </div>
      </main>
    </div>
  );
}
