import { evaluateScene } from "../animation/evaluator.js";

export class Playback {
  constructor({ scene, renderer, assets, onTick }) {
    this.scene = scene;
    this.renderer = renderer;
    this.assets = assets;
    this.onTick = onTick;
    this.time = 0;
    this.playing = false;
    this.lastNow = 0;
    this.frame = 0;
  }

  setScene(scene, assets) {
    this.pause();
    this.scene = scene;
    this.assets = assets;
    this.seek(0);
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.lastNow = performance.now();
    this.frame = requestAnimationFrame((now) => this.tick(now));
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.frame);
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  restart() {
    this.seek(0);
    this.play();
  }

  seek(time) {
    this.time = Math.max(0, Math.min(this.scene.canvas.duration, time));
    this.draw();
  }

  tick(now) {
    if (!this.playing) return;
    const delta = (now - this.lastNow) / 1000;
    this.lastNow = now;
    this.time += delta;

    if (this.time >= this.scene.canvas.duration) {
      this.time = this.scene.canvas.duration;
      this.pause();
    }

    this.draw();
    if (this.playing) this.frame = requestAnimationFrame((next) => this.tick(next));
  }

  draw() {
    this.renderer.render(evaluateScene(this.scene, this.time), this.assets);
    this.onTick?.(this.time, this.scene.canvas.duration, this.playing);
  }
}

