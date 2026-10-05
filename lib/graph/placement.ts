type Point = { x: number; y: number };
type Rect = Point & { width: number; height: number };

/** Canvas snap grid, in flow units. */
export const GRID = 16;

export function snapToGrid(p: Point): Point {
  return { x: Math.round(p.x / GRID) * GRID, y: Math.round(p.y / GRID) * GRID };
}

/** Default footprint of a component node (w-48 card) plus breathing room. */
export const SLOT = { width: 192, height: 72, gap: 32 };

const MAX_RINGS = 12;

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * Nearest spot to `desired` (top-left) where a new node does not overlap any existing rect.
 * Searches outward in square rings of slot-sized steps.
 */
export function findFreePosition(desired: Point, occupied: Rect[]): Point {
  const stepX = SLOT.width + SLOT.gap;
  const stepY = SLOT.height + SLOT.gap;
  const fits = (p: Point) =>
    !occupied.some((r) =>
      overlaps(
        { ...p, width: SLOT.width, height: SLOT.height },
        {
          x: r.x - SLOT.gap / 2,
          y: r.y - SLOT.gap / 2,
          width: r.width + SLOT.gap,
          height: r.height + SLOT.gap,
        },
      ),
    );

  for (let ring = 0; ring <= MAX_RINGS; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const p = { x: desired.x + dx * stepX, y: desired.y + dy * stepY };
        if (fits(p)) return p;
      }
    }
  }
  return desired;
}
