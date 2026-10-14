import { Editor } from '../core/Editor';
import { LocalLayersJson } from '../core/layers/local';
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
/** A `LocalLayerStorage` in the browser's IndexedDB (one record holding all local layers). */
export declare function indexedDbStorage(options?: IndexedDbStorageOptions): LocalLayerStorage;
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
/**
 * Keep `editor.localLayers` in browser storage (IndexedDB by default): import the stored layers
 * once, then save `export()` shortly after every local layer change and every command, undo and
 * redo. Also saves when the page is hidden. Stops when the editor is destroyed.
 */
export declare function persistLocalLayers(editor: Editor, storage?: LocalLayerStorage, options?: PersistLocalLayersOptions): LocalLayerPersistence;
