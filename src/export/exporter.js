import { evaluateScene } from "../animation/evaluator.js";
import { GifEncoder } from "./gif-encoder.js";
import { CanvasRenderer } from "../render/canvas-renderer.js";

const MIME_TYPES = {
  webm: ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"],
  mp4: ["video/mp4;codecs=avc1.42E01E", "video/mp4"],
  gif: []
};

export function canExport(format) {
  if (format === "gif") return typeof document !== "undefined";
  if (typeof MediaRecorder === "undefined") return false;
  return Boolean(selectMimeType(format));
}

export function exportSupport() {
  return {
    webm: canExport("webm"),
    mp4: canExport("mp4"),
    gif: canExport("gif")
  };
}

export async function exportVideo({ scene, assets, format, height, fps, onProgress }) {
  if (format === "gif") {
    return exportGif({ scene, assets, height, fps, onProgress });
  }

  const mimeType = selectMimeType(format);
  if (!mimeType) throw new Error(`${format.toUpperCase()} export is not supported by this browser`);

  const width = Math.round((height * scene.canvas.width) / scene.canvas.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const renderer = new CanvasRenderer(canvas);
  const scaledScene = scaleScene(scene, width, height);
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrateFor(height, fps) });
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const finished = new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  recorder.start();
  await renderTimeline({ renderer, scene: scaledScene, assets, fps, onProgress });
  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  return finished;
}

async function exportGif({ scene, assets, height, fps, onProgress }) {
  const width = Math.round((height * scene.canvas.width) / scene.canvas.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const renderer = new CanvasRenderer(canvas);
  const scaledScene = scaleScene(scene, width, height);
  const encoder = new GifEncoder(width, height, 1000 / fps);
  const totalFrames = Math.ceil(scaledScene.canvas.duration * fps);

  for (let frame = 0; frame <= totalFrames; frame += 1) {
    const time = Math.min(scaledScene.canvas.duration, frame / fps);
    renderer.render(evaluateScene(scaledScene, time), assets);
    encoder.addFrame(renderer.context.getImageData(0, 0, width, height));
    onProgress?.(frame / totalFrames);
    if (frame % 4 === 0) await wait(0);
  }

  return encoder.finish();
}

function selectMimeType(format) {
  return MIME_TYPES[format]?.find((type) => MediaRecorder.isTypeSupported(type));
}

async function renderTimeline({ renderer, scene, assets, fps, onProgress }) {
  const totalFrames = Math.ceil(scene.canvas.duration * fps);
  const frameDuration = 1000 / fps;

  for (let frame = 0; frame <= totalFrames; frame += 1) {
    const time = Math.min(scene.canvas.duration, frame / fps);
    renderer.render(evaluateScene(scene, time), assets);
    onProgress?.(frame / totalFrames);
    await wait(frameDuration);
  }
}

function scaleScene(scene, width, height) {
  const scale = width / scene.canvas.width;
  return {
    ...scene,
    canvas: { ...scene.canvas, width, height },
    camera: scaleProperties(scene.camera, scale),
    elements: scene.elements.map((element) => ({
      ...element,
      properties: scaleProperties(element.properties, scale)
    })),
    animations: scene.animations.map((animation) => ({
      ...animation,
      from: scaleProperties(animation.from, scale),
      to: scaleProperties(animation.to, scale),
      keyframes: animation.keyframes.map((frame) => ({
        ...frame,
        properties: scaleProperties(frame.properties, scale)
      }))
    }))
  };
}

function scaleProperties(properties, scale) {
  const scaled = { ...properties };
  for (const key of ["x", "y", "width", "height", "blur", "shadow", "size", "tracking"]) {
    if (typeof scaled[key] === "number") scaled[key] *= scale;
  }
  return scaled;
}

function bitrateFor(height, fps) {
  const base = height >= 2160 ? 28_000_000 : height >= 1440 ? 18_000_000 : height >= 1080 ? 10_000_000 : 5_000_000;
  return Math.round(base * (fps / 60));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
