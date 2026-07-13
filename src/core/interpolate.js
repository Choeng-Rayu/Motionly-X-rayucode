import { parseColor } from "./color.js";

export function interpolateValue(from, to, progress) {
  if (typeof from === "number" && typeof to === "number") {
    return from + (to - from) * progress;
  }

  if (isColor(from) && isColor(to)) {
    return interpolateColor(from, to, progress);
  }

  return progress < 1 ? from : to;
}

function isColor(value) {
  return typeof value === "string" && (value.startsWith("#") || value.startsWith("rgb"));
}

function interpolateColor(from, to, progress) {
  const a = colorToRgb(from);
  const b = colorToRgb(to);
  if (!a || !b) return progress < 1 ? parseColor(from) : parseColor(to);
  const r = Math.round(a.r + (b.r - a.r) * progress);
  const g = Math.round(a.g + (b.g - a.g) * progress);
  const bl = Math.round(a.b + (b.b - a.b) * progress);
  const alpha = a.a + (b.a - a.a) * progress;
  return `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(3)})`;
}

function colorToRgb(value) {
  const text = String(value).trim();
  if (text.startsWith("#")) {
    const hex = text.slice(1);
    if (hex.length === 3) {
      return {
        r: Number.parseInt(hex[0] + hex[0], 16),
        g: Number.parseInt(hex[1] + hex[1], 16),
        b: Number.parseInt(hex[2] + hex[2], 16),
        a: 1
      };
    }
    if (hex.length === 6) {
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
        a: 1
      };
    }
  }

  const rgba = text.match(/^rgba?\(([^)]+)\)$/);
  if (!rgba) return null;
  const values = rgba[1].split(",").map((part) => Number.parseFloat(part.trim()));
  return { r: values[0], g: values[1], b: values[2], a: values[3] ?? 1 };
}

