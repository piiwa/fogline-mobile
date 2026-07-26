/**
 * Ring shaping — turns raw H3 boundaries into something that reads as fog.
 *
 * A dissolved H3 area is a hexagonal staircase: every cell contributes six
 * vertices, so the frontier is visibly faceted and carries far more points than
 * the renderer needs. Two pure passes fix both problems:
 *
 *   simplifyRing  — Ramer–Douglas–Peucker. Drops vertices that sit within a
 *                   tolerance of the line they lie on. This is the single
 *                   biggest lever on native-overlay performance.
 *   smoothRing    — Chaikin corner cutting. Replaces each corner with two
 *                   points at ¼ and ¾ along its edges, converging toward a
 *                   quadratic B-spline. Removes the hexagon facets, and also
 *                   removes the sharp concave joins that make wide strokes spike
 *                   on Android (where `lineJoin` is not supported).
 *
 * Both operate on closed rings of [lng, lat] pairs and are exhaustively pure.
 */
export type Ring = number[][];

/** Perpendicular distance from `p` to the segment `a`–`b`, in coordinate units. */
function perpendicularDistance(p: number[], a: number[], b: number[]): number {
  const [px, py] = [p[0] as number, p[1] as number];
  const [ax, ay] = [a[0] as number, a[1] as number];
  const [bx, by] = [b[0] as number, b[1] as number];

  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);

  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + clamped * dx), py - (ay + clamped * dy));
}

/** Ramer–Douglas–Peucker on an open polyline. */
function rdp(points: Ring, tolerance: number): Ring {
  if (points.length < 3) return points;

  const first = points[0] as number[];
  const last = points[points.length - 1] as number[];

  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i] as number[], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance <= tolerance) return [first, last];

  const left = rdp(points.slice(0, index + 1), tolerance);
  const right = rdp(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

/**
 * Simplify a closed ring, keeping it closed and never degenerating below a
 * triangle (both renderers reject rings with fewer than three points).
 */
export function simplifyRing(ring: Ring, tolerance: number): Ring {
  if (ring.length <= 4 || tolerance <= 0) return ring;
  const simplified = rdp(ring, tolerance);
  return simplified.length >= 3 ? simplified : ring;
}

/**
 * Chaikin corner cutting on a CLOSED ring. Each iteration roughly doubles the
 * point count, so run it after simplification and keep iterations low.
 */
export function smoothRing(ring: Ring, iterations = 2): Ring {
  if (ring.length < 3 || iterations <= 0) return ring;

  let current = ring;
  for (let pass = 0; pass < iterations; pass += 1) {
    const next: Ring = [];
    for (let i = 0; i < current.length; i += 1) {
      const a = current[i] as number[];
      const b = current[(i + 1) % current.length] as number[];
      const ax = a[0] as number;
      const ay = a[1] as number;
      const bx = b[0] as number;
      const by = b[1] as number;

      next.push([ax + 0.25 * (bx - ax), ay + 0.25 * (by - ay)]);
      next.push([ax + 0.75 * (bx - ax), ay + 0.75 * (by - ay)]);
    }
    current = next;
  }
  return current;
}

/** Simplify then smooth — the order matters: cheap first, then shape. */
export function shapeRing(ring: Ring, tolerance: number, smoothing = 2): Ring {
  return smoothRing(simplifyRing(ring, tolerance), smoothing);
}

/**
 * Shape a ring so it never exceeds `maxPoints`.
 *
 * A hard vertex budget is a SAFETY requirement, not a performance one: iOS
 * copies each interior ring into a stack-allocated array
 * (`AIRMapPolygon.m: CLLocationCoordinate2D coords[holes[h].count]`), and the
 * main thread has about 1 MB of stack. A ring of tens of thousands of points
 * overflows it and takes the process down with a SIGSEGV that no JS-side
 * try/catch can see.
 *
 * Dropping the ring instead would un-reveal ground the user genuinely walked,
 * so the budget is met by simplifying harder — the outline gets coarser, never
 * shorter. Tolerance is raised geometrically until the ring fits.
 */
export function shapeRingWithin(ring: Ring, maxPoints: number, smoothing = 2): Ring {
  // Chaikin multiplies the point count by 2 per pass, so aim the simplification
  // at the budget the smoothing will consume.
  const preSmoothBudget = Math.max(3, Math.floor(maxPoints / Math.pow(2, smoothing)));

  let tolerance = 0.00002;
  let simplified = simplifyRing(ring, tolerance);

  // Geometric backoff, hard-capped: a pathological ring must terminate.
  for (let attempt = 0; attempt < 24 && simplified.length > preSmoothBudget; attempt += 1) {
    tolerance *= 2;
    simplified = simplifyRing(ring, tolerance);
  }

  const shaped = smoothRing(simplified, smoothing);
  // Last resort — decimate. Only reachable if simplification cannot converge,
  // and still preferable to handing the renderer a ring that crashes it.
  if (shaped.length <= maxPoints) return shaped;

  const stride = Math.ceil(shaped.length / maxPoints);
  const decimated = shaped.filter((_, index) => index % stride === 0);
  return decimated.length >= 3 ? decimated : shaped.slice(0, 3);
}
