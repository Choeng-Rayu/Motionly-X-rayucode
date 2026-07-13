import { parseColor } from "../core/color.js";
import { parseScalar, parseSize, parseTime } from "../core/units.js";

const TIME_PROPERTIES = new Set(["duration", "delay"]);
const NUMBER_PROPERTIES = new Set([
  "x",
  "y",
  "width",
  "height",
  "scale",
  "rotation",
  "opacity",
  "blur",
  "brightness",
  "shadow",
  "size",
  "intensity",
  "offset",
  "overscan",
  "weight",
  "tracking"
  ,
  "zoom"
]);
const COLOR_PROPERTIES = new Set(["background", "color", "fill", "stroke"]);

export function normalizeCanvas(properties) {
  const size = properties.size ? parseSize(properties.size) : { width: 1920, height: 1080 };
  return {
    width: size.width,
    height: size.height,
    fps: Number(properties.fps ?? 60),
    duration: properties.duration ? parseTime(properties.duration) : 5,
    background: properties.background ? parseColor(properties.background) : "#000"
  };
}

export function normalizeCamera(properties = {}) {
  return {
    x: Number.parseFloat(properties.x ?? 0),
    y: Number.parseFloat(properties.y ?? 0),
    zoom: Number.parseFloat(properties.zoom ?? 1),
    rotation: Number.parseFloat(properties.rotation ?? 0)
  };
}

export function normalizeProperties(properties) {
  const normalized = {};
  for (const [key, value] of Object.entries(properties)) {
    normalized[key] = normalizeProperty(key, value);
  }
  return normalized;
}

export function normalizeProperty(key, value) {
  if (TIME_PROPERTIES.has(key)) return parseTime(value);
  if (NUMBER_PROPERTIES.has(key)) return Number.parseFloat(value);
  if (COLOR_PROPERTIES.has(key)) return parseColor(value);
  return parseScalar(value);
}

export function defaultElementProperties(kind) {
  const common = {
    x: 0,
    y: 0,
    width: null,
    height: null,
    scale: 1,
    rotation: 0,
    opacity: 1,
    blur: 0,
    brightness: 1,
    shadow: 0,
    layer: "content",
    center: false,
    cover: false
  };

  if (kind === "text") {
    return {
      ...common,
      value: "",
      font: "Inter, SF Pro Display, Segoe UI, Arial, sans-serif",
      size: 64,
      weight: 600,
      color: "#fff",
      tracking: 0
    };
  }

  if (kind === "overlay") {
    return {
      ...common,
      fill: "#000",
      opacity: 0,
      layer: "effects"
    };
  }

  if (kind === "effect") {
    return {
      ...common,
      effect: "gradientMotion",
      opacity: 0,
      offset: 0,
      intensity: 1,
      layer: "background"
    };
  }

  return common;
}
