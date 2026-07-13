export function tokenize(source) {
  const tokens = [];
  let index = 0;
  let line = 1;
  let column = 1;

  while (index < source.length) {
    const char = source[index];

    if (char === "\n") {
      tokens.push(token("newline", "\n", line, column));
      index += 1;
      line += 1;
      column = 1;
      continue;
    }

    if (/\s/.test(char)) {
      index += 1;
      column += 1;
      continue;
    }

    if (char === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
        column += 1;
      }
      continue;
    }

    if (char === "{" || char === "}") {
      tokens.push(token(char, char, line, column));
      index += 1;
      column += 1;
      continue;
    }

    if (char === "\"") {
      const startColumn = column;
      let value = "";
      index += 1;
      column += 1;
      while (index < source.length && source[index] !== "\"") {
        value += source[index];
        index += 1;
        column += 1;
      }
      if (source[index] !== "\"") throw new Error(`Unterminated string at ${line}:${startColumn}`);
      index += 1;
      column += 1;
      tokens.push(token("string", value, line, startColumn));
      continue;
    }

    const startColumn = column;
    let value = "";
    while (index < source.length && !/\s/.test(source[index]) && source[index] !== "{" && source[index] !== "}") {
      value += source[index];
      index += 1;
      column += 1;
    }
    tokens.push(token("word", value, line, startColumn));
  }

  tokens.push(token("eof", "", line, column));
  return tokens;
}

function token(type, value, line, column) {
  return { type, value, line, column };
}

