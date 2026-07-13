import { ease } from "../core/easing.js";
import { interpolateValue } from "../core/interpolate.js";
import { clamp } from "../core/units.js";

export function evaluateScene(scene, time) {
  const camera = evaluateCamera(scene, time);
  const elements = scene.elements.map((element) => ({
    ...element,
    render: evaluateElement(element, scene.animations, time)
  }));

  return { canvas: scene.canvas, camera, elements };
}

function evaluateCamera(scene, time) {
  const cameraElement = { id: "camera", properties: scene.camera ?? { x: 0, y: 0, zoom: 1, rotation: 0 } };
  return evaluateElement(cameraElement, scene.animations, time);
}

function evaluateElement(element, animations, time) {
  let state = { ...element.properties };

  for (const animation of animations.filter((item) => item.target === element.id)) {
    state = applyAnimation(state, animation, time);
  }

  return state;
}

function applyAnimation(state, animation, time) {
  const localTime = time - animation.delay;

  if (localTime < 0) return state;

  const rawProgress = clamp(localTime / animation.duration);

  if (animation.keyframes.length > 0) {
    return applyKeyframes(state, animation.keyframes, rawProgress, animation.easing);
  }

  if (localTime === 0) return { ...state, ...animation.from };

  const progress = ease(animation.easing, rawProgress);
  const next = { ...state };
  const keys = new Set([...Object.keys(animation.from), ...Object.keys(animation.to)]);
  for (const key of keys) {
    const from = animation.from[key] ?? state[key];
    const to = animation.to[key] ?? state[key];
    next[key] = interpolateValue(from, to, progress);
  }
  return next;
}

function applyKeyframes(state, keyframes, progress, easing) {
  if (keyframes.length === 0) return state;
  if (progress <= keyframes[0].offset) return { ...state, ...keyframes[0].properties };
  if (progress >= keyframes[keyframes.length - 1].offset) {
    return { ...state, ...keyframes[keyframes.length - 1].properties };
  }

  const next = { ...state };
  let left = keyframes[0];
  let right = keyframes[keyframes.length - 1];

  for (let index = 0; index < keyframes.length - 1; index += 1) {
    if (progress >= keyframes[index].offset && progress <= keyframes[index + 1].offset) {
      left = keyframes[index];
      right = keyframes[index + 1];
      break;
    }
  }

  const span = right.offset - left.offset || 1;
  const local = ease(easing, (progress - left.offset) / span);
  const keys = new Set([...Object.keys(left.properties), ...Object.keys(right.properties)]);

  for (const key of keys) {
    const from = left.properties[key] ?? state[key];
    const to = right.properties[key] ?? state[key];
    next[key] = interpolateValue(from, to, local);
  }

  return next;
}
