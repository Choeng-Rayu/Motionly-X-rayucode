import { describe, expect, it } from 'vitest';
import {
  createEditorHistory,
  recordEditorSource,
  redoEditorSource,
  undoEditorSource,
} from '../../src/ui/editor-history';

describe('editor source history', () => {
  it('undoes, redoes, and clears redo after a branch', () => {
    let history = createEditorHistory('one');
    history = recordEditorSource(history, 'two');
    history = recordEditorSource(history, 'three');
    history = undoEditorSource(history);
    expect(history.present).toBe('two');
    history = redoEditorSource(history);
    expect(history.present).toBe('three');
    history = undoEditorSource(history);
    history = recordEditorSource(history, 'branch');
    expect(history.present).toBe('branch');
    expect(history.future).toEqual([]);
  });

  it('ignores duplicates and bounds retained snapshots', () => {
    let history = createEditorHistory('zero');
    history = recordEditorSource(history, 'zero');
    history = recordEditorSource(history, 'one', 2);
    history = recordEditorSource(history, 'two', 2);
    history = recordEditorSource(history, 'three', 2);
    expect(history.past).toEqual(['one', 'two']);
  });
});
