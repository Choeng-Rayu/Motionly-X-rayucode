import { createAnimation, createCamera, createCanvas, createElement, createImport, createProgram, createSequence } from "./ast.js";
import { tokenize } from "./tokenizer.js";

const ELEMENT_KINDS = new Set(["text", "overlay", "effect"]);
const PROPERTY_NAMES = new Set([
  "background",
  "backgroundEffect",
  "blur",
  "brightness",
  "center",
  "color",
  "cover",
  "fill",
  "effect",
  "font",
  "height",
  "layer",
  "animation",
  "cameraAnimation",
  "textAnimation",
  "opacity",
  "offset",
  "intensity",
  "rotation",
  "scale",
  "shadow",
  "size",
  "stroke",
  "tracking",
  "value",
  "weight",
  "width",
  "x",
  "y",
  "zoom"
]);

export function parseMotion(source) {
  return new Parser(tokenize(source)).parseProgram();
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  parseProgram() {
    const body = [];
    while (!this.check("eof")) {
      this.skipNewlines();
      if (this.check("eof")) break;
      body.push(this.parseStatement());
    }
    return createProgram(body);
  }

  parseStatement() {
    const current = this.peek();

    if (this.matchWord("canvas")) {
      return createCanvas(this.parseBlockProperties());
    }

    if (this.matchWord("camera")) {
      return createCamera(this.parseBlockProperties());
    }

    if (this.matchWord("sequence")) {
      const name = this.consume("word", "Expected sequence name").value;
      return createSequence(name, this.parseBlockProperties());
    }

    if (this.matchWord("import")) {
      const path = this.consume("string", "Expected import path").value;
      this.consumeWord("as", "Expected \"as\" in import");
      const name = this.consume("word", "Expected import alias").value;
      this.skipNewlines();
      return createImport(path, name);
    }

    if (this.matchWord("animate")) {
      const target = this.consume("word", "Expected animation target").value;
      return createAnimation(target, this.parseAnimationBody());
    }

    if (current.type === "word") {
      const first = this.advance().value;
      if (ELEMENT_KINDS.has(first)) {
        const name = this.consume("word", `Expected ${first} name`).value;
        return createElement(first, name, this.parseBlockProperties());
      }
      return createElement("asset", first, this.parseBlockProperties());
    }

    throw this.error(current, `Unexpected token "${current.value}"`);
  }

  parseAnimationBody() {
    this.consume("{", "Expected animation block");
    const body = { from: {}, to: {}, keyframes: [], delay: 0, duration: 1, easing: "soft" };

    while (!this.check("}") && !this.check("eof")) {
      this.skipNewlines();
      if (this.check("}")) break;

      if (this.matchWord("from")) {
        body.from = this.parseBlockProperties();
        continue;
      }

      if (this.matchWord("to")) {
        body.to = this.parseBlockProperties();
        continue;
      }

      if (this.matchWord("keyframes")) {
        body.keyframes = this.parseKeyframes();
        continue;
      }

      const key = this.consume("word", "Expected animation property").value;
      const values = this.collectLineValues();
      body[key] = values.join(" ");
    }

    this.consume("}", "Expected end of animation block");
    this.skipNewlines();
    return body;
  }

  parseKeyframes() {
    this.consume("{", "Expected keyframes block");
    const frames = [];

    while (!this.check("}") && !this.check("eof")) {
      this.skipNewlines();
      if (this.check("}")) break;
      const offsetToken = this.consume("word", "Expected keyframe offset");
      const offset = offsetToken.value.endsWith("%")
        ? Number.parseFloat(offsetToken.value) / 100
        : Number.parseFloat(offsetToken.value);
      frames.push({ offset, properties: this.parseBlockProperties() });
    }

    this.consume("}", "Expected end of keyframes block");
    return frames.sort((a, b) => a.offset - b.offset);
  }

  parseBlockProperties() {
    this.consume("{", "Expected block");
    const properties = {};

    while (!this.check("}") && !this.check("eof")) {
      this.skipNewlines();
      if (this.check("}")) break;
      const key = this.consume("word", "Expected property name").value;

      if (key === "center" || key === "cover") {
        properties[key] = true;
        this.skipNewlines();
        continue;
      }

      const compactValues = !["animation", "textAnimation", "cameraAnimation", "backgroundEffect"].includes(key);
      properties[key] = this.collectLineValues({ stopAtPropertyName: compactValues }).join(" ");
    }

    this.consume("}", "Expected end of block");
    this.skipNewlines();
    return properties;
  }

  collectLineValues(options = {}) {
    const values = [];
    while (!this.check("newline") && !this.check("}") && !this.check("eof")) {
      if (
        options.stopAtPropertyName &&
        values.length > 0 &&
        this.check("word") &&
        PROPERTY_NAMES.has(this.peek().value)
      ) {
        break;
      }
      values.push(this.advance().value);
    }
    this.skipNewlines();
    return values;
  }

  skipNewlines() {
    while (this.match("newline")) {}
  }

  match(type) {
    if (!this.check(type)) return false;
    this.advance();
    return true;
  }

  matchWord(value) {
    if (!this.check("word") || this.peek().value !== value) return false;
    this.advance();
    return true;
  }

  consume(type, message) {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  consumeWord(value, message) {
    if (this.check("word") && this.peek().value === value) return this.advance();
    throw this.error(this.peek(), message);
  }

  check(type) {
    return this.peek().type === type;
  }

  advance() {
    return this.tokens[this.index++];
  }

  peek() {
    return this.tokens[this.index];
  }

  error(token, message) {
    return new Error(`${message} at ${token.line}:${token.column}`);
  }
}
