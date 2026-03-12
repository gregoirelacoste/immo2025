import Navbar from "@/components/Navbar";

export default function PropertyLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-40" />
              <div className="h-4 bg-gray-200 rounded w-56" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-24" />
          </div>

          {/* Hero KPIs */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="flex justify-between">
              <div className="h-6 bg-gray-200 rounded w-32" />
              <div className="h-6 bg-gray-200 rounded w-28" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-16" />
                  <div className="h-6 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 py-3 flex justify-center">
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-28" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
