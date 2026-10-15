import type { Editor } from '../core/Editor';
import type { LocalLayersJson } from '../core/layers/local';

/** Where `persistLocalLayers` keeps the local layers. */
export interface LocalLayerStorage {
  /** The stored JSON, or `undefined` when nothing is stored yet. */
  load(): Promise<unknown>;
  save(data: LocalLayersJson): Promise<void>;
}

export interface IndexedDbStorageOptions {
  /** Database name. Default `'olcad-local-layers'`. */
  dbName?: string;
  /** Key of the record in the database, for several editors on one origin. Default `'layers'`. */
  key?: string;
}

const STORE = 'layers';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

/** A `LocalLayerStorage` in the browser's IndexedDB (one record holding all local layers). */
export function indexedDbStorage(options: IndexedDbStorageOptions = {}): LocalLayerStorage {
  const dbName = options.dbName ?? 'olcad-local-layers';
  const key = options.key ?? 'layers';
  let db: Promise<IDBDatabase> | null = null;
  const open = () => {
    if (!db) {
      if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB is not available'));
      }
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      db = request(req);
    }
    return db;
  };
  return {
    async load() {
      const store = (await open()).transaction(STORE, 'readonly').objectStore(STORE);
      return request(store.get(key));
    },
    async save(data) {
      const tx = (await open()).transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, key);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
      });
    },
  };
}

export interface PersistLocalLayersOptions {
  /** Milliseconds to wait after the last change before saving. Default `300`. */
  delay?: number;
  /** Called when loading or saving fails. Default: `console.error`. */
  onError?: (error: unknown) => void;
}

export interface LocalLayerPersistence {
  /** Settles when the stored layers have been imported (or nothing was stored). */
  ready: Promise<void>;
  /** Save now instead of waiting for the delay. */
  flush(): Promise<void>;
  /** Stop saving; a pending save is written first. */
  stop(): Promise<void>;
}

/** Running `persistLocalLayers` calls per editor, so the UI can say where local layers are kept. */
const persisted = new Map<Editor, number>();
const persistenceListeners = new Set<() => void>();

/** Whether `persistLocalLayers` is keeping this editor's local layers in browser storage. */
export function isLocalLayerPersisted(editor: Editor): boolean {
  return (persisted.get(editor) ?? 0) > 0;
}

/** Called whenever `persistLocalLayers` starts or stops for any editor. Returns an unsubscribe. */
export function onLocalLayerPersistenceChange(listener: () => void): () => void {
  persistenceListeners.add(listener);
  return () => persistenceListeners.delete(listener);
}

function countPersistence(editor: Editor, delta: 1 | -1): void {
  const count = (persisted.get(editor) ?? 0) + delta;
  if (count > 0) persisted.set(editor, count);
  else persisted.delete(editor);
  for (const listener of persistenceListeners) listener();
}

/**
 * Keep `editor.localLayers` in browser storage (IndexedDB by default): import the stored layers
 * once, then save `export()` shortly after every local layer change and every command, undo and
 * redo. Also saves when the page is hidden. Stops when the editor is destroyed.
 */
export function persistLocalLayers(
  editor: Editor,
  storage: LocalLayerStorage = indexedDbStorage(),
  options: PersistLocalLayersOptions = {},
): LocalLayerPersistence {
  const delay = options.delay ?? 300;
  const onError =
    options.onError ?? ((error: unknown) => console.error('ol-cad local layers:', error));
  let timer: ReturnType<typeof setTimeout> | null = null;
  let loaded = false;
  let stopped = false;
  /** Whether the stored state may differ from the editor (something changed since the last save). */
  let dirty = false;
  const offs: (() => void)[] = [];
  countPersistence(editor, 1);

  const save = async () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!loaded || !dirty) return;
    dirty = false;
    try {
      await storage.save(editor.localLayers.export());
    } catch (error) {
      onError(error);
    }
  };
  const schedule = () => {
    if (stopped) return;
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void save(), delay);
  };

  const ready = storage
    .load()
    .then((data) => {
      if (data !== undefined && data !== null) editor.localLayers.import(data);
    })
    .catch(onError)
    .finally(() => {
      loaded = true;
      if (dirty) schedule();
    });

  offs.push(
    editor.on('locallayerchange', ({ type }) => {
      if (type !== 'import') schedule();
    }),
    // Commands, undo and redo; cheap enough to save the local layers after any of them.
    editor.on('change', () => {
      if (editor.localLayers.list().length > 0 || dirty) schedule();
    }),
    editor.on('destroy', () => void stop()),
  );
  const doc = editor.map.getTargetElement()?.ownerDocument;
  const onHide = () => {
    if (doc?.visibilityState === 'hidden') void save();
  };
  doc?.addEventListener('visibilitychange', onHide);
  offs.push(() => doc?.removeEventListener('visibilitychange', onHide));

  const stop = async () => {
    if (stopped) return;
    stopped = true;
    for (const off of offs) off();
    countPersistence(editor, -1);
    await save();
  };
  return { ready, flush: save, stop };
}
