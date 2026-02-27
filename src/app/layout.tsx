import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Immo2025 - Simulateur d'investissement locatif",
  description:
    "Calculez la rentabilité de vos investissements immobiliers : cash-flow, rendement, mensualités de crédit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
