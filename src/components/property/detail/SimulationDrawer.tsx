"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import { Simulation } from "@/domains/simulation/types";
import type { LocalityDataFields } from "@/domains/locality/types";
import { duplicateSimulation, removeSimulation, createDefaultSimulationAction } from "@/domains/simulation/actions";
import { setActiveSimulationAction } from "@/domains/property/actions";
import { fetchLocalityFields } from "@/domains/locality/actions";
import { buildSystemSimulation } from "@/domains/simulation/system";
import SimulationCard from "./SimulationCard";
import SimulationEditor from "./SimulationEditor";

interface Props {
  property: Property;
  simulations: Simulation[];
  isOwner: boolean;
  open: boolean;
  onClose: () => void;
  onLiveCalcsChange?: (sim: Simulation | null) => void;
}

export default function SimulationDrawer({ property, simulations, isOwner, open, onClose, onLiveCalcsChange }: Props) {
  const router = useRouter();
  const [localityFields, setLocalityFields] = useState<LocalityDataFields | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveSim, setLiveSimLocal] = useState<Simulation | null>(null);

  const setLiveSim = useCallback((sim: Simulation | null) => {
    setLiveSimLocal(sim);
    onLiveCalcsChange?.(sim);
  }, [onLiveCalcsChange]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await fetchLocalityFields(property.city, property.postal_code || undefined);
      if (!cancelled && result) setLocalityFields(result.fields);
    }
    if (property.city && open) load();
    return () => { cancelled = true; };
  }, [property.city, property.postal_code, open]);

  const systemSim = useMemo(() => buildSystemSimulation(property, localityFields), [property, localityFields]);
  const activeSimId = property.active_simulation_id || "__system__";

  const [selectedSimId, setSelectedSimId] = useState<string>(activeSimId);

  // Reset selection when drawer opens
  useEffect(() => {
    if (open) {
      const validId = activeSimId === "__system__"
        ? "__system__"
        : simulations.find((s) => s.id === activeSimId)?.id ?? "__system__";
      setSelectedSimId(validId);
      setLiveSim(null);
    }
  }, [open, activeSimId, simulations, setLiveSim]);

  const isSystemSelected = selectedSimId === "__system__";
  const serverActiveSim = isSystemSelected
    ? systemSim
    : simulations.find((s) => s.id === selectedSimId) ?? systemSim;
  const activeSim = liveSim && liveSim.id === selectedSimId ? liveSim : serverActiveSim;
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
      if (favoriteSimId === simId) {
        await setActiveSimulationAction(property.id, "");
      }
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

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer — bottom sheet on mobile, side panel on desktop */}
      <div className="fixed inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[480px] bg-white z-[70] rounded-t-2xl md:rounded-none shadow-xl flex flex-col max-h-[90vh] md:max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-tiili-border shrink-0">
          <h3 className="text-base font-bold text-[#1a1a2e]">Simulations</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
          {/* Simulation cards row */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
            {/* System/Défaut card */}
            <div className="min-w-[240px] max-w-[280px] snap-start shrink-0">
              <SimulationCard
                property={property}
                simulation={isSystemSelected && liveSim ? liveSim : systemSim}
                isActive={isSystemSelected}
                isFavorite={favoriteSimId === "__system__"}
                onSelect={() => { setSelectedSimId("__system__"); setLiveSim(null); }}
                onSetFavorite={isOwner ? () => handleSetFavorite("__system__") : undefined}
                onDuplicate={isOwner ? () => handleDuplicateSystem() : undefined}
                canDelete={false}
                isSystem
              />
            </div>

            {/* User simulations */}
            {simulations.map((sim) => {
              const displaySim = liveSim && liveSim.id === sim.id ? liveSim : sim;
              return (
                <div key={sim.id} className="min-w-[240px] max-w-[280px] snap-start shrink-0">
                  <SimulationCard
                    property={property}
                    simulation={displaySim}
                    isActive={sim.id === selectedSimId}
                    isFavorite={favoriteSimId === sim.id}
                    onSelect={() => { setSelectedSimId(sim.id); setLiveSim(null); }}
                    onSetFavorite={isOwner ? () => handleSetFavorite(sim.id) : undefined}
                    onDuplicate={isOwner ? () => handleDuplicate(sim.id) : undefined}
                    onDelete={isOwner ? () => handleDelete(sim.id) : undefined}
                    canDelete={isOwner}
                  />
                </div>
              );
            })}

            {/* Add button */}
            {isOwner && (
              <div className="min-w-[100px] snap-start shrink-0">
                <button
                  onClick={() => {
                    const lastSim = simulations[simulations.length - 1];
                    if (lastSim) handleDuplicate(lastSim.id);
                    else handleDuplicateSystem();
                  }}
                  disabled={loading}
                  className="w-full h-full min-h-[140px] rounded-xl border-2 border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50/50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-amber-600"
                >
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-xs font-medium">Ajouter</span>
                </button>
              </div>
            )}
          </div>

          {/* Info badge for selected simulation */}
          <div className="flex items-center gap-2 text-[11px]">
            {isSystemSelected ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M20.016 4.356v4.992" />
                </svg>
                Synchro auto avec les onglets du bien
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
                Snapshot independant — toutes les valeurs sont editables
              </span>
            )}
          </div>

          {/* Editor */}
          {isSystemSelected && (
            <SimulationEditor
              property={property}
              simulation={systemSim}
              onUpdated={() => {}}
              readOnly
            />
          )}

          {!isSystemSelected && activeSim && isOwner && (
            <SimulationEditor
              property={property}
              simulation={activeSim}
              onUpdated={() => router.refresh()}
              onLiveChange={setLiveSim}
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
      </div>
    </>
  );
}
