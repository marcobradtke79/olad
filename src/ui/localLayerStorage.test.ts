// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor, EditorEvents } from '../core/Editor';
import { Emitter } from '../core/events';
import type { LocalLayersJson } from '../core/layers/local';
import { indexedDbStorage, persistLocalLayers, type LocalLayerStorage } from './localLayerStorage';

const stored: LocalLayersJson = { version: 1, layers: [] };

function fakeEditor() {
  const emitter = new Emitter<EditorEvents>();
  let layers = 0;
  const editor = {
    localLayers: {
      import: vi.fn(),
      export: vi.fn(() => ({ version: 1, layers: [] })),
      list: () => Array.from({ length: layers }),
    },
    map: { getTargetElement: () => document.body },
    on: emitter.on.bind(emitter),
    emit: emitter.emit.bind(emitter),
    setCount(n: number) {
      layers = n;
    },
  };
  return editor as unknown as Editor & typeof editor;
}

function memory(initial?: unknown): LocalLayerStorage & { saved: unknown[] } {
  const saved: unknown[] = [];
  return { saved, load: async () => initial, save: async (data) => void saved.push(data) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('persistLocalLayers', () => {
  it('imports the stored layers once', async () => {
    const editor = fakeEditor();
    await persistLocalLayers(editor, memory(stored)).ready;
    expect(editor.localLayers.import).toHaveBeenCalledWith(stored);
    const empty = fakeEditor();
    await persistLocalLayers(empty, memory(undefined)).ready;
    expect(empty.localLayers.import).not.toHaveBeenCalled();
  });

  it('saves shortly after local layer changes and commands, not after its own import', async () => {
    const editor = fakeEditor();
    const storage = memory(stored);
    const persistence = persistLocalLayers(editor, storage, { delay: 100 });
    await persistence.ready;
    editor.emit('locallayerchange', { id: null, type: 'import' });
    editor.emit('change', { version: 1, changes: [] }); // no local layers: nothing to save
    await vi.advanceTimersByTimeAsync(200);
    expect(storage.saved).toHaveLength(0);
    editor.setCount(1);
    editor.emit('locallayerchange', { id: 'local-1', type: 'create' });
    editor.emit('change', { version: 1, changes: [] });
    await vi.advanceTimersByTimeAsync(50);
    expect(storage.saved).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(storage.saved).toHaveLength(1); // debounced into one save
    editor.emit('change', { version: 1, changes: [] });
    await persistence.stop(); // writes the pending save
    expect(storage.saved).toHaveLength(2);
    editor.emit('change', { version: 1, changes: [] });
    await vi.advanceTimersByTimeAsync(200);
    expect(storage.saved).toHaveLength(2);
  });

  it('reports load errors and keeps working', async () => {
    const editor = fakeEditor();
    const onError = vi.fn();
    const storage = memory();
    storage.load = async () => {
      throw new Error('broken');
    };
    await persistLocalLayers(editor, storage, { onError }).ready;
    expect(onError).toHaveBeenCalledWith(new Error('broken'));
  });

  it('indexedDbStorage fails cleanly without IndexedDB', async () => {
    await expect(indexedDbStorage().load()).rejects.toThrow(/not available/);
  });
});
