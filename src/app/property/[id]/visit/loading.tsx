export default function VisitLoading() {
  return (
    <div className="min-h-screen bg-[#f4f3ef] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500 font-medium">Chargement du mode visite...</p>
      </div>
    </div>
  );
}
