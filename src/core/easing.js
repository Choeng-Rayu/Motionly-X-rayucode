import { clamp } from "./units.js";

export function ease(name, progress) {
  const t = clamp(progress);
  const easing = String(name ?? "smooth");
  if (name === "linear") return t;
  if (easing === "spring") return spring(t);
  if (easing === "soft-spring") return softSpring(t);
  if (easing === "ease-out") return easeOut(t);
  if (easing === "expo") return expoOut(t);
  if (easing.startsWith("cubic(")) return cubicBezier(easing, t);
  return smooth(t);
}

function smooth(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function expoOut(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function spring(t) {
  if (t === 0 || t === 1) return t;
  const decay = Math.exp(-7.2 * t);
  const oscillation = Math.cos(8.5 * t);
  return clamp(1 - decay * oscillation, 0, 1);
}

function softSpring(t) {
  if (t === 0 || t === 1) return t;
  return clamp(1 + 0.035 * Math.sin(Math.PI * t) - Math.pow(1 - t, 3) * 0.18, 0, 1.04);
}

function cubicBezier(name, t) {
  const values = name.match(/cubic\(([^)]+)\)/)?.[1].split(",").map((value) => Number.parseFloat(value.trim()));
  if (!values || values.length !== 4 || values.some(Number.isNaN)) return smooth(t);
  const [, y1, , y2] = values;
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * y1 + 3 * inverse * t * t * y2 + t * t * t;
}
