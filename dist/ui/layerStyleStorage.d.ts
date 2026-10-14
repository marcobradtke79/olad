import { Editor } from '../core/Editor';
export interface PersistLayerStylesOptions {
    /** localStorage key. Default `'olcad-layer-styles'`. */
    key?: string;
    /** Storage to use. Default `localStorage` (when available). */
    storage?: Pick<Storage, 'getItem' | 'setItem'>;
}
/**
 * Keep the user's layer styles and drawing order (`editor.layers.exportStyles`) in browser
 * storage: restore them now, save after every `layerchange` of type `style` or `order`.
 * Unreadable or invalid stored data is ignored. Returns a function that stops saving.
 */
export declare function persistLayerStyles(editor: Editor, options?: PersistLayerStylesOptions): () => void;
