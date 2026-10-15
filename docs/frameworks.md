# Framework integration

ol-cad has no framework dependency. The core is plain TypeScript and the UI is a set of custom elements, so every framework uses it the same way:

1. **Register the elements once** with `defineElements()` from `ol-cad/ui`, before the first `<olcad-*>` tag is rendered.
2. **Load two stylesheets**: `ol/ol.css` and `ol-cad/ui.css`.
3. **Give the dock a height**, for example with a column layout where `<olcad-dock>` takes the remaining space (`flex: 1; min-height: 0`). Do not set its `display`: the dock lays out its zones itself (see [ui.md](ui.md#olcad-dock)).
4. **Create the editor after the map element is in the DOM**, with the element itself as `target`.
5. **Bind each UI element** with `element.editor = editor`.
6. **Tear down on unmount**: set `element.editor = null` on every bound element, then call `editor.destroy()`.
7. **Bridge events into your state**: `editor.on(type, handler)` returns an unsubscribe function. Call it on unmount.
8. **Keep the map element mounted while the editor is alive.** If the map is on a tab or route that can be hidden, hide it with CSS (`hidden`, `display: none`) rather than removing it, or destroy and recreate the editor. OpenLayers renders nothing into an element that is detached or has no size; call `editor.map.updateSize()` when it becomes visible again.

Attributes such as `name`, `reveal` and `popup` also exist as properties that reflect to the attribute, so frameworks that set properties on custom elements (React 19, Vue 3) work with the plain attribute syntax.

Mind the theme: `ol-cad/ui.css` is dark by default and sets `color-scheme` on the whole page (see [Theme](ui.md#theme)). Add `olcad-theme="light"` on `<html>` when your application is light.

What the examples below show:

- **The unsaved-changes counter** counts the [change set](change-set.md), which holds edits of configured layers only. Objects in local layers (the layer list's New layer) and in the draft layer never enter it, so the counter stays at 0 while a user draws only into them. To show objects of every layer, read `editor.layers.list()` (`featureCount`) and `editor.layers.getFeatures(id)` on `change`, `layerchange` and `locallayerchange`.
- **New objects have temporary ids** `tmp-1`, `tmp-2` … until your backend assigns ids through `editor.changes.accept({ idMap })` ([api.md](api.md#editorlayers)). Do not store them.
- **Local layers live in memory** unless you call `persistLocalLayers(editor)` from `ol-cad/ui` ([ui.md](ui.md#persistlocallayerseditor-storage-options)).
- **Bundle size:** OpenLayers and ol-cad together are about 1.4 MB of JavaScript before compression. Vite warns about chunks over 500 kB; raise `build.chunkSizeWarningLimit` or split the map view with a dynamic `import()`.

## Angular

Tested with Angular 22 (standalone components, signals).

### `angular.json`

```json
{
  "styles": ["node_modules/ol/ol.css", "node_modules/ol-cad/dist/ui.css", "src/styles.css"],
  "allowedCommonJsDependencies": ["lerc"],
  "budgets": [{ "type": "initial", "maximumWarning": "2mb", "maximumError": "3mb" }]
}
```

These go under `projects.<app>.architect.build.options` (`styles`, `allowedCommonJsDependencies`) and `configurations.production` (`budgets`).

- The bundle exceeds Angular's default 1 MB initial budget.
- `lerc` is a CommonJS dependency that OpenLayers pulls in through `geotiff`. Allowing it silences the build warning.

### Component

```ts
import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { createEditor, type Editor } from 'ol-cad';
import { defineElements, type OlcadLayerList, type OlcadToolbar } from 'ol-cad/ui';

defineElements();

@Component({
  selector: 'app-map',
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // allows the <olcad-*> tags
  template: `
    <olcad-dock>
      <olcad-toolbar #toolbar name="main" dock="top" tools="select draw delete"></olcad-toolbar>
      <olcad-panel name="layers" heading="Layers" dock="right">
        <olcad-layer-list #layers></olcad-layer-list>
      </olcad-panel>
      <div #map class="map"></div>
    </olcad-dock>
    <p>{{ changeCount() }} unsaved changes</p>
  `,
  styles: [
    ':host { display: flex; flex-direction: column; height: 100%; }',
    'olcad-dock { flex: 1; min-height: 0; }',
    '.map { width: 100%; height: 100%; }',
  ],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private readonly mapRef = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly toolbarRef = viewChild.required<ElementRef<OlcadToolbar>>('toolbar');
  private readonly layersRef = viewChild.required<ElementRef<OlcadLayerList>>('layers');

  readonly changeCount = signal(0);
  private editor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];

  ngAfterViewInit(): void {
    const editor = createEditor({
      target: this.mapRef().nativeElement,
      view: { projection: 'EPSG:3857', center: [935000, 6270000], zoom: 13 },
      basemaps: [{ id: 'osm', type: 'osm', title: 'OpenStreetMap', visible: true }],
    });
    this.toolbarRef().nativeElement.editor = editor;
    this.layersRef().nativeElement.editor = editor;
    this.unsubscribe.push(
      // Edits of configured layers only; local layers are not in the change set.
      editor.on('change', (changeSet) => this.changeCount.set(changeSet.changes.length)),
    );
    this.editor = editor;
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((off) => off());
    this.toolbarRef().nativeElement.editor = null;
    this.layersRef().nativeElement.editor = null;
    this.editor?.destroy();
    this.editor = null;
  }
}
```

Notes:

- `OlcadToolbar`, `OlcadLayerList` and the other element classes are exported from `ol-cad/ui`, so `.editor = editor` type-checks under `strict` without casts.
- To share the editor with other components (an objects list, a save button), keep it in a service and expose signals that the `editor.on(...)` handlers update. `change`, `layerchange` and `locallayerchange` cover drawing, undo and redo.

## React

For React 19. Under `<StrictMode>` React runs the effect, its cleanup and the effect again on mount; the cleanup destroys the first editor, so one map remains.

### JSX typings

TypeScript does not know the `<olcad-*>` tags in JSX. Add a declaration file to your sources, for example `src/olcad-jsx.d.ts`:

```ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type {
  OlcadAttributeForm,
  OlcadDock,
  OlcadLayerList,
  OlcadPanel,
  OlcadToolbar,
} from 'ol-cad/ui';

type Olcad<T> = DetailedHTMLProps<HTMLAttributes<T>, T> & {
  name?: string;
  heading?: string;
  dock?: 'top' | 'right' | 'bottom' | 'left';
  tools?: string;
  controls?: string;
  flyout?: boolean;
  compact?: boolean;
  reveal?: boolean;
  popup?: boolean;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'olcad-dock': Olcad<OlcadDock>;
      'olcad-panel': Olcad<OlcadPanel>;
      'olcad-toolbar': Olcad<OlcadToolbar>;
      'olcad-layer-list': Olcad<OlcadLayerList>;
      'olcad-attribute-form': Olcad<OlcadAttributeForm>;
    }
  }
}
```

Add a line per further element you use. ol-cad cannot ship these typings itself, because it has no React dependency.

### Component

```tsx
import { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import 'ol-cad/ui.css';
import { createEditor } from 'ol-cad';
import { defineElements, type OlcadLayerList, type OlcadToolbar } from 'ol-cad/ui';

defineElements();

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<OlcadToolbar>(null);
  const layersRef = useRef<OlcadLayerList>(null);
  const [changeCount, setChangeCount] = useState(0);

  useEffect(() => {
    const toolbar = toolbarRef.current!;
    const layers = layersRef.current!;
    const editor = createEditor({
      target: mapRef.current!,
      view: { projection: 'EPSG:3857', center: [935000, 6270000], zoom: 13 },
      basemaps: [{ id: 'osm', type: 'osm', title: 'OpenStreetMap', visible: true }],
    });
    toolbar.editor = editor;
    layers.editor = editor;
    // Edits of configured layers only; local layers are not in the change set.
    const off = editor.on('change', (changeSet) => setChangeCount(changeSet.changes.length));
    return () => {
      off();
      toolbar.editor = null;
      layers.editor = null;
      editor.destroy();
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <olcad-dock style={{ flex: 1, minHeight: 0 }}>
        <olcad-toolbar ref={toolbarRef} name="main" dock="top" tools="select draw delete" />
        <olcad-panel name="layers" heading="Layers" dock="right">
          <olcad-layer-list ref={layersRef} />
        </olcad-panel>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </olcad-dock>
      <p>{changeCount} unsaved changes</p>
    </div>
  );
}
```

To share the editor with other components, keep it in state (`useState<Editor | null>`, set in the effect, reset in the cleanup) or a context, and read `editor.layers.list()` in handlers for `change`, `layerchange` and `locallayerchange`.

## Vue

For Vue 3.5 with `<script setup>`.

### `vite.config.ts`

Tell the template compiler that `olcad-*` tags are custom elements:

```ts
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('olcad-') } } }),
  ],
});
```

`vue-tsc` accepts the tags without further typings.

### Component

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef } from 'vue';
import 'ol/ol.css';
import 'ol-cad/ui.css';
import { createEditor, type Editor } from 'ol-cad';
import { defineElements, type OlcadLayerList, type OlcadToolbar } from 'ol-cad/ui';

defineElements();

const mapEl = useTemplateRef<HTMLDivElement>('map');
const toolbarEl = useTemplateRef<OlcadToolbar>('toolbar');
const layersEl = useTemplateRef<OlcadLayerList>('layers');
// shallowRef, never ref() or reactive(): a deep proxy breaks the Editor type and wraps
// OpenLayers internals.
const editor = shallowRef<Editor | null>(null);
const changeCount = ref(0);
let off: (() => void) | null = null;

onMounted(() => {
  const created = createEditor({
    target: mapEl.value!,
    view: { projection: 'EPSG:3857', center: [935000, 6270000], zoom: 13 },
    basemaps: [{ id: 'osm', type: 'osm', title: 'OpenStreetMap', visible: true }],
  });
  toolbarEl.value!.editor = created;
  layersEl.value!.editor = created;
  // Edits of configured layers only; local layers are not in the change set.
  off = created.on('change', (changeSet) => (changeCount.value = changeSet.changes.length));
  editor.value = created;
});

onBeforeUnmount(() => {
  off?.();
  if (toolbarEl.value) toolbarEl.value.editor = null;
  if (layersEl.value) layersEl.value.editor = null;
  editor.value?.destroy();
  editor.value = null;
});
</script>

<template>
  <div class="map-view">
    <olcad-dock>
      <olcad-toolbar
        ref="toolbar"
        name="main"
        dock="top"
        tools="select draw delete"
      ></olcad-toolbar>
      <olcad-panel name="layers" heading="Layers" dock="right">
        <olcad-layer-list ref="layers"></olcad-layer-list>
      </olcad-panel>
      <div ref="map" class="map"></div>
    </olcad-dock>
    <p>{{ changeCount }} unsaved changes</p>
  </div>
</template>

<style scoped>
.map-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
olcad-dock {
  flex: 1; /* size only; never set display on the dock */
  min-height: 0;
}
.map {
  width: 100%;
  height: 100%;
}
</style>
```

Notes:

- To share the editor, `provide` the `shallowRef` or return it from a composable. A composable that lists layers subscribes with `editor.on(...)` in `watch(editor, …)` and calls the unsubscribe functions in `onScopeDispose`.
- When the map view is hidden with `v-show` (rule 8), call `editor.value?.map.updateSize()` after `await nextTick()` once it is shown again.
