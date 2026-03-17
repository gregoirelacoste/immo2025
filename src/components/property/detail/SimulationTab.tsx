"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import { Simulation } from "@/domains/simulation/types";
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

