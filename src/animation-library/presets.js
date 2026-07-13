import { parsePresetCall } from "./preset-parser.js";

const TEXT_PRESETS = new Set([
  "splitReveal",
  "blurReveal",
  "fadeUp",
  "slideIn",
  "scaleText",
  "typewriter",
  "maskReveal",
  "charReveal",
  "wordReveal",
  "gradientReveal",
  "keynoteText"
]);

const OBJECT_PRESETS = new Set([
  "heroLogo",
  "productPanel",
  "sceneExit",
  "springIn",
  "bounceIn",
  "float",
  "pulse",
  "drawSVG",
  "scaleReveal",
  "morph",
  "rotateReveal",
  "productReveal",
  "appleHero",
  "startupLaunch"
]);

export function applyAnimationPresets(scene) {
  const generatedElements = [];
  const generatedAnimations = [];
  const sourceElements = [];

  for (const element of scene.elements) {
    const textPreset = element.properties.textAnimation ?? element.properties.animation;
    if (element.kind === "text" && textPreset && isTextPreset(textPreset)) {
      const generated = expandTextPreset(element, textPreset);
      sourceElements.push(hideElement(element));
      generatedElements.push(...generated.elements);
      generatedAnimations.push(...generated.animations);
      continue;
    }

    sourceElements.push(element);
    if (element.properties.backgroundEffect) {
      const generated = backgroundEffect(element);
      generatedElements.push(...generated.elements);
      generatedAnimations.push(...generated.animations);
    }
    if (element.properties.animation && isObjectPreset(element.properties.animation)) {
      generatedAnimations.push(...objectPresetAnimations(element));
    }
  }

  return {
    ...scene,
    elements: [...sourceElements, ...generatedElements],
    animations: [...generatedAnimations, ...scene.animations]
  };
}

export function cameraPresetAnimations(value) {
  const { name, options } = parsePresetCall(value);
  const delay = options.delay ?? 0;
  const duration = options.duration ?? 5;
  const easing = options.ease ?? "smooth";

  if (name === "slowPush" || name === "push" || name === "productReveal" || name === "appleHero") {
    return [{
      target: "camera",
      from: { zoom: options.from ?? 1, x: options.xFrom ?? 0, y: options.yFrom ?? 0, rotation: 0 },
      to: { zoom: options.to ?? 1.05, x: options.xTo ?? 0, y: options.yTo ?? -10, rotation: 0 },
      keyframes: [],
      delay,
      duration,
      easing
    }];
  }

  if (name === "pan") {
    return [{
      target: "camera",
      from: { x: options.from ?? -80, y: 0 },
      to: { x: options.to ?? 80, y: 0 },
      keyframes: [],
      delay,
      duration,
      easing
    }];
  }

  if (name === "pull") {
    return [{
      target: "camera",
      from: { zoom: options.from ?? 1.06 },
      to: { zoom: options.to ?? 1 },
      keyframes: [],
      delay,
      duration,
      easing
    }];
  }

  return [];
}

function isTextPreset(value) {
  return TEXT_PRESETS.has(parsePresetCall(value).name);
}

function isObjectPreset(value) {
  return OBJECT_PRESETS.has(parsePresetCall(value).name);
}

function hideElement(element) {
  return {
    ...element,
    properties: { ...element.properties, opacity: 0 }
  };
}

function expandTextPreset(element, value) {
  const { name, options } = parsePresetCall(value);
  const split = options.split ?? defaultSplitFor(name);
  const parts = splitText(String(element.properties.value ?? ""), split);
  const stagger = options.stagger ?? (split === "chars" ? 0.035 : 0.09);
  const delay = options.delay ?? 0;
  const duration = options.duration ?? 1.2;
  const easing = normalizeEase(options.ease ?? "power3.out");
  const metrics = layoutParts(parts, element.properties, split);

  const elements = metrics.map((part, index) => ({
    ...element,
    id: `${element.id}__${split}_${index}`,
    generated: true,
    properties: {
      ...element.properties,
      value: part.value,
      x: element.properties.x + part.x,
      textGroup: element.id,
      textSplit: split,
      y: element.properties.y,
      center: true,
      opacity: 0,
      blur: presetBlurFrom(name),
      scale: name === "scaleText" ? 0.94 : element.properties.scale,
      tracking: 0
    }
  }));

  const animations = elements.map((part, index) => ({
    target: part.id,
    from: textPresetFrom(name, part.properties),
    to: textPresetTo(name, part.properties),
    keyframes: [],
    delay: delay + index * stagger,
    duration,
    easing
  }));

  if (options.exitAt != null) {
    animations.push(...elements.map((part, index) => ({
      target: part.id,
      from: textPresetTo(name, part.properties),
      to: { opacity: 0, y: part.properties.y - 30, blur: name === "blurReveal" ? 6 : 0 },
      keyframes: [],
      delay: options.exitAt + index * Math.min(stagger, 0.018),
      duration: options.exitDuration ?? 0.9,
      easing: "ease-out"
    })));
  }

  return { elements, animations };
}

function objectPresetAnimations(element) {
  const target = element.id;
  const props = element.properties;
  const { name, options } = parsePresetCall(props.animation);
  const delay = options.delay ?? 0;
  const duration = options.duration ?? (name === "float" ? 4 : 1.2);
  const easing = normalizeEase(options.ease ?? (name === "springIn" || name === "bounceIn" ? "spring" : "ease-out"));

  if (name === "heroLogo") {
    return [basicAnimation(
      target,
      delay,
      duration,
      options.ease ?? "soft-spring",
      {
        opacity: 0,
        scale: options.from ?? 0.82,
        y: options.yFrom ?? props.y + 34,
        rotation: options.rotationFrom ?? -1.5
      },
      {
        opacity: 1,
        scale: options.to ?? props.scale,
        y: options.yTo ?? props.y,
        rotation: props.rotation
      }
    )];
  }

  if (name === "productPanel") {
    return [basicAnimation(
      target,
      delay,
      duration,
      options.ease ?? "ease-out",
      {
        opacity: 0,
        scale: options.from ?? 0.965,
        x: options.xFrom ?? props.x,
        y: options.yFrom ?? props.y + 34
      },
      {
        opacity: props.opacity || 1,
        scale: options.to ?? props.scale,
        x: props.x,
        y: props.y
      }
    )];
  }

  if (name === "sceneExit") {
    return [basicAnimation(
      target,
      delay,
      duration,
      options.ease ?? "ease-out",
      {
        opacity: props.opacity || 1,
        scale: props.scale,
        x: props.x,
        y: props.y
      },
      {
        opacity: 0,
        scale: options.to ?? 0.98,
        x: options.xTo ?? props.x,
        y: options.yTo ?? props.y - 28
      }
    )];
  }

  if (name === "float") {
    return [{
      target,
      from: {},
      to: {},
      keyframes: [
        { offset: 0, properties: { y: options.y ?? 0 } },
        { offset: 0.5, properties: { y: options.yTo ?? -14 } },
        { offset: 1, properties: { y: options.y ?? 0 } }
      ],
      delay,
      duration,
      easing: "smooth"
    }];
  }

  if (name === "pulse") {
    return [{
      target,
      from: {},
      to: {},
      keyframes: [
        { offset: 0, properties: { scale: 1 } },
        { offset: 0.5, properties: { scale: options.to ?? 1.035 } },
        { offset: 1, properties: { scale: 1 } }
      ],
      delay,
      duration,
      easing: "smooth"
    }];
  }

  if (name === "rotateReveal") {
    return [basicAnimation(target, delay, duration, easing, { opacity: 0, scale: 0.94, rotation: props.rotation - 4 }, { opacity: 1, scale: props.scale, rotation: props.rotation })];
  }

  if (name === "drawSVG") {
    return [basicAnimation(target, delay, duration, easing, { opacity: 0, scale: 0.98, brightness: 1.35 }, { opacity: 1, scale: props.scale, brightness: 1 })];
  }

  return [basicAnimation(
    target,
    delay,
    duration,
    easing,
    { opacity: 0, scale: options.from ?? 0.8, y: options.yFrom ?? props.y + 36 },
    { opacity: 1, scale: options.to ?? props.scale, y: options.yTo ?? props.y }
  )];
}

function backgroundEffect(element) {
  const { name, options } = parsePresetCall(element.properties.backgroundEffect);
  const duration = options.duration ?? 12;
  const opacity = options.opacity ?? (name === "noise" ? 0.035 : 0.2);
  const effect = {
    ...element,
    id: `${element.id}__${name}`,
    kind: "effect",
    generated: true,
    assetName: null,
    asset: null,
    properties: {
      ...element.properties,
      layer: "background",
      effect: name,
      opacity,
      offset: 0,
      intensity: options.intensity ?? 1
    }
  };

  return {
    elements: [effect],
    animations: [{
      target: effect.id,
      from: { offset: 0 },
      to: { offset: 1 },
      keyframes: [],
      delay: options.delay ?? 0,
      duration,
      easing: "linear"
    }]
  };
}

function basicAnimation(target, delay, duration, easing, from, to) {
  return { target, from, to, keyframes: [], delay, duration, easing };
}

function splitText(text, split) {
  if (split === "words") {
    return text.trim().split(/\s+/).filter((part) => part.length > 0);
  }
  return Array.from(text);
}

function layoutParts(parts, props, split) {
  if (split === "words") {
    const approx = parts.map((part) => part.length * props.size * 0.52);
    const space = props.size * 0.34;
    const total = approx.reduce((sum, width) => sum + width, 0) + space * (parts.length - 1);
    let cursor = -total / 2;
    return parts.map((value, index) => {
      const x = cursor + approx[index] / 2;
      cursor += approx[index] + space;
      return { value, x };
    });
  }

  const widths = parts.map((part) => partWidth(part, props, split));
  const total = widths.reduce((sum, width) => sum + width, 0);
  let cursor = -total / 2;
  return parts.map((value, index) => {
    const width = widths[index];
    const x = cursor + width / 2;
    cursor += width;
    return { value, x };
  });
}

function partWidth(part, props, split) {
  if (split === "words") return part.length * props.size * 0.52 + props.size * 0.34;
  return props.size * 0.54 + (props.tracking ?? 0);
}

function defaultSplitFor(name) {
  if (name === "keynoteText") return "words";
  if (name === "wordReveal" || name === "blurReveal") return "words";
  return "chars";
}

function presetBlurFrom(name) {
  if (name === "keynoteText") return 0;
  return name === "blurReveal" || name === "gradientReveal" ? 10 : 0;
}

function textPresetFrom(name, props) {
  if (name === "keynoteText") return { opacity: 0, y: props.y + 26, scale: 0.99 };
  if (name === "scaleText") return { opacity: 0, scale: 0.92, y: props.y + 8 };
  if (name === "slideIn") return { opacity: 1, x: props.x - 36 };
  if (name === "maskReveal") return { opacity: 0, y: props.y + 24 };
  return { opacity: 0, y: props.y + 38, blur: presetBlurFrom(name) };
}

function textPresetTo(name, props) {
  if (name === "slideIn") return { opacity: props.opacity || 1, x: props.x };
  return { opacity: props.opacity || 1, y: props.y, blur: 0, scale: props.scale || 1 };
}

function normalizeEase(ease) {
  if (ease === "power3.out") return "ease-out";
  if (ease === "power4.out") return "expo";
  return ease;
}
