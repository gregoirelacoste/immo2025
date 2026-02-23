import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-lg w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Immo2025</h1>
          <p className="text-lg text-gray-600 mb-8">
            Simulateur d&apos;investissement locatif
          </p>
          <p className="text-gray-500 mb-8">
            Calculez la rentabilité de vos investissements immobiliers en
            quelques clics. Cash-flow, rendement brut et net, mensualités de
            crédit, comparaison location classique vs Airbnb.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/auth/signup"
              className="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
