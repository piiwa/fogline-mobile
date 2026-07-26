/**
 * Grow-only set (G-Set) — the CRDT behind conflict-free multi-device sync.
 *
 * Exploration only ever grows (AD-5): explored never reverts to unexplored. A
 * grow-only set merges by plain union, so two devices exploring offline in any
 * order converge to the same state with zero coordination and no conflicts.
 *
 * PURE: no I/O. `sync-service` composes these with the store + api.
 */

/** Union of two cell collections. Commutative, idempotent. */
export function union(a: Iterable<string>, b: Iterable<string>): Set<string> {
  const out = new Set<string>(a);
  for (const x of b) out.add(x);
  return out;
}

/**
 * Cells present locally but not remotely — the delta to PUSH. Only new cells
 * cross the wire (minimal, aggregated payload).
 */
export function delta(local: Iterable<string>, remote: Iterable<string>): string[] {
  const remoteSet = remote instanceof Set ? remote : new Set(remote);
  const out: string[] = [];
  for (const cell of local) {
    if (!remoteSet.has(cell)) out.push(cell);
  }
  return out;
}

/**
 * Merge incoming cells into the local set. Monotone (never removes) and reports
 * exactly which cells were newly added, so the renderer can animate only the
 * fresh territory.
 */
export function merge(
  local: Set<string>,
  incoming: Iterable<string>,
): { next: Set<string>; added: string[] } {
  const next = new Set<string>(local);
  const added: string[] = [];
  for (const cell of incoming) {
    if (!next.has(cell)) {
      next.add(cell);
      added.push(cell);
    }
  }
  return { next, added };
}
