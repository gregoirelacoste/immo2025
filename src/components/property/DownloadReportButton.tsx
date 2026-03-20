"use client";

export default function DownloadReportButton() {
  return (
    <button
      onClick={() => {
        document.body.setAttribute(
          "data-print-date",
          new Date().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        );
        window.print();
      }}
      className="p-2.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 min-h-[44px] min-w-[44px] flex items-center justify-center print:hidden"
      title="Télécharger le rapport PDF"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
    </button>
  );
}
