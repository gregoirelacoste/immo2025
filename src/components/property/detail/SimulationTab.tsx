"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import { Simulation } from "@/domains/simulation/types";
import { duplicateSimulation, removeSimulation, createDefaultSimulationAction, resyncSimulationsAction } from "@/domains/simulation/actions";
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

  async function handleResync() {
    setLoading(true);
    await resyncSimulationsAction(property.id);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Resync button (owner only) */}
      {isOwner && simulations.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleResync}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors disabled:opacity-50"
            title="Recalculer les simulations avec les données actuelles du bien"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M20.016 4.356v4.992" />
            </svg>
            Recalculer les simulations
          </button>
        </div>
      )}

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
            onDuplicate={isOwner ? () => handleDuplicateSystem() : undefined}
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
              onDuplicate={isOwner ? () => handleDuplicate(sim.id) : undefined}
              onDelete={isOwner ? () => handleDelete(sim.id) : undefined}
              canDelete={isOwner}
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

      {/* System simulation: same editor UI in read-only mode */}
      {isSystemSelected && (
        <SimulationEditor
          property={property}
          simulation={systemSim}
          onUpdated={() => {}}
          readOnly
        />
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
        <SimulationEditor
          property={property}
          simulation={activeSim}
          onUpdated={() => {}}
          readOnly
        />
      )}
    </div>
  );
}

