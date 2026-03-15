"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import { Simulation } from "@/domains/simulation/types";
import { calculateSimulation as calcSim, formatCurrency, formatPercent } from "@/lib/calculations";
import { duplicateSimulation, removeSimulation, createDefaultSimulationAction } from "@/domains/simulation/actions";
import SimulationCard from "./SimulationCard";
import SimulationEditor from "./SimulationEditor";

interface Props {
  property: Property;
  simulations: Simulation[];
  isOwner: boolean;
}

export default function SimulationTab({ property, simulations, isOwner }: Props) {
  const router = useRouter();
  const [activeSimId, setActiveSimId] = useState<string | null>(
    simulations.length > 0 ? simulations[0].id : null
  );
  const [loading, setLoading] = useState(false);

  const activeSim = simulations.find((s) => s.id === activeSimId) ?? simulations[0] ?? null;

  async function handleDuplicate(simId: string) {
    setLoading(true);
    const result = await duplicateSimulation(simId);
    if (result.success && result.simulationId) {
      setActiveSimId(result.simulationId);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(simId: string) {
    if (!confirm("Supprimer cette simulation ?")) return;
    setLoading(true);
    const result = await removeSimulation(simId);
    if (result.success) {
      // Select first remaining simulation
      const remaining = simulations.filter((s) => s.id !== simId);
      setActiveSimId(remaining.length > 0 ? remaining[0].id : null);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleCreateFirst() {
    setLoading(true);
    const result = await createDefaultSimulationAction(property.id);
    if (result.success && result.simulationId) {
      setActiveSimId(result.simulationId);
    }
    setLoading(false);
    router.refresh();
  }

  // No simulations yet — show create button
  if (simulations.length === 0) {
    return (
      <div className="mt-4">
        <section className="bg-white rounded-xl border border-tiili-border p-6 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Aucune simulation pour ce bien. Créez votre première simulation pour explorer différents scénarios financiers.
          </p>
          <button
            onClick={handleCreateFirst}
            disabled={loading}
            className="px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {loading ? "Création..." : "Créer une simulation"}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Simulation cards row */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
        {simulations.map((sim) => (
          <div key={sim.id} className="min-w-[260px] max-w-[300px] snap-start shrink-0">
            <SimulationCard
              property={property}
              simulation={sim}
              isActive={sim.id === activeSimId}
              onSelect={() => setActiveSimId(sim.id)}
              onDuplicate={() => handleDuplicate(sim.id)}
              onDelete={isOwner ? () => handleDelete(sim.id) : undefined}
              canDelete={simulations.length > 1}
            />
          </div>
        ))}

        {/* Add button */}
        {isOwner && (
          <div className="min-w-[120px] snap-start shrink-0">
            <button
              onClick={() => {
                const lastSim = simulations[simulations.length - 1];
                if (lastSim) handleDuplicate(lastSim.id);
              }}
              disabled={loading}
              className="w-full h-full min-h-[140px] rounded-xl border-2 border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50/50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-amber-600"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-xs font-medium">Ajouter</span>
            </button>
          </div>
        )}
      </div>

      {/* Active simulation editor */}
      {activeSim && isOwner && (
        <SimulationEditor
          property={property}
          simulation={activeSim}
          onUpdated={() => router.refresh()}
        />
      )}

      {/* Read-only view for non-owners */}
      {activeSim && !isOwner && (
        <SimulationReadOnly property={property} simulation={activeSim} />
      )}
    </div>
  );
}

/** Read-only simulation view for non-owners */
function SimulationReadOnly({ property, simulation }: { property: Property; simulation: Simulation }) {
  const calcs = calcSim(property, simulation);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[#1a1a2e]">{simulation.name}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-white rounded-xl border border-tiili-border p-4">
        <div>
          <span className="text-gray-500">Rentabilité nette</span>
          <p className="font-semibold">{formatPercent(calcs.net_yield)}</p>
        </div>
        <div>
          <span className="text-gray-500">Cash-flow / mois</span>
          <p className={`font-semibold ${calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(calcs.monthly_cashflow)}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Mensualité</span>
          <p className="font-semibold">{formatCurrency(calcs.monthly_payment)}</p>
        </div>
        <div>
          <span className="text-gray-500">Coût total crédit</span>
          <p className="font-semibold">{formatCurrency(calcs.total_loan_cost)}</p>
        </div>
        <div>
          <span className="text-gray-500">Apport</span>
          <p className="font-semibold">{formatCurrency(simulation.personal_contribution)}</p>
        </div>
        <div>
          <span className="text-gray-500">Durée</span>
          <p className="font-semibold">{simulation.loan_duration} ans</p>
        </div>
      </div>
    </div>
  );
}
