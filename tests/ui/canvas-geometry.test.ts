import { describe, expect, it } from 'vitest';
import { alignRect, snapRect } from '../../src/ui/canvas-geometry';

const canvas = { width: 1920, height: 1080 };

describe('canvas geometry', () => {
  it('snaps moving centers to the artboard center and returns guides', () => {
    const result = snapRect({ x: 862, y: 489, width: 200, height: 100 }, [], canvas, 5);
    expect(result.rect).toEqual({ x: 860, y: 490, width: 200, height: 100 });
    expect(result.guides).toEqual({ vertical: 960, horizontal: 540 });
  });

  it('snaps any moving edge or center to any target edge or center', () => {
    const target = { x: 400, y: 300, width: 200, height: 100 };
    const result = snapRect({ x: 597, y: 197, width: 100, height: 100 }, [target], canvas, 5);
    expect(result.rect.x).toBe(600); // moving left to target right
    expect(result.rect.y).toBe(200); // moving bottom to target top
    expect(result.guides).toEqual({ vertical: 600, horizontal: 300 });
  });

  it('does not snap beyond the threshold', () => {
    const result = snapRect({ x: 850, y: 470, width: 200, height: 100 }, [], canvas, 5);
    expect(result.rect).toEqual({ x: 850, y: 470, width: 200, height: 100 });
    expect(result.guides).toEqual({ vertical: null, horizontal: null });
  });

  it('implements all six artboard alignment commands', () => {
    const rect = { x: 130, y: 140, width: 200, height: 100 };
    expect(alignRect(rect, canvas, 'left').x).toBe(0);
    expect(alignRect(rect, canvas, 'center-x').x).toBe(860);
    expect(alignRect(rect, canvas, 'right').x).toBe(1720);
    expect(alignRect(rect, canvas, 'top').y).toBe(0);
    expect(alignRect(rect, canvas, 'center-y').y).toBe(490);
    expect(alignRect(rect, canvas, 'bottom').y).toBe(980);
  });
});
