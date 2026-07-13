const PALETTE = buildPalette();

export class GifEncoder {
  constructor(width, height, delayMs) {
    this.width = width;
    this.height = height;
    this.delay = Math.max(1, Math.round(delayMs / 10));
    this.bytes = [];
    this.writeText("GIF89a");
    this.writeWord(width);
    this.writeWord(height);
    this.writeByte(0xf7);
    this.writeByte(0);
    this.writeByte(0);
    this.writeBytes(PALETTE);
    this.writeLoopExtension();
  }

  addFrame(imageData) {
    this.writeGraphicControl();
    this.writeImageDescriptor();
    this.writeByte(8);
    this.writeSubBlocks(lzwEncode(indexPixels(imageData.data)));
  }

  finish() {
    this.writeByte(0x3b);
    return new Blob([new Uint8Array(this.bytes)], { type: "image/gif" });
  }

  writeLoopExtension() {
    this.writeBytes([0x21, 0xff, 0x0b]);
    this.writeText("NETSCAPE2.0");
    this.writeBytes([0x03, 0x01, 0x00, 0x00, 0x00]);
  }

  writeGraphicControl() {
    this.writeBytes([0x21, 0xf9, 0x04, 0x00]);
    this.writeWord(this.delay);
    this.writeBytes([0x00, 0x00]);
  }

  writeImageDescriptor() {
    this.writeByte(0x2c);
    this.writeWord(0);
    this.writeWord(0);
    this.writeWord(this.width);
    this.writeWord(this.height);
    this.writeByte(0);
  }

  writeSubBlocks(data) {
    for (let index = 0; index < data.length; index += 255) {
      const block = data.slice(index, index + 255);
      this.writeByte(block.length);
      this.writeBytes(block);
    }
    this.writeByte(0);
  }

  writeText(text) {
    for (const char of text) this.writeByte(char.charCodeAt(0));
  }

  writeWord(value) {
    this.writeByte(value & 0xff);
    this.writeByte((value >> 8) & 0xff);
  }

  writeByte(value) {
    this.bytes.push(value & 0xff);
  }

  writeBytes(values) {
    this.bytes.push(...values);
  }
}

function buildPalette() {
  const palette = [];
  for (let r = 0; r < 8; r += 1) {
    for (let g = 0; g < 8; g += 1) {
      for (let b = 0; b < 4; b += 1) {
        palette.push(Math.round((r / 7) * 255));
        palette.push(Math.round((g / 7) * 255));
        palette.push(Math.round((b / 3) * 255));
      }
    }
  }
  return palette;
}

function indexPixels(rgba) {
  const indexed = new Uint8Array(rgba.length / 4);
  for (let source = 0, target = 0; source < rgba.length; source += 4, target += 1) {
    const r = rgba[source] >> 5;
    const g = rgba[source + 1] >> 5;
    const b = rgba[source + 2] >> 6;
    indexed[target] = (r << 5) | (g << 2) | b;
  }
  return indexed;
}

function lzwEncode(indices) {
  const minCodeSize = 8;
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let dictionary = initialDictionary();
  const writer = new BitWriter();

  writer.write(clearCode, codeSize);
  let current = String(indices[0]);

  for (let index = 1; index < indices.length; index += 1) {
    const value = indices[index];
    const combined = `${current},${value}`;

    if (dictionary.has(combined)) {
      current = combined;
      continue;
    }

    writer.write(dictionary.get(current), codeSize);

    if (nextCode < 4096) {
      dictionary.set(combined, nextCode);
      nextCode += 1;
      if (nextCode === 1 << codeSize && codeSize < 12) codeSize += 1;
    } else {
      writer.write(clearCode, codeSize);
      dictionary = initialDictionary();
      codeSize = minCodeSize + 1;
      nextCode = endCode + 1;
    }

    current = String(value);
  }

  writer.write(dictionary.get(current), codeSize);
  writer.write(endCode, codeSize);
  return writer.finish();
}

function initialDictionary() {
  const dictionary = new Map();
  for (let index = 0; index < 256; index += 1) dictionary.set(String(index), index);
  return dictionary;
}

class BitWriter {
  constructor() {
    this.bytes = [];
    this.buffer = 0;
    this.bits = 0;
  }

  write(code, size) {
    this.buffer |= code << this.bits;
    this.bits += size;

    while (this.bits >= 8) {
      this.bytes.push(this.buffer & 0xff);
      this.buffer >>= 8;
      this.bits -= 8;
    }
  }

  finish() {
    if (this.bits > 0) this.bytes.push(this.buffer & 0xff);
    return this.bytes;
  }
}

