export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Alignment = 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom';

export interface SnapGuides {
  vertical: number | null;
  horizontal: number | null;
}

export interface SnapResult {
  rect: CanvasRect;
  guides: SnapGuides;
}

function axisPoints(start: number, size: number): [number, number, number] {
  return [start, start + size / 2, start + size];
}

function bestAxisSnap(
  moving: [number, number, number],
  targets: number[],
  threshold: number
): { delta: number; guide: number } | null {
  let best: { delta: number; guide: number } | null = null;
  for (const source of moving) {
    for (const target of targets) {
      const delta = target - source;
      if (Math.abs(delta) > threshold) continue;
      if (!best || Math.abs(delta) < Math.abs(best.delta)) best = { delta, guide: target };
    }
  }
  return best;
}

/** Motionity-style snapping: compare each moving left/center/right and top/center/bottom. */
export function snapRect(
  moving: CanvasRect,
  others: CanvasRect[],
  canvas: { width: number; height: number },
  threshold: number
): SnapResult {
  const xTargets = [0, canvas.width / 2, canvas.width];
  const yTargets = [0, canvas.height / 2, canvas.height];
  for (const rect of others) {
    xTargets.push(...axisPoints(rect.x, rect.width));
    yTargets.push(...axisPoints(rect.y, rect.height));
  }

  const xSnap = bestAxisSnap(axisPoints(moving.x, moving.width), xTargets, threshold);
  const ySnap = bestAxisSnap(axisPoints(moving.y, moving.height), yTargets, threshold);
  return {
    rect: {
      ...moving,
      x: moving.x + (xSnap?.delta ?? 0),
      y: moving.y + (ySnap?.delta ?? 0),
    },
    guides: {
      vertical: xSnap?.guide ?? null,
      horizontal: ySnap?.guide ?? null,
    },
  };
}

/** Align one bounds rectangle to an artboard edge or center. */
export function alignRect(
  rect: CanvasRect,
  canvas: { width: number; height: number },
  alignment: Alignment
): CanvasRect {
  if (alignment === 'left') return { ...rect, x: 0 };
  if (alignment === 'center-x') return { ...rect, x: (canvas.width - rect.width) / 2 };
  if (alignment === 'right') return { ...rect, x: canvas.width - rect.width };
  if (alignment === 'top') return { ...rect, y: 0 };
  if (alignment === 'center-y') return { ...rect, y: (canvas.height - rect.height) / 2 };
  return { ...rect, y: canvas.height - rect.height };
}
