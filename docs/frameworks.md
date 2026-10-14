# Framework integration

ol-cad has no framework dependency. The core is plain TypeScript and the UI is a set of custom elements, so every framework uses it the same way:

1. **Register the elements once** with `defineElements()` from `ol-cad/ui`, before the first `<olcad-*>` tag is rendered.
2. **Load two stylesheets**: `ol/ol.css` and `ol-cad/ui.css`.
3. **Create the editor after the map element is in the DOM**, with the element itself as `target`.
4. **Bind each UI element** with `element.editor = editor`.
5. **Tear down on unmount**: set `element.editor = null` on every bound element, then call `editor.destroy()`.
6. **Bridge events into your state**: `editor.on(type, handler)` returns an unsubscribe function. Call it on unmount.
7. **Keep the map element mounted while the editor is alive.** If the map is on a tab or route that can be hidden, hide it with CSS (`hidden`, `display: none`) rather than removing it, or destroy and recreate the editor. OpenLayers renders nothing into an element that is detached or has no size, and calls `map.updateSize()` when it becomes visible again.

Mind the theme: `ol-cad/ui.css` is dark by default and sets `color-scheme` on the whole page (see [Theme](ui.md#theme)). Add `olcad-theme="light"` on `<html>` when your application is light.

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

- OpenLayers and ol-cad together are about 1.4 MB of initial JavaScript before compression, which exceeds Angular's default 1 MB budget.
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
  standalone: true,
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
  styles: [':host { display: block; height: 100%; } .map { width: 100%; height: 100%; }'],
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
      basemaps: [{ id: 'osm', type: 'osm', visible: true }],
    });
    this.toolbarRef().nativeElement.editor = editor;
    this.layersRef().nativeElement.editor = editor;
    this.unsubscribe.push(
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
- To share the editor with other components (an objects list, a save button), keep it in a service and expose signals that the `editor.on(...)` handlers update. `change`, `layerchange` and `locallayerchange` cover drawing, undo and redo. Read the current state with `editor.layers.list()` and `editor.layers.getFeatures(id)`.
- Local layers live in memory unless you call `persistLocalLayers(editor)` from `ol-cad/ui` (see [ui.md](ui.md#persistlocallayerseditor-storage-options)).

## React and Vue

There are no React or Vue examples yet. Follow the rules at the top of this page: create the editor in `useEffect` / `onMounted` with a ref to the map element, bind the elements through refs, and do the teardown in the effect cleanup / `onBeforeUnmount`. In Vue, tell the compiler that `olcad-*` tags are custom elements (`compilerOptions.isCustomElement: (tag) => tag.startsWith('olcad-')`).
