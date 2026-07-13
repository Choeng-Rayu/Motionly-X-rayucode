import { parseTime } from "../core/units.js";

export function parsePresetCall(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^([A-Za-z][\w-]*)(?:\((.*)\))?$/);
  if (!match) return { name: text, options: {} };

  return {
    name: match[1],
    options: parseOptions(match[2] ?? "")
  };
}

function parseOptions(source) {
  const options = {};
  const tokens = source
    .replace(/[,:]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  for (let index = 0; index < tokens.length; index += 2) {
    const key = tokens[index];
    const value = tokens[index + 1];
    if (value == null) break;
    options[key] = normalizeOption(key, value);
  }

  return options;
}

function normalizeOption(key, value) {
  if (["delay", "duration", "stagger", "exitAt", "exitDuration"].includes(key)) return parseTime(value);
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric;
}
