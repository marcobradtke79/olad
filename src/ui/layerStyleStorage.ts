import type { Editor } from '../core/Editor';

export interface PersistLayerStylesOptions {
  /** localStorage key. Default `'olcad-layer-styles'`. */
  key?: string;
  /** Storage to use. Default `localStorage` (when available). */
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

/**
 * Keep the user's layer and overlay styles and the drawing order (`editor.layers.exportStyles`)
 * in browser storage: restore them now, save after every `layerchange` of type `style` or
 * `order` and every `overlaychange` of type `style`. Unreadable or invalid stored data is
 * ignored. Returns a function that stops saving.
 */
export function persistLayerStyles(
  editor: Editor,
  options: PersistLayerStylesOptions = {},
): () => void {
  const key = options.key ?? 'olcad-layer-styles';
  let storage = options.storage;
  if (!storage) {
    try {
      storage = globalThis.localStorage;
    } catch {
      storage = undefined; // blocked storage: styles last for the session
    }
  }
  let restoring = false;
  try {
    const raw = storage?.getItem(key);
    if (raw) {
      restoring = true;
      editor.layers.importStyles(JSON.parse(raw));
    }
  } catch (error) {
    console.warn('ol-cad: stored layer styles ignored:', error);
  } finally {
    restoring = false;
  }
  const save = () => {
    try {
      storage?.setItem(key, JSON.stringify(editor.layers.exportStyles()));
    } catch {
      // Storage full or unavailable: the styles stay for the session.
    }
  };
  const offLayers = editor.on('layerchange', ({ type }) => {
    if (!restoring && (type === 'style' || type === 'order')) save();
  });
  const offOverlays = editor.on('overlaychange', ({ type }) => {
    if (!restoring && type === 'style') save();
  });
  return () => {
    offLayers();
    offOverlays();
  };
}
