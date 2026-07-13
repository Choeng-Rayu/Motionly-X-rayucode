import assert from "node:assert/strict";
import { parseMotion } from "../src/language/parser.js";
import { buildSceneGraph } from "../src/scene/scene-graph.js";
import { evaluateScene } from "../src/animation/evaluator.js";
import { GifEncoder } from "../src/export/gif-encoder.js";

const source = `
canvas {
  size 1920x1080
  fps 60
  duration 5s
  background #fff
}

import "logo.svg" as logo

logo {
  center
  width 240
  opacity 0
}

text title {
  value "Built with Codex"
  center
  y 120
  size 72
  opacity 0
}

animate logo {
  from {
    opacity 0
    y 40
    scale .9
  }

  to {
    opacity 1
    y 0
    scale 1
  }

  duration 800ms
  easing spring
}
`;

await test("parser builds a compact AST", () => {
  const ast = parseMotion(source);
  assert.equal(ast.type, "Program");
  assert.equal(ast.body.length, 5);
  assert.equal(ast.body[1].type, "Import");
  assert.equal(ast.body[2].type, "Element");
  assert.equal(ast.body[4].type, "Animation");
});

await test("scene graph normalizes canvas, imports, elements, and animation timing", () => {
  const scene = buildSceneGraph(parseMotion(source));
  assert.deepEqual(scene.canvas, {
    width: 1920,
    height: 1080,
    fps: 60,
    duration: 5,
    background: "#fff"
  });
  assert.equal(scene.imports[0].type, "svg");
  assert.equal(scene.elements[0].properties.width, 240);
  assert.equal(scene.elements[1].kind, "text");
  assert.equal(scene.animations[0].duration, 0.8);
});

await test("animation evaluation is deterministic and does not mutate base properties", () => {
  const scene = buildSceneGraph(parseMotion(source));
  const before = evaluateScene(scene, 0).elements.find((element) => element.id === "logo").render;
  const after = evaluateScene(scene, 1).elements.find((element) => element.id === "logo").render;

  assert.equal(before.opacity, 0);
  assert.equal(before.y, 40);
  assert.equal(after.opacity, 1);
  assert.equal(after.y, 0);
  assert.equal(scene.elements[0].properties.opacity, 0);
  assert.equal(scene.elements[0].properties.y, 0);
});

await test("delayed animations do not override state before they start", () => {
  const scene = buildSceneGraph(parseMotion(`
    canvas {
      size 100x100
      duration 3s
    }

    overlay fade {
      opacity .5
      fill #000
    }

    animate fade {
      from {
        opacity 0
      }

      to {
        opacity 1
      }

      delay 2s
      duration 1s
      easing linear
    }
  `));

  const beforeDelay = evaluateScene(scene, 1).elements[0].render;
  const atEnd = evaluateScene(scene, 3).elements[0].render;
  assert.equal(beforeDelay.opacity, 0.5);
  assert.equal(atEnd.opacity, 1);
});

await test("keyframes interpolate between neighboring frames", () => {
  const scene = buildSceneGraph(parseMotion(`
    canvas {
      size 100x100
      duration 2s
    }

    overlay fade {
      opacity 0
      fill #000
    }

    animate fade {
      keyframes {
        0% {
          opacity 0
        }

        50% {
          opacity 1
        }

        100% {
          opacity 0
        }
      }

      duration 2s
      easing linear
    }
  `));

  const midpoint = evaluateScene(scene, 1).elements[0].render;
  assert.equal(midpoint.opacity, 1);
});

await test("keyframes apply their first frame at animation start", () => {
  const scene = buildSceneGraph(parseMotion(`
    canvas {
      size 100x100
      duration 1s
    }

    overlay fade {
      opacity .5
      fill #000
    }

    animate fade {
      keyframes {
        0% { opacity 0 }
        100% { opacity 1 }
      }
      duration 1s
      easing linear
    }
  `));

  assert.equal(evaluateScene(scene, 0).elements[0].render.opacity, 0);
});

await test("parser supports compact keyframe property rows", () => {
  const scene = buildSceneGraph(parseMotion(`
    canvas {
      size 100x100
      duration 1s
    }

    overlay fade {
      opacity 0
      fill #000
    }

    animate fade {
      keyframes {
        0% { opacity 0 scale .9 brightness .5 }
        100% { opacity 1 scale 1 brightness 1 }
      }
      duration 1s
      easing linear
    }
  `));

  const first = scene.animations[0].keyframes[0].properties;
  assert.deepEqual(first, { opacity: 0, scale: 0.9, brightness: 0.5 });
});

await test("camera, layers, and sequences are normalized into the scene graph", () => {
  const scene = buildSceneGraph(parseMotion(`
    canvas {
      size 100x100
      duration 4s
    }

    camera {
      zoom 1.1
      x 20
    }

    import "logo.svg" as logo

    sequence intro {
      delay 1s
      gap 500ms
      items logo title
    }

    text title {
      value "Title"
      layer text
    }

    logo {
      width 20
      layer hero
    }

    animate logo {
      sequence intro
      from { opacity 0 }
      to { opacity 1 }
      duration 1s
    }

    animate title {
      sequence intro
      from { opacity 0 }
      to { opacity 1 }
      duration 1s
    }

    animate camera {
      from { zoom 1.1 x 20 }
      to { zoom 1.2 x 0 }
      duration 2s
      easing ease-out
    }
  `));

  assert.equal(scene.camera.zoom, 1.1);
  assert.equal(scene.elements[0].id, "logo");
  assert.equal(scene.elements[1].id, "title");
  assert.equal(scene.animations.find((item) => item.target === "logo").delay, 1);
  assert.equal(scene.animations.find((item) => item.target === "title").delay, 1.5);
  assert.equal(evaluateScene(scene, 2).camera.zoom, 1.2);
});

await test("animation presets compile into generated deterministic scene instructions", () => {
  const scene = buildSceneGraph(parseMotion(`
    canvas {
      size 100x100
      duration 5s
    }

    camera {
      cameraAnimation slowPush(from 1 to 1.05 duration 5s ease smooth)
    }

    import "bg.jpg" as bg

    bg {
      cover
      layer background
      backgroundEffect gradientMotion(duration 4s opacity .2)
    }

    text title {
      value "Hi"
      center
      y 10
      opacity 1
      textAnimation splitReveal(split chars stagger 50ms duration 1s delay 500ms ease power3.out exitAt 3s)
    }
  `));

  assert.equal(scene.elements.some((element) => element.kind === "effect" && element.properties.opacity === 0.2), true);
  assert.equal(scene.elements.filter((element) => element.generated && element.id.startsWith("title__chars")).length, 2);
  assert.equal(scene.animations.some((animation) => animation.target === "camera"), true);
  assert.equal(evaluateScene(scene, 4).elements.filter((element) => element.id.startsWith("title__chars") && element.render.opacity > 0).length, 0);
});

await test("keynoteText preset and cover overscan normalize cleanly", () => {
  const scene = buildSceneGraph(parseMotion(`
    canvas {
      size 100x100
      duration 2s
    }

    import "bg.jpg" as bg

    bg {
      cover
      overscan 1.35
    }

    text title {
      value "Hello world"
      center
      opacity 1
      textAnimation keynoteText(split words stagger 100ms duration 1s)
    }
  `));

  assert.equal(scene.elements.find((element) => element.id === "bg").properties.overscan, 1.35);
  const words = scene.elements.filter((element) => element.id.startsWith("title__words"));
  assert.equal(words.length, 2);
  assert.equal(words[0].properties.textGroup, "title");
  assert.equal(words[0].properties.textSplit, "words");
});

await test("gif encoder produces a GIF89a blob", async () => {
  const encoder = new GifEncoder(2, 2, 100);
  encoder.addFrame({
    data: new Uint8ClampedArray([
      0, 0, 0, 255,
      255, 255, 255, 255,
      255, 0, 0, 255,
      0, 0, 255, 255
    ])
  });
  const blob = encoder.finish();
  const header = Buffer.from(await blob.slice(0, 6).arrayBuffer()).toString("ascii");
  assert.equal(blob.type, "image/gif");
  assert.equal(header, "GIF89a");
});

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}
