"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import { Simulation } from "@/domains/simulation/types";
import { calculateSimulation as calcSim, formatCurrency, formatPercent } from "@/lib/calculations";
import { duplicateSimulation, removeSimulation, createDefaultSimulationAction } from "@/domains/simulation/actions";
import { setActiveSimulationAction } from "@/domains/property/actions";
import { buildSystemSimulation } from "@/domains/simulation/system";
import SimulationCard from "./SimulationCard";
import SimulationEditor from "./SimulationEditor";

interface Props {
  property: Property;
  simulations: Simulation[];
  isOwner: boolean;
}

export default function SimulationTab({ property, simulations, isOwner }: Props) {
  const router = useRouter();
  const systemSim = buildSystemSimulation(property);

  // Determine initial active card: system sim or a user sim
  const activeSimId = property.active_simulation_id || "__system__";
  const [selectedSimId, setSelectedSimId] = useState<string>(
    // If viewing, select the active simulation. If it's a user sim, make sure it exists.
    activeSimId === "__system__"
      ? "__system__"
      : simulations.find((s) => s.id === activeSimId)?.id ?? "__system__"
  );
  const [loading, setLoading] = useState(false);

  const isSystemSelected = selectedSimId === "__system__";
  const activeSim = isSystemSelected
    ? systemSim
    : simulations.find((s) => s.id === selectedSimId) ?? systemSim;

  const favoriteSimId = property.active_simulation_id || "__system__";

  async function handleDuplicate(simId: string) {
    setLoading(true);
    const result = await duplicateSimulation(simId);
    if (result.success && result.simulationId) {
      setSelectedSimId(result.simulationId);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleDuplicateSystem() {
    // Create a user simulation from system simulation values
    setLoading(true);
    const result = await createDefaultSimulationAction(property.id);
    if (result.success && result.simulationId) {
      setSelectedSimId(result.simulationId);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(simId: string) {
    if (!confirm("Supprimer cette simulation ?")) return;
    setLoading(true);
    const result = await removeSimulation(simId);
    if (result.success) {
      // If we deleted the favorite, reset to system
      if (favoriteSimId === simId) {
        await setActiveSimulationAction(property.id, "");
      }
      // Select system sim after deletion
      setSelectedSimId("__system__");
    }
    setLoading(false);
    router.refresh();
  }

  async function handleSetFavorite(simId: string) {
    setLoading(true);
    await setActiveSimulationAction(property.id, simId === "__system__" ? "" : simId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Simulation cards row */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
        {/* System simulation card (always first) */}
        <div className="min-w-[260px] max-w-[300px] snap-start shrink-0">
          <SimulationCard
            property={property}
            simulation={systemSim}
            isActive={isSystemSelected}
            isFavorite={favoriteSimId === "__system__"}
            onSelect={() => setSelectedSimId("__system__")}
            onSetFavorite={isOwner ? () => handleSetFavorite("__system__") : undefined}
            onDuplicate={() => handleDuplicateSystem()}
            canDelete={false}
            isSystem
          />
        </div>

        {/* User simulations */}
        {simulations.map((sim) => (
          <div key={sim.id} className="min-w-[260px] max-w-[300px] snap-start shrink-0">
            <SimulationCard
              property={property}
              simulation={sim}
              isActive={sim.id === selectedSimId}
              isFavorite={favoriteSimId === sim.id}
              onSelect={() => setSelectedSimId(sim.id)}
              onSetFavorite={isOwner ? () => handleSetFavorite(sim.id) : undefined}
              onDuplicate={() => handleDuplicate(sim.id)}
              onDelete={isOwner ? () => handleDelete(sim.id) : undefined}
              canDelete={true}
            />
          </div>
        ))}

        {/* Add button */}
        {isOwner && (
          <div className="min-w-[120px] snap-start shrink-0">
            <button
              onClick={() => {
                const lastSim = simulations[simulations.length - 1];
                if (lastSim) {
                  handleDuplicate(lastSim.id);
                } else {
                  handleDuplicateSystem();
                }
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

      {/* System simulation: read-only view */}
      {isSystemSelected && (
        <SystemSimulationReadOnly property={property} simulation={systemSim} />
      )}

      {/* User simulation: editor (owner) or read-only (non-owner) */}
      {!isSystemSelected && activeSim && isOwner && (
        <SimulationEditor
          property={property}
          simulation={activeSim}
          onUpdated={() => router.refresh()}
        />
      )}

      {!isSystemSelected && activeSim && !isOwner && (
        <SimulationReadOnly property={property} simulation={activeSim} />
      )}
    </div>
  );
}

/** System simulation: always read-only, shows where data comes from */
function SystemSimulationReadOnly({ property, simulation }: { property: Property; simulation: Simulation }) {
  const calcs = calcSim(property, simulation);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
        <h3 className="text-lg font-bold text-[#1a1a2e]">Simulation système</h3>
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        Calculée automatiquement à partir des données du bien et des moyennes de la localité. Non modifiable.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="p-3 bg-tiili-surface rounded-xl text-center">
          <p className={`text-xl font-extrabold font-[family-name:var(--font-mono)] ${
            calcs.net_yield >= 6 ? "text-green-600" : calcs.net_yield >= 4 ? "text-blue-600" : calcs.net_yield >= 2 ? "text-amber-600" : "text-red-600"
          }`}>
            {calcs.net_yield.toFixed(2)}%
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Renta nette</p>
        </div>
        <div className="p-3 bg-tiili-surface rounded-xl text-center">
          <p className={`text-xl font-extrabold font-[family-name:var(--font-mono)] ${
            calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            {calcs.monthly_cashflow > 0 ? "+" : ""}{Math.round(calcs.monthly_cashflow)}{"\u202f"}&euro;
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Cash-flow /mois</p>
        </div>
        <div className="p-3 bg-tiili-surface rounded-xl text-center">
          <p className="text-xl font-extrabold text-gray-700 font-[family-name:var(--font-mono)]">
            {formatCurrency(calcs.monthly_payment)}
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Mensualité</p>
        </div>
        <div className="p-3 bg-tiili-surface rounded-xl text-center">
          <p className="text-xl font-extrabold text-gray-700 font-[family-name:var(--font-mono)]">
            {formatCurrency(calcs.total_loan_cost)}
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Coût crédit</p>
        </div>
      </div>

      {/* Detailed params */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-white rounded-xl border border-tiili-border p-4">
        <div>
          <span className="text-gray-500">Montant emprunté</span>
          <p className="font-semibold">{formatCurrency(simulation.loan_amount)}</p>
        </div>
        <div>
          <span className="text-gray-500">Loyer mensuel</span>
          <p className="font-semibold">{formatCurrency(simulation.monthly_rent)}</p>
        </div>
        <div>
          <span className="text-gray-500">Rentabilité brute</span>
          <p className="font-semibold">{formatPercent(calcs.gross_yield)}</p>
        </div>
        <div>
          <span className="text-gray-500">Charges annuelles</span>
          <p className="font-semibold">{formatCurrency(calcs.annual_charges)}</p>
        </div>
        <div>
          <span className="text-gray-500">Frais de notaire</span>
          <p className="font-semibold">{formatCurrency(calcs.total_notary_fees)}</p>
        </div>
        <div>
          <span className="text-gray-500">Coût total projet</span>
          <p className="font-semibold text-amber-600">{formatCurrency(calcs.total_project_cost)}</p>
        </div>
      </div>
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
