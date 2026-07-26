import { useCallback, useEffect, useRef, useState } from "react";

import { getExplorationStore } from "../data/exploration.database";
import { emitRevealed } from "../engine/location-engine";
import { processFix, type LastFix } from "../engine/location-processor";
import { syncNow } from "../sync/sync-service";

import { buildDemoWalk } from "./demo-route";

/** Delay between replayed fixes — slow enough to watch the mist recede. */
const STEP_INTERVAL_MS = 550;

export interface UseDemoWalk {
  isWalking: boolean;
  /** Replay a synthetic walk from `origin`, revealing ground as it goes. */
  start: (origin: { lat: number; lng: number }) => void;
  stop: () => void;
}

/**
 * Demo mode: replays a synthetic walk so the feature can be seen without
 * physically walking (and on a simulator, which has no pedometer at all).
 *
 * Every leg goes through `processFix`, the SAME pure decision function a real
 * GPS fix goes through. That matters for more than tidiness: a demo that wrote
 * straight to the store would be a button that reveals ground without walking,
 * on a set that never forgets. Someone on a train, whose every genuine fix the
 * filter is busy rejecting, could press it and permanently claim territory the
 * rule says they did not earn. Routed through the filter, the button cannot
 * reveal anything a walk of that shape would not have revealed.
 *
 * The reference fix is held LOCALLY rather than in the persisted last-fix store.
 * An earlier version wrote there on every tick to fake elapsed time, which left
 * the real engine measuring its next genuine fix against a synthetic position
 * stamped in the future, and made running the demo during live tracking a
 * two-writer race on a single value.
 */
export function useDemoWalk(): UseDemoWalk {
  const [isWalking, setIsWalking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const referenceRef = useRef<LastFix | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setIsWalking(false);
  }, []);

  // A walk in progress owns a pending timeout; leaving the screen without
  // clearing it would keep revealing ground after the UI is gone.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  const start = useCallback(
    (origin: { lat: number; lng: number }) => {
      if (timerRef.current) return;
      setIsWalking(true);
      // A fresh walk starts with no reference, so its first leg seeds and the
      // rest are judged against the leg before them, exactly like a real walk.
      referenceRef.current = null;

      const walk = buildDemoWalk(origin, Date.now());
      let index = 0;

      const tick = (): void => {
        const leg = walk[index];
        if (!leg) {
          stop();
          return;
        }
        index += 1;

        const result = processFix(leg.sample, referenceRef.current, leg.steps);
        referenceRef.current = result.nextLastFix;

        if (result.accepted) {
          void (async () => {
            const store = await getExplorationStore();
            const { added } = await store.addCells(result.cells);
            if (added.length > 0) {
              emitRevealed(added);
              void syncNow();
            }
          })();
        }

        timerRef.current = setTimeout(tick, STEP_INTERVAL_MS);
      };

      timerRef.current = setTimeout(tick, STEP_INTERVAL_MS);
    },
    [stop],
  );

  return { isWalking, start, stop };
}
