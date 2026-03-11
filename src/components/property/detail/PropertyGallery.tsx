interface Props {
  imageUrls: string;
  city: string;
}

export default function PropertyGallery({ imageUrls, city }: Props) {
  const images: string[] = (() => {
    try { return JSON.parse(imageUrls || "[]"); }
    catch { return []; }
  })();

  if (images.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex gap-1 overflow-x-auto snap-x snap-mandatory">
        {images.map((url: string, i: number) => (
          <div key={i} className="snap-center shrink-0 w-full md:w-auto md:max-w-[400px] aspect-[4/3] relative bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Photo ${i + 1} — ${city}`}
              className="w-full h-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <p className="text-xs text-gray-400 text-center py-2">
          {images.length} photos — glissez pour voir
        </p>
      )}
    </section>
  );
}
