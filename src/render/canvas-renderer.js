export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
  }

  resize(width, height) {
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  render(frame, assets = new Map()) {
    const { canvas, camera, elements } = frame;
    this.resize(canvas.width, canvas.height);
    const ctx = this.context;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.filter = "none";
    ctx.fillStyle = canvas.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    applyCamera(ctx, canvas, camera);
    for (const element of layoutGeneratedText(elements)) {
      if (element.properties.layer !== "effects") drawElement(ctx, canvas, element, assets);
    }
    ctx.restore();

    for (const element of layoutGeneratedText(elements)) {
      if (element.properties.layer === "effects") drawElement(ctx, canvas, element, assets);
    }

    ctx.restore();
  }
}

function layoutGeneratedText(elements) {
  const groups = new Map();
  const output = [];

  for (const element of elements) {
    const group = element.properties.textGroup;
    if (!group || element.properties.textSplit !== "words") {
      output.push(element);
      continue;
    }
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(element);
  }

  for (const group of groups.values()) {
    output.push(...layoutWordGroup(group));
  }

  return output;
}

function layoutWordGroup(group) {
  if (group.length === 0) return group;
  const ctx = layoutContext();
  const first = group[0].render;
  ctx.font = `${first.weight} ${first.size}px ${first.font}`;
  const widths = group.map((element) => ctx.measureText(element.render.value).width);
  const space = ctx.measureText(" ").width;
  const total = widths.reduce((sum, width) => sum + width, 0) + space * (group.length - 1);
  let cursor = -total / 2;

  return group.map((element, index) => {
    const width = widths[index];
    const finalX = cursor + width / 2;
    cursor += width + space;

    const baseX = element.properties.x;
    const renderX = element.render.x;
    const drift = typeof renderX === "number" && typeof baseX === "number" ? renderX - baseX : 0;
    return {
      ...element,
      render: {
        ...element.render,
        x: finalX + drift
      }
    };
  });
}

let textMeasureCanvas;

function layoutContext() {
  if (typeof document === "undefined") return fallbackMeasureContext;
  if (!textMeasureCanvas) textMeasureCanvas = document.createElement("canvas");
  return textMeasureCanvas.getContext("2d");
}

const fallbackMeasureContext = {
  font: "",
  measureText(text) {
    const size = Number.parseFloat(this.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "16");
    return { width: String(text).length * size * 0.52 };
  }
};

function applyCamera(ctx, canvas, camera = {}) {
  const zoom = camera.zoom ?? 1;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(zoom, zoom);
  ctx.rotate(((camera.rotation ?? 0) * Math.PI) / 180);
  ctx.translate(-(canvas.width / 2) - (camera.x ?? 0), -(canvas.height / 2) - (camera.y ?? 0));
}

function drawElement(ctx, canvas, element, assets) {
  const props = element.render;
  if (props.opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = props.opacity;
  const filter = buildFilter(props);
  if (filter !== "none") ctx.filter = filter;

  if (element.kind === "text") drawText(ctx, canvas, props);
  else if (element.kind === "overlay") drawOverlay(ctx, canvas, props);
  else if (element.kind === "effect") drawEffect(ctx, canvas, props);
  else drawAsset(ctx, canvas, element, props, assets);

  ctx.restore();
}

function drawAsset(ctx, canvas, element, props, assets) {
  const asset = assets.get(element.assetName);
  if (!asset) return;

  const box = resolveBox(canvas, asset, props);
  drawShadow(ctx, props);

  ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
  ctx.rotate((props.rotation * Math.PI) / 180);
  ctx.scale(props.scale, props.scale);
  ctx.drawImage(asset.image, -box.width / 2, -box.height / 2, box.width, box.height);
}

function drawText(ctx, canvas, props) {
  drawShadow(ctx, props);
  ctx.fillStyle = props.color;
  ctx.font = `${props.weight} ${props.size}px ${props.font}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  const x = props.center ? canvas.width / 2 + props.x : props.x;
  const y = props.center ? canvas.height / 2 + props.y : props.y;

  ctx.translate(x, y);
  ctx.rotate((props.rotation * Math.PI) / 180);
  ctx.scale(props.scale, props.scale);
  drawTrackedText(ctx, props.value, 0, 0, props.tracking);
}

function drawTrackedText(ctx, text, x, y, tracking) {
  if (!tracking) {
    ctx.fillText(text, x, y);
    return;
  }

  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + tracking * (chars.length - 1);
  let cursor = x - total / 2;
  ctx.textAlign = "left";

  for (let index = 0; index < chars.length; index += 1) {
    ctx.fillText(chars[index], cursor, y);
    cursor += widths[index] + tracking;
  }
}

function drawOverlay(ctx, canvas, props) {
  ctx.fillStyle = props.fill;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawEffect(ctx, canvas, props) {
  if (props.effect === "noise") {
    drawNoise(ctx, canvas, props);
    return;
  }

  if (props.effect === "grid" || props.effect === "mesh") {
    drawGrid(ctx, canvas, props);
    return;
  }

  drawGradientMotion(ctx, canvas, props);
}

function drawGradientMotion(ctx, canvas, props) {
  const offset = props.offset ?? 0;
  const x = canvas.width * (0.18 + 0.68 * offset);
  const y = canvas.height * (0.32 + 0.2 * Math.sin(offset * Math.PI * 2));
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, canvas.width * 0.62);
  const palette = gradientPalette(props.effect);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(0.42, palette[1]);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function gradientPalette(effect) {
  if (effect === "aurora") return ["rgba(124, 247, 197, 0.32)", "rgba(138, 180, 255, 0.2)"];
  if (effect === "codeGlow") return ["rgba(88, 101, 242, 0.3)", "rgba(124, 247, 197, 0.14)"];
  if (effect === "heroGlow") return ["rgba(255, 255, 255, 0.18)", "rgba(138, 180, 255, 0.18)"];
  return ["rgba(124, 247, 197, 0.34)", "rgba(138, 180, 255, 0.2)"];
}

function drawGrid(ctx, canvas, props) {
  const offset = (props.offset ?? 0) * 48;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
  ctx.lineWidth = 1;
  for (let x = -48 + offset; x < canvas.width + 48; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = -48 + offset; y < canvas.height + 48; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawNoise(ctx, canvas, props) {
  const step = 6;
  const seed = Math.floor((props.offset ?? 0) * 60);
  ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      if (hash(x, y, seed) > 0.92) ctx.fillRect(x, y, 1, 1);
    }
  }
}

function hash(x, y, seed) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function resolveBox(canvas, asset, props) {
  if (props.cover) {
    const overscan = props.overscan ?? 1.18;
    const scale = Math.max(canvas.width / asset.width, canvas.height / asset.height) * overscan;
    const width = asset.width * scale;
    const height = asset.height * scale;
    return {
      x: (canvas.width - width) / 2 + props.x,
      y: (canvas.height - height) / 2 + props.y,
      width,
      height
    };
  }

  const width = props.width ?? (props.height ? asset.width * (props.height / asset.height) : asset.width);
  const height = props.height ?? asset.height * (width / asset.width);
  const x = props.center ? (canvas.width - width) / 2 + props.x : props.x;
  const y = props.center ? (canvas.height - height) / 2 + props.y : props.y;
  return { x, y, width, height };
}

function buildFilter(props) {
  const filters = [];
  if (props.blur) filters.push(`blur(${props.blur}px)`);
  if (props.brightness !== 1) filters.push(`brightness(${props.brightness})`);
  return filters.length ? filters.join(" ") : "none";
}

function drawShadow(ctx, props) {
  if (!props.shadow) {
    ctx.shadowBlur = 0;
    return;
  }

  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = props.shadow;
  ctx.shadowOffsetY = props.shadow / 3;
}
