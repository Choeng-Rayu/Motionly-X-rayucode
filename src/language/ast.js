export function createProgram(body) {
  return { type: "Program", body };
}

export function createCanvas(properties) {
  return { type: "Canvas", properties };
}

export function createImport(path, name) {
  return { type: "Import", path, name };
}

export function createCamera(properties) {
  return { type: "Camera", properties };
}

export function createElement(kind, name, properties) {
  return { type: "Element", kind, name, properties };
}

export function createAnimation(target, body) {
  return { type: "Animation", target, ...body };
}

export function createSequence(name, properties) {
  return { type: "Sequence", name, properties };
}
