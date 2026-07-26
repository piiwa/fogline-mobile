import { useEffect, useMemo } from "react";

import { useQuery } from "@/hooks/use-query.hook";

import { dissolveToMultiPolygon } from "../core/grid";
import type { MultiPolygonCoords } from "../core/grid.types";
import { getExplorationStore } from "../data/exploration.database";
import { onCellsRevealed } from "../engine/location-engine";
import { syncNow } from "../sync/sync-service";

/** Average area of a res-10 H3 cell (km²), for the coverage readout. */
const CELL_AREA_KM2 = 0.0150475;

export interface UseExploration {
  cells: string[];
  cellCount: number;
  areaKm2: number;
  /** Dissolved explored geometry (GeoJSON MultiPolygon coords) for the fog. */
  exploredMultiPolygon: MultiPolygonCoords;
  refresh: () => Promise<void>;
}

/**
 * Reads the explored-cell set from the offline store, keeps it fresh as new
 * territory is revealed, and pulls remote exploration once on mount (multi-
 * device). The dissolved geometry is memoized so the fog only recomputes when
 * the set changes.
 */
export function useExploration(): UseExploration {
  const { data, refresh } = useQuery<string[]>(async () => {
    const store = await getExplorationStore();
    return store.getAllCells();
  }, []);
  const cells = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    // Pull cross-device exploration, then reflect it locally.
    void syncNow().then(refresh);
  }, [refresh]);

  useEffect(() => onCellsRevealed(() => void refresh()), [refresh]);

  const exploredMultiPolygon = useMemo(() => dissolveToMultiPolygon(cells), [cells]);

  return {
    cells,
    cellCount: cells.length,
    areaKm2: cells.length * CELL_AREA_KM2,
    exploredMultiPolygon,
    refresh,
  };
}
