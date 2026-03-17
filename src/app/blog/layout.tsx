import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import BlogFooter from "@/components/BlogFooter";

export const metadata: Metadata = {
  title: {
    template: "%s — Blog tiili.fr",
    default: "Blog — Investissement immobilier locatif | tiili.fr",
  },
  description:
    "Guides, analyses et données pour réussir votre investissement immobilier locatif en France.",
};

export default function BlogLayout({
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
