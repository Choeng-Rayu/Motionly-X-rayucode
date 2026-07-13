import { loadAssets } from "../assets/asset-loader.js";
import { parseMotion } from "../language/parser.js";
import { buildSceneGraph } from "../scene/scene-graph.js";
import { exportSupport, exportVideo } from "../export/exporter.js";
import { CanvasRenderer } from "../render/canvas-renderer.js";
import { Playback } from "./playback.js";

const DEMO_URL = new URL("../../video-motion/codex-showcase.motion", import.meta.url);

const sourceInput = document.querySelector("#scene-source");
const applyButton = document.querySelector("#apply-scene");
const reloadButton = document.querySelector("#reload-scene");
const playButton = document.querySelector("#play-toggle");
const restartButton = document.querySelector("#restart");
const timeline = document.querySelector("#timeline");
const timeReadout = document.querySelector("#time-readout");
const exportSize = document.querySelector("#export-size");
const exportFps = document.querySelector("#export-fps");
const exportStatus = document.querySelector("#export-status");
const sceneDuration = document.querySelector("#scene-duration");
const sceneFps = document.querySelector("#scene-fps");
const sceneElements = document.querySelector("#scene-elements");
const canvas = document.querySelector("#preview-canvas");

const renderer = new CanvasRenderer(canvas);
let playback = null;
let scene = null;
let assets = new Map();

boot();

async function boot() {
  await loadDemo();
  wireControls();
  updateExportButtons();
}

async function loadDemo() {
  const source = await fetch(DEMO_URL).then((response) => response.text());
  sourceInput.value = source;
  await compile(source, DEMO_URL);
}

async function compile(source, baseUrl = document.baseURI) {
  setStatus("Compiling scene...");
  const ast = parseMotion(source);
  scene = buildSceneGraph(ast);
  assets = await loadAssets(scene, baseUrl);

  if (!playback) {
    playback = new Playback({
      scene,
      assets,
      renderer,
      onTick: updateTime
    });
  } else {
    playback.setScene(scene, assets);
  }

  playback.seek(0);
  updateSceneStats();
  setStatus("Ready");
}

function wireControls() {
  applyButton.addEventListener("click", () => compile(sourceInput.value, DEMO_URL).catch(showError));
  reloadButton.addEventListener("click", () => loadDemo().catch(showError));
  sourceInput.addEventListener("change", () => compile(sourceInput.value, DEMO_URL).catch(showError));

  playButton.addEventListener("click", () => {
    playback.toggle();
    updateTime(playback.time, scene.canvas.duration, playback.playing);
  });

  restartButton.addEventListener("click", () => playback.restart());

  timeline.addEventListener("input", () => {
    const time = Number(timeline.value) * scene.canvas.duration;
    playback.pause();
    playback.seek(time);
  });

  document.querySelector("#export-webm").addEventListener("click", () => runExport("webm"));
  document.querySelector("#export-mp4").addEventListener("click", () => runExport("mp4"));
  document.querySelector("#export-gif").addEventListener("click", () => runExport("gif"));
}

async function runExport(format) {
  try {
    setStatus(`Exporting ${format.toUpperCase()}...`);
    playback.pause();
    const blob = await exportVideo({
      scene,
      assets,
      format,
      height: Number(exportSize.value),
      fps: Number(exportFps.value),
      onProgress: (progress) => setStatus(`Exporting ${format.toUpperCase()} ${Math.round(progress * 100)}%`)
    });
    downloadBlob(blob, `motionly-codex-demo.${format}`);
    setStatus(`${format.toUpperCase()} export complete`);
  } catch (error) {
    showError(error);
  }
}

function updateTime(time, duration, playing) {
  timeline.value = String(duration ? time / duration : 0);
  timeReadout.textContent = `${time.toFixed(2)}s`;
  playButton.textContent = playing ? "Pause" : "Play";
}

function updateSceneStats() {
  sceneDuration.textContent = `${scene.canvas.duration.toFixed(0)}s`;
  sceneFps.textContent = `${scene.canvas.fps} FPS`;
  sceneElements.textContent = `${scene.elements.length} Layers`;
}

function updateExportButtons() {
  const support = exportSupport();
  document.querySelector("#export-webm").disabled = !support.webm;
  document.querySelector("#export-mp4").disabled = !support.mp4;
  document.querySelector("#export-gif").disabled = !support.gif;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function showError(error) {
  console.error(error);
  setStatus(error.message);
}

function setStatus(message) {
  exportStatus.textContent = message;
}
