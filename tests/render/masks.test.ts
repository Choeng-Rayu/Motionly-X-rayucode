import { describe, expect, it } from 'vitest';
import { evaluateScene } from '../../src/animation/evaluator';
import { parseMotion } from '../../src/language/parser';
import { serializeProgram } from '../../src/language/serializer';
import { hiddenMaskSourceIds } from '../../src/render/canvas-renderer';
import { buildSceneGraph } from '../../src/scene/scene-graph';

describe('reusable layer masks', () => {
  it('round-trips and evaluates an alpha mask reference', () => {
    const source = `
      canvas { duration 2s }
      text matte {
        value "MASK"
        opacity 0.8
      }
      text title {
        value "REVEALED"
        mask matte
        maskInvert true
        maskVisible false
      }
    `;
    const ast = parseMotion(source);
    const serialized = serializeProgram(ast);
    expect(serialized).toContain('mask matte');
    expect(serialized).toContain('maskInvert');

    const frame = evaluateScene(buildSceneGraph(parseMotion(serialized)), 0);
    const title = frame.elements.find((element) => element.id === 'title');
    expect(title?.render).toMatchObject({ mask: 'matte', maskInvert: true, maskVisible: false });
    expect(hiddenMaskSourceIds(frame.elements)).toEqual(new Set(['matte']));
  });

  it('can keep a mask source visible as normal artwork', () => {
    const scene = buildSceneGraph(
      parseMotion(`text matte { value "M" }\ntext title { value "T" mask matte maskVisible true }`)
    );
    expect(hiddenMaskSourceIds(evaluateScene(scene, 0).elements)).toEqual(new Set());
  });

  it('rejects missing, self, and nested mask references', () => {
    expect(() => buildSceneGraph(parseMotion('text title { value "T" mask missing }'))).toThrow(
      'does not exist'
    );
    expect(() => buildSceneGraph(parseMotion('text title { value "T" mask title }'))).toThrow(
      'cannot mask itself'
    );
    expect(() =>
      buildSceneGraph(
        parseMotion(
          'text one { value "1" mask two }\ntext two { value "2" mask three }\ntext three { value "3" }'
        )
      )
    ).toThrow('Nested layer masks are not supported');
  });
});
