import Navbar from "@/components/Navbar";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded-full w-20" />
            ))}
          </div>
          <div className="md:hidden space-y-3 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="h-32 bg-gray-200 rounded-lg" />
                <div className="h-5 bg-gray-200 rounded w-32" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-10 bg-gray-100 rounded" />
                  <div className="h-10 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block mt-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="h-10 bg-gray-100" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 border-t border-gray-100 flex items-center px-4 gap-4">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
