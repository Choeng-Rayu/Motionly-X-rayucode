# Third-Party Notices

Motionly is licensed under the Apache License 2.0. The following notice applies to third-party code, algorithms, and substantial implementation patterns adapted in this repository.

## Motionity

- Project: Motionity — web-based motion graphics editor
- Author: Alyssa X
- Source: https://github.com/alyssaxuu/motionity
- Upstream license: MIT
- Copyright: Copyright (c) 2022 Alyssa X

Motionly's non-destructive clip timing operations and editor affordances were adapted from Motionity's timeline concepts (`start`, `end`, `trimstart`, and `trimend`), while being rewritten as immutable TypeScript operations over Motionly's `.motion` AST and scene model. Motionly's serialized Canvas adjustment controls were also informed by Motionity's filter/adjustment workflow, but use native Canvas 2D filters rather than Motionity's Fabric.js filter objects. No bundled Motionity dependencies or minified vendor files are included.

Affected adaptation files:

- `src/ui/canvas-geometry.ts` and `src/ui/components/MotionEditor.svelte` — Motionity-style 3x3 edge/center snapping, six artboard alignments, visible guides, and axis-lock interaction.
- `src/ui/keyframe-editing.ts` and `src/ui/components/MotionEditor.svelte` — draggable keyframe marker, snapping, add/retime/delete, and easing workflow rewritten against Motionly AST nodes.
- `src/ui/clip-timing.ts`, `src/ui/timeline-lanes.ts`, and `src/ui/components/MotionEditor.svelte` — non-destructive source-window trim/split semantics, clip handles, trim labels, and overlap sublanes.
- `src/assets/asset-loader.ts`, `src/animation/evaluator.ts`, `src/render/canvas-renderer.ts`, and `src/export/exporter.ts` — Motionity-inspired project-time to media-source-time synchronization, rewritten for typed native video assets and deterministic Canvas rendering.
- `src/types/scene.ts`, `src/scene/properties.ts`, `src/language/parser.ts`, and `src/render/canvas-renderer.ts` — serialized adjustment-property model and renderer-native filter pipeline.
- `src/types/scene.ts`, `src/language/parser.ts`, `src/scene/scene-graph.ts`, `src/render/canvas-renderer.ts`, and `src/ui/components/MotionEditor.svelte` — reusable layer-mask references and editor workflow rewritten as validated offscreen alpha compositing.

The implementations in those files are Motionly-native rewrites; this notice is retained conservatively because their behavior and substantial patterns were informed by Motionity.

The original Motionity MIT license follows verbatim:

```text
MIT License

Copyright (c) 2022 Alyssa X

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
