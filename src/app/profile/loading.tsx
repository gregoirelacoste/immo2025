import Navbar from "@/components/Navbar";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <div className="h-8 bg-gray-200 rounded w-36 mb-6 animate-pulse" />
        <div className="animate-pulse space-y-4">
          <div className="bg-white rounded-xl border border-tiili-border p-6 space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-200 rounded w-48" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-tiili-border p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-10 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
