export interface EditorHistory {
  past: string[];
  present: string;
  future: string[];
}

export function createEditorHistory(source: string): EditorHistory {
  return { past: [], present: source, future: [] };
}

export function recordEditorSource(
  history: EditorHistory,
  source: string,
  limit = 100
): EditorHistory {
  if (source === history.present) return history;
  return {
    past: [...history.past, history.present].slice(-Math.max(1, limit)),
    present: source,
    future: [],
  };
}

export function undoEditorSource(history: EditorHistory): EditorHistory {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoEditorSource(history: EditorHistory): EditorHistory {
  const next = history.future[0];
  if (next === undefined) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}
