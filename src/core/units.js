export function parseTime(value) {
  const text = String(value).trim();
  if (text.endsWith("ms")) return Number.parseFloat(text) / 1000;
  if (text.endsWith("s")) return Number.parseFloat(text);
  return Number.parseFloat(text);
}

export function parseSize(value) {
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
  if (!match) throw new Error(`Invalid size "${value}"`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

export function parseScalar(value) {
  if (typeof value === "number") return value;
  const text = String(value).trim();
  if (text === "true") return true;
  if (text === "false") return false;
  const numeric = Number(text);
  return Number.isNaN(numeric) ? text : numeric;
}

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

