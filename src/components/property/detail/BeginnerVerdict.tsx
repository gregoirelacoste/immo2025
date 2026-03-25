import { Property, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  property: Property;
  calcs: PropertyCalculations;
}

function getVerdict(p: Property, c: PropertyCalculations): { color: string; bgColor: string; borderColor: string; title: string; details: string[] } {
  const cf = c.monthly_cashflow;
  const renta = c.net_yield;
  const mensualite = c.monthly_payment + c.monthly_insurance;

  const details: string[] = [];

  // Monthly rent vs monthly cost
  if (p.monthly_rent > 0 && mensualite > 0) {
    details.push(
      `Ce bien rapporte ${formatCurrency(p.monthly_rent)}/mois de loyer et vous coûte ${formatCurrency(mensualite)}/mois de crédit.`
    );
  }

  // Cashflow explanation
  if (cf >= 50) {
    details.push(`Résultat : il vous reste ${formatCurrency(cf)} dans votre poche chaque mois après toutes les charges.`);
  } else if (cf >= 0) {
    details.push(`Le bien s'autofinance : le loyer couvre les charges, mais il ne reste presque rien.`);
  } else {
    details.push(`Vous devrez ajouter ${formatCurrency(Math.abs(cf))}/mois de votre poche pour compléter le remboursement.`);
  }

  // Yield context
  if (renta >= 6) {
    details.push(`Avec ${renta.toFixed(1)}% de rendement net, c'est un très bon investissement.`);
  } else if (renta >= 4) {
    details.push(`Avec ${renta.toFixed(1)}% de rendement net, c'est un investissement correct.`);
  } else if (renta >= 2) {
    details.push(`Avec ${renta.toFixed(1)}% de rendement net, c'est en dessous de la moyenne. Comparez avec d'autres biens.`);
  } else if (renta > 0) {
    details.push(`Le rendement de ${renta.toFixed(1)}% est faible. Ce bien n'est intéressant que si vous misez sur la plus-value à la revente.`);
  }

  if (renta >= 5 && cf >= 0) {
    return { color: "text-green-800", bgColor: "bg-green-50", borderColor: "border-green-200", title: "Bon investissement", details };
  }
  if (renta >= 3 && cf >= -50) {
    return { color: "text-amber-800", bgColor: "bg-amber-50", borderColor: "border-amber-200", title: "Investissement correct", details };
  }
  if (cf < -100) {
    return { color: "text-red-800", bgColor: "bg-red-50", borderColor: "border-red-200", title: "Attention : effort d'épargne important", details };
  }
  return { color: "text-amber-800", bgColor: "bg-amber-50", borderColor: "border-amber-200", title: "Investissement moyen", details };
}

export default function BeginnerVerdict({ property, calcs }: Props) {
  if (!property.purchase_price || !property.monthly_rent) return null;

  const verdict = getVerdict(property, calcs);

  return (
    <section className={`${verdict.bgColor} border ${verdict.borderColor} rounded-xl p-4 md:p-5 mb-2`}>
      <h3 className={`text-base font-bold ${verdict.color} mb-2`}>
        {verdict.title}
      </h3>
      <div className="space-y-1.5">
        {verdict.details.map((d, i) => (
          <p key={i} className={`text-sm ${verdict.color} leading-relaxed opacity-90`}>
            {d}
          </p>
        ))}
      </div>
    </section>
  );
}
