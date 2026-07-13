import { normalizeCamera, normalizeCanvas, normalizeProperties, normalizeProperty, defaultElementProperties } from "./properties.js";
import { applyAnimationPresets, cameraPresetAnimations } from "../animation-library/presets.js";

const LAYER_ORDER = {
  background: 0,
  hero: 10,
  supporting: 20,
  content: 30,
  details: 40,
  text: 50,
  effects: 60
};

export function buildSceneGraph(ast) {
  const canvasNode = ast.body.find((node) => node.type === "Canvas");
  const cameraNode = ast.body.find((node) => node.type === "Camera");
  const canvas = normalizeCanvas(canvasNode?.properties ?? {});
  const camera = normalizeCamera(cameraNode?.properties ?? {});
  const sequences = buildSequences(ast);
  const imports = new Map();
  const elements = [];
  const animations = [];

  for (const node of ast.body) {
    if (node.type === "Import") {
      imports.set(node.name, { name: node.name, path: node.path, type: assetType(node.path) });
    }

    if (node.type === "Element") {
      const asset = node.kind === "asset" ? imports.get(node.name) : null;
      elements.push({
        id: node.name,
        kind: node.kind,
        assetName: asset ? node.name : null,
        asset,
        properties: {
          ...defaultElementProperties(node.kind),
          ...normalizeProperties(node.properties)
        }
      });
    }

    if (node.type === "Animation") {
      animations.push(normalizeAnimation(node, sequences));
    }
  }

  if (cameraNode?.properties.cameraAnimation) {
    animations.push(...cameraPresetAnimations(cameraNode.properties.cameraAnimation));
  }

  const scene = applyAnimationPresets({
    canvas,
    camera,
    sequences: Array.from(sequences.values()),
    imports: Array.from(imports.values()),
    elements,
    animations
  });
  scene.elements.sort((a, b) => layerRank(a.properties.layer) - layerRank(b.properties.layer));
  return scene;
}

function normalizeAnimation(node, sequences) {
  const sequenceDelay = sequenceOffset(node, sequences);
  return {
    target: node.target,
    from: normalizeProperties(node.from ?? {}),
    to: normalizeProperties(node.to ?? {}),
    keyframes: (node.keyframes ?? []).map((frame) => ({
      offset: frame.offset,
      properties: normalizeProperties(frame.properties)
    })),
    delay: normalizeProperty("delay", node.delay ?? 0) + sequenceDelay,
    duration: normalizeProperty("duration", node.duration ?? 1),
    easing: String(node.easing ?? "soft")
  };
}

function buildSequences(ast) {
  const sequences = new Map();
  for (const node of ast.body.filter((item) => item.type === "Sequence")) {
    const delay = normalizeProperty("delay", node.properties.delay ?? 0);
    const gap = normalizeProperty("delay", node.properties.gap ?? 0);
    const items = String(node.properties.items ?? "")
      .split(/\s+/)
      .filter(Boolean);
    sequences.set(node.name, { name: node.name, delay, gap, items });
  }
  return sequences;
}

function sequenceOffset(node, sequences) {
  if (!node.sequence) return 0;
  const sequence = sequences.get(String(node.sequence));
  if (!sequence) return 0;
  const index = sequence.items.indexOf(node.target);
  return sequence.delay + Math.max(0, index) * sequence.gap;
}

function layerRank(layer) {
  return LAYER_ORDER[layer] ?? LAYER_ORDER.content;
}

function assetType(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".svg")) return "svg";
  return "image";
}
