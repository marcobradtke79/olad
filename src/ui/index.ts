import './theme.css';
import { ANGLE_PRESETS, OlcadAngleLock } from './elements/OlcadAngleLock';
import { OlcadAttributeForm } from './elements/OlcadAttributeForm';
import { OlcadDock, LAYOUT_CHANGE_EVENT, type DockLayout } from './elements/OlcadDock';
import { OlcadGridSettings } from './elements/OlcadGridSettings';
import { OlcadInputBar, type InputBarMessageKind } from './elements/OlcadInputBar';
import { OlcadProjectionSelect, projectionOptions } from './elements/OlcadProjectionSelect';
import { OlcadUnitSelect } from './elements/OlcadUnitSelect';
import { OlcadLayerList } from './elements/OlcadLayerList';
import { OlcadLayerEditor } from './elements/OlcadLayerEditor';
import { OlcadLayerStyleDialog } from './elements/OlcadLayerStyleDialog';
import { persistLayerStyles, type PersistLayerStylesOptions } from './layerStyleStorage';
import { EXPORT_EVENT, OlcadExportDialog } from './elements/OlcadExportDialog';
import { IMPORT_EVENT, OlcadImportDialog } from './elements/OlcadImportDialog';
import { downloadFile } from './download';
import { bindPanelMenu } from './panelMenu';
import {
  indexedDbStorage,
  persistLocalLayers,
  type IndexedDbStorageOptions,
  type LocalLayerPersistence,
  type LocalLayerStorage,
  type PersistLocalLayersOptions,
} from './localLayerStorage';
import {
  featureTablesOf,
  OlcadFeatureTable,
  onFeatureTableChange,
} from './elements/OlcadFeatureTable';
import { OlcadTemplateList } from './elements/OlcadTemplateList';
import { OlcadMeasureResults } from './elements/OlcadMeasureResults';
import { OlcadMenu, OlcadMenubar } from './elements/OlcadMenubar';
import {
  DOCK_CHANGE_EVENT,
  FLYOUT_TOGGLE_EVENT,
  OlcadPanel,
  type DockPosition,
  type DockSide,
  type PanelPlacement,
} from './elements/OlcadPanel';
import { OlcadSnapSettings } from './elements/OlcadSnapSettings';
import { OlcadStraightedge } from './elements/OlcadStraightedge';
import {
  OlcadToolbar,
  optionsMatch,
  TOOL_BUTTONS,
  toolButtonIds,
  toolbarControls,
  type ToolbarControl,
  type ToolButton,
} from './elements/OlcadToolbar';
import { hiddenText, setIconButton } from './elements/controls';
import { ICONS, icon, type IconName } from './icons';
import { bindKeyboard } from './keyboard';
import { installTooltips, TOOLTIP_DELAY_MS } from './tooltip';

export {
  ANGLE_PRESETS,
  OlcadAngleLock,
  OlcadAttributeForm,
  OlcadDock,
  OlcadGridSettings,
  OlcadInputBar,
  OlcadLayerList,
  OlcadLayerEditor,
  OlcadLayerStyleDialog,
  persistLayerStyles,
  OlcadExportDialog,
  EXPORT_EVENT,
  OlcadImportDialog,
  IMPORT_EVENT,
  downloadFile,
  bindPanelMenu,
  indexedDbStorage,
  persistLocalLayers,
  OlcadFeatureTable,
  featureTablesOf,
  onFeatureTableChange,
  OlcadTemplateList,
  OlcadMeasureResults,
  OlcadMenu,
  OlcadMenubar,
  OlcadProjectionSelect,
  projectionOptions,
  OlcadUnitSelect,
  OlcadPanel,
  OlcadSnapSettings,
  OlcadStraightedge,
  OlcadToolbar,
  DOCK_CHANGE_EVENT,
  FLYOUT_TOGGLE_EVENT,
  LAYOUT_CHANGE_EVENT,
  TOOL_BUTTONS,
  toolButtonIds,
  toolbarControls,
  optionsMatch,
  TOOLTIP_DELAY_MS,
  ICONS,
  bindKeyboard,
  hiddenText,
  icon,
  installTooltips,
  setIconButton,
};
export type {
  PersistLayerStylesOptions,
  IndexedDbStorageOptions,
  LocalLayerPersistence,
  LocalLayerStorage,
  PersistLocalLayersOptions,
  DockLayout,
  DockPosition,
  DockSide,
  IconName,
  InputBarMessageKind,
  PanelPlacement,
  ToolButton,
  ToolbarControl,
};

// Panels before the dock, so a dock upgraded after parsing recognises its children.
const ELEMENTS: [string, CustomElementConstructor][] = [
  ['olcad-panel', OlcadPanel],
  ['olcad-toolbar', OlcadToolbar],
  ['olcad-straightedge', OlcadStraightedge],
  ['olcad-snap-settings', OlcadSnapSettings],
  ['olcad-grid-settings', OlcadGridSettings],
  ['olcad-angle-lock', OlcadAngleLock],
  ['olcad-input-bar', OlcadInputBar],
  ['olcad-projection-select', OlcadProjectionSelect],
  ['olcad-unit-select', OlcadUnitSelect],
  ['olcad-menu', OlcadMenu],
  ['olcad-menubar', OlcadMenubar],
  ['olcad-layer-list', OlcadLayerList],
  ['olcad-layer-editor', OlcadLayerEditor],
  ['olcad-layer-style-dialog', OlcadLayerStyleDialog],
  ['olcad-export-dialog', OlcadExportDialog],
  ['olcad-import-dialog', OlcadImportDialog],
  ['olcad-feature-table', OlcadFeatureTable],
  ['olcad-template-list', OlcadTemplateList],
  ['olcad-measure-results', OlcadMeasureResults],
  ['olcad-attribute-form', OlcadAttributeForm],
  ['olcad-dock', OlcadDock],
];

/** Register every `<olcad-*>` custom element. Safe to call more than once. */
export function defineElements(): void {
  for (const [name, ctor] of ELEMENTS) {
    if (!customElements.get(name)) customElements.define(name, ctor);
  }
  installTooltips();
}
