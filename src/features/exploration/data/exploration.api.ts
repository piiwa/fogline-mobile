import { getAxios } from "@/api/axios-instance";

/**
 * Exploration sync endpoints. The payload is deliberately minimal: only coarse
 * H3 cell ids cross the wire — never coordinates, routes, or timestamps (AD-5).
 */
/** Wire shape. `cursor` is null while the identity has explored nothing. */
interface BackendCellsResponse {
  cells: string[];
  /** Opaque — stored and replayed verbatim, never interpreted. */
  cursor: string | null;
  has_more: boolean;
}

/** Push newly-explored cells. Idempotent server-side (union). */
export async function pushCells(cellIds: string[]): Promise<void> {
  if (cellIds.length === 0) return;
  await getAxios().post("/exploration/cells", { cells: cellIds });
}

/**
 * Pull cells added since `cursor` (cross-device merge).
 *
 * The cursor is opaque end-to-end: the client stores whatever the server sent
 * and hands it back unchanged. That keeps the server free to change how it
 * encodes a position — it has already moved from a row id to a
 * (timestamp, id) pair — without a client release.
 */
export async function pullCells(
  since: string | undefined,
): Promise<{ cells: string[]; cursor: string | undefined; hasMore: boolean }> {
  const params = since !== undefined ? { since } : undefined;

  const res = await getAxios().get<BackendCellsResponse>("/exploration/cells", { params });
  return {
    cells: res.data.cells,
    cursor: res.data.cursor ?? undefined,
    hasMore: res.data.has_more,
  };
}
