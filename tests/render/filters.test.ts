import { describe, expect, it } from 'vitest';
import { evaluateScene } from '../../src/animation/evaluator';
import { parseMotion } from '../../src/language/parser';
import { buildCanvasFilter } from '../../src/render/canvas-renderer';
import { buildSceneGraph } from '../../src/scene/scene-graph';

describe('element adjustment filters', () => {
  it('parses, normalizes, and animates adjustment properties', () => {
    const scene = buildSceneGraph(
      parseMotion(`
        canvas {
          duration 2s
        }
        text title {
          value "Filtered"
          contrast 1.2
          saturation 0.8
          hue 20
          grayscale 0.1
          sepia 0.2
          invert 0.05
        }
        animate title {
          from {
            blur 0
            brightness 1
            contrast 1
          }
          to {
            blur 10
            brightness 2
            contrast 2
          }
          duration 2s
          easing linear
        }
      `)
    );

    const base = scene.elements[0]!.properties;
    expect(base).toMatchObject({
      brightness: 1,
      contrast: 1.2,
      saturation: 0.8,
      hue: 20,
      grayscale: 0.1,
      sepia: 0.2,
      invert: 0.05,
    });
    expect(evaluateScene(scene, 1).elements[0]!.render).toMatchObject({
      blur: 5,
      brightness: 1.5,
      contrast: 1.5,
    });
  });

  it('uses neutral defaults', () => {
    const scene = buildSceneGraph(parseMotion('text title {\n  value "Plain"\n}'));
    expect(scene.elements[0]!.properties).toMatchObject({
      blur: 0,
      brightness: 1,
      contrast: 1,
      saturation: 1,
      hue: 0,
      grayscale: 0,
      sepia: 0,
      invert: 0,
    });
    expect(
      buildCanvasFilter(scene.elements[0]!.properties as unknown as Record<string, unknown>)
    ).toBe('none');
  });

  it('builds filters in a stable order and clamps unsafe values', () => {
    expect(
      buildCanvasFilter({
        blur: -4,
        brightness: 1.25,
        contrast: 1.5,
        saturation: 0,
        hue: 45,
        grayscale: 2,
        sepia: 0.4,
        invert: -1,
      })
    ).toBe('brightness(1.25) contrast(1.5) saturate(0) hue-rotate(45deg) grayscale(1) sepia(0.4)');
  });

  it('ignores non-finite values instead of emitting invalid Canvas filters', () => {
    expect(buildCanvasFilter({ blur: Number.NaN, brightness: Number.POSITIVE_INFINITY })).toBe(
      'none'
    );
  });
});
