import type { SocioEconomicData, PopulationProfile } from "@/domains/enrich/socioeconomic-types";
import { inferPopulationProfile } from "@/domains/enrich/socioeconomic-types";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  data: SocioEconomicData | null;
}

const PROFILE_LABELS: Record<PopulationProfile, { label: string; icon: string; tip: string }> = {
  "étudiant": { label: "Zone étudiante", icon: "🎓", tip: "Forte demande en petites surfaces et colocations" },
  "jeune-actif": { label: "Jeunes actifs", icon: "💼", tip: "Bonne demande locative, revenus stables" },
  "famille": { label: "Zone familiale", icon: "👨‍👩‍👧‍👦", tip: "Demande en grandes surfaces, stabilité locative" },
  "retraité": { label: "Zone retraités", icon: "🏖️", tip: "Rotation faible, risque de vacance saisonnier" },
  "mixte": { label: "Population mixte", icon: "🏘️", tip: "Demande locative diversifiée" },
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-violet-100">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-[#1a1a2e]">{value}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}

export default function SocioEconomicPanel({ data }: Props) {
  if (!data) return null;

  const profile = inferPopulationProfile(data.ageDistribution, data.universityNearby);
  const profileInfo = PROFILE_LABELS[profile];

  const hasAnyData = data.population || data.medianIncome || data.unemploymentRate != null || data.schoolCount;
  if (!hasAnyData) return null;

  return (
    <section className="bg-violet-50 rounded-xl border border-violet-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold text-violet-900 mb-1">
        Données socio-économiques — {data.irisName ? `${data.irisName}, ${data.communeName}` : data.communeName}
      </h2>
      {data.irisCode && (
        <p className="text-[10px] text-violet-400 mb-1">
          Quartier IRIS {data.irisCode} — données à l&apos;échelle du quartier
        </p>
      )}
      {!data.irisCode && (
        <p className="text-[10px] text-violet-400 mb-1">
          Données à l&apos;échelle de la commune
        </p>
      )}

      {/* Population profile badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1 text-sm bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-medium">
          {profileInfo.icon} {profileInfo.label}
        </span>
        <span className="text-xs text-violet-500">{profileInfo.tip}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {data.population != null && (
          <StatCard
            label="Population"
            value={data.population.toLocaleString("fr-FR")}
            sub={data.populationYear ? `RP ${data.populationYear}` : undefined}
          />
        )}
        {data.medianIncome != null && (
          <StatCard
            label="Revenu médian"
            value={formatCurrency(data.medianIncome)}
            sub="par UC / an (Filosofi)"
          />
        )}
        {data.povertyRate != null && (
          <StatCard
            label="Taux de pauvreté"
            value={`${data.povertyRate} %`}
            sub="Filosofi"
          />
        )}
        {data.unemploymentRate != null && (
          <StatCard
            label="Chômage"
            value={`${data.unemploymentRate} %`}
            sub="Zone d'emploi"
          />
        )}
        {data.totalJobs != null && (
          <StatCard
            label="Emplois"
            value={data.totalJobs.toLocaleString("fr-FR")}
            sub="au lieu de travail"
          />
        )}
        {data.schoolCount != null && data.schoolCount > 0 && (
          <StatCard
            label="Établissements scolaires"
            value={String(data.schoolCount)}
            sub={data.universityNearby ? "+ université à proximité" : undefined}
          />
        )}
      </div>

      {/* Age distribution bar */}
      {data.ageDistribution && (
        <div className="mb-4">
          <p className="text-xs font-medium text-violet-800 mb-1.5">Répartition par âge</p>
          <div className="flex h-4 rounded-full overflow-hidden">
            <div
              className="bg-blue-400"
              style={{ width: `${data.ageDistribution.under20Pct}%` }}
              title={`< 20 ans: ${data.ageDistribution.under20Pct}%`}
            />
            <div
              className="bg-amber-500"
              style={{ width: `${data.ageDistribution.age20to39Pct}%` }}
              title={`20-39 ans: ${data.ageDistribution.age20to39Pct}%`}
            />
            <div
              className="bg-purple-500"
              style={{ width: `${data.ageDistribution.age40to59Pct}%` }}
              title={`40-59 ans: ${data.ageDistribution.age40to59Pct}%`}
            />
            <div
              className="bg-pink-400"
              style={{ width: `${data.ageDistribution.over60Pct}%` }}
              title={`60+ ans: ${data.ageDistribution.over60Pct}%`}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-500">
            <span>{'<'} 20 ans ({data.ageDistribution.under20Pct}%)</span>
            <span>20-39 ({data.ageDistribution.age20to39Pct}%)</span>
            <span>40-59 ({data.ageDistribution.age40to59Pct}%)</span>
            <span>60+ ({data.ageDistribution.over60Pct}%)</span>
          </div>
        </div>
      )}

      {/* Natural risks */}
      {data.naturalRisks.length > 0 && (
        <div>
          <p className="text-xs font-medium text-violet-800 mb-1.5">
            Risques naturels
            {data.riskLevel && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                data.riskLevel === "élevé" ? "bg-red-100 text-red-700" :
                data.riskLevel === "moyen" ? "bg-amber-100 text-amber-700" :
                "bg-green-100 text-green-700"
              }`}>
                {data.riskLevel}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.naturalRisks.map((risk, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  risk.level === "Fort" ? "bg-red-50 text-red-700 border-red-200" :
                  risk.level === "Moyen" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-gray-50 text-gray-600 border-tiili-border"
                }`}
              >
                {risk.type}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
