import 'ol/ol.css';
import 'ol-cad/ui.css';
import { createEditor } from 'ol-cad';
import {
  bindPanelMenu,
  persistLayerStyles,
  defineElements,
  persistLocalLayers,
  type OlcadAttributeForm,
  type OlcadDock,
  type OlcadExportDialog,
  type OlcadImportDialog,
  type OlcadFeatureTable,
  type OlcadLayerList,
  type OlcadLayerStyleDialog,
  type OlcadMenu,
  type OlcadMeasureResults,
  type OlcadSnapSettings,
  type OlcadStraightedge,
  type OlcadTemplateList,
  type OlcadToolbar,
  type OlcadUnitSelect,
} from 'ol-cad/ui';

defineElements();

// View menu: Reset layout, then Show all / Hide all and a checkbox per toolbar and panel.
const dock = document.querySelector<OlcadDock>('olcad-dock')!;
bindPanelMenu(document.querySelector<OlcadMenu>('olcad-menu[label="View"]')!, dock);
document.getElementById('reset-layout')!.addEventListener('click', () => dock.resetLayout());

const editor = createEditor({
  target: 'map',
  view: { projection: 'EPSG:3857', center: [935100, 6276400], zoom: 16 },
  basemaps: [
    { id: 'osm', type: 'osm', title: 'OpenStreetMap', visible: true },
    {
      id: 'opentopomap',
      type: 'xyz',
      title: 'OpenTopoMap',
      url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style &copy; <a href="https://opentopomap.org/">OpenTopoMap</a> (CC-BY-SA)',
      maxZoom: 17,
    },
  ],
  layers: [
    {
      id: 'notes',
      title: 'Notes',
      geometryType: 'Point',
      editable: true,
      schema: {
        fields: [
          { name: 'text', type: 'string', required: true },
          { name: 'done', type: 'boolean', default: false },
        ],
      },
      source: {
        features: [
          {
            type: 'Feature',
            id: 1,
            properties: { text: 'Inline feature' },
            geometry: { type: 'Point', coordinates: [8.4, 49.009] },
          },
        ],
      },
    },
    {
      // A dimension layer: aligned dimensions after DIN 1356-1, the GIS value in brackets
      // until a field value is set.
      id: 'dimensions',
      title: 'Dimensions',
      geometryType: 'LineString',
      editable: true,
      snappable: false,
      dimension: { preset: 'architecture', referenceScale: 2500, textSize: 3.5 },
      source: {
        features: [
          {
            type: 'Feature',
            id: 1,
            properties: { offset: -12 },
            geometry: {
              type: 'LineString',
              coordinates: [
                [8.399, 49.009],
                [8.401, 49.009],
              ],
            },
          },
          {
            type: 'Feature',
            id: 2,
            properties: { offset: 12, fieldValue: 166.98 },
            geometry: {
              type: 'LineString',
              coordinates: [
                [8.399, 49.009],
                [8.399, 49.0105],
              ],
            },
          },
        ],
      },
    },
  ],
});

document.querySelector<OlcadLayerList>('olcad-layer-list')!.editor = editor;
document.querySelector<OlcadUnitSelect>('olcad-unit-select')!.editor = editor;
// View → Layer styles…: order, colours, labels and zoom range, kept in this browser.
persistLayerStyles(editor);
const styleDialog = document.querySelector<OlcadLayerStyleDialog>('olcad-layer-style-dialog')!;
styleDialog.editor = editor;
document.getElementById('layer-styles')!.addEventListener('click', () => styleDialog.open());
// Local layers (New layer in the Layers panel) are kept in this browser's IndexedDB.
void persistLocalLayers(editor).ready;
document.querySelector<OlcadFeatureTable>('olcad-feature-table')!.editor = editor;
const exportDialog = document.querySelector<OlcadExportDialog>('olcad-export-dialog')!;
exportDialog.editor = editor;
document.getElementById('export')!.addEventListener('click', () => exportDialog.open());
const importDialog = document.querySelector<OlcadImportDialog>('olcad-import-dialog')!;
importDialog.editor = editor;
document.getElementById('import')!.addEventListener('click', () => importDialog.open());
document.querySelector<OlcadTemplateList>('olcad-template-list')!.editor = editor;
document.querySelector<OlcadMeasureResults>('olcad-measure-results')!.editor = editor;
for (const toolbar of document.querySelectorAll<OlcadToolbar>('olcad-toolbar')) {
  toolbar.editor = editor;
}
document.querySelector<OlcadStraightedge>('olcad-straightedge')!.editor = editor;
document.querySelector<OlcadSnapSettings>('olcad-snap-settings')!.editor = editor;
for (const form of document.querySelectorAll<OlcadAttributeForm>('olcad-attribute-form')) {
  form.editor = editor;
}
editor.on('basemapchange', ({ id }) => console.log('basemap', id));
editor.on('editmodechange', ({ editMode }) => console.log('edit mode', editMode));
