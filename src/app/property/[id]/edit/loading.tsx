import Navbar from "@/components/Navbar";

export default function EditLoading() {
  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="bg-white rounded-xl border border-tiili-border p-6 space-y-4">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded w-2/3" />
          </div>
          <div className="bg-white rounded-xl border border-tiili-border p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-32" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
