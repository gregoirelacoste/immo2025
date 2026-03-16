import Navbar from "@/components/Navbar";

export default function CompareLoading() {
  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded-full w-24" />
            ))}
          </div>
          <div className="bg-white rounded-xl border border-tiili-border overflow-hidden">
            <div className="h-10 bg-gray-100" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 border-t border-gray-100 flex items-center px-4 gap-4">
                <div className="h-4 bg-gray-200 rounded w-28" />
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
