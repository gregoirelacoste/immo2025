import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import BlogFooter from "@/components/BlogFooter";

export const metadata: Metadata = {
  title: {
    template: "%s — Guide investissement | tiili.io",
    default: "Guides villes — Investissement immobilier locatif | tiili.io",
  },
  description:
    "Guides d'investissement locatif par ville : prix, loyers, rendements, quartiers, risques. Données DVF et INSEE.",
};

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>{children}</main>
      <BlogFooter />
    </div>
  );
}
