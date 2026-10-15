export { createEditor, EDIT_MODE_CLASS } from './core/Editor';
export {
  insertFeature,
  updateGeometry,
  updateProperties,
  deleteFeature,
  composite,
} from './core/changes/commands';
export type {
  Command,
  AtomicCommand,
  InsertFeatureCommand,
  UpdateGeometryCommand,
  UpdatePropertiesCommand,
  DeleteFeatureCommand,
  CompositeCommand,
} from './core/changes/commands';
export type {
  ChangeSet,
  Change,
  InsertChange,
  UpdateChange,
  DeleteChange,
} from './core/changes/exportChangeSet';
export type { ValidationError, HistoryState } from './core/changes/Editing';
export { validateGeometry } from './core/geometry/validity';
export { mirrorGeometry, reflectPoint } from './core/geometry/mirror';
export { scaleFactor, scaleGeometry } from './core/geometry/scale';
export { textStyleFunction, textStyle, featureText } from './core/layers/text';
export { TEXT_DEFAULTS, DIMENSION_DEFAULTS, DIMENSION_PRESETS } from './core/config/defaults';
export { dimensionStyleFunction, DIMENSION_PAPER_MM } from './core/layers/dimension';
export {
  DIMENSION_TYPES,
  SUPPORTED_DIMENSION_TYPES,
  formatDimension,
  formatDimensionNumber,
  decimalSeparator,
  dimensionValues,
  fieldValueOf,
  validateDimensionFeature,
} from './core/dimensions';
export type {
  DimensionType,
  DimensionStatus,
  DimensionProperties,
  DimensionFormatOptions,
  DimensionValues,
  DimensionIssue,
} from './core/dimensions';
export {
  measureLength,
  measureArea,
  measureAngle,
  formatLength,
  formatArea,
  formatAngle,
  type LengthMeasure,
  type AreaMeasure,
  type AngleMeasure,
} from './core/measure/measurements';
export {
  computeMeasurement,
  MEASUREMENT_MIN_POINTS,
  type Measurement,
  type MeasurementKind,
  type MeasurementValues,
  type MeasurementSource,
  type MeasurementExtras,
} from './core/measure/MeasurementStore';
export {
  parallelPath,
  pathLength,
  stationOf,
  subPath,
  type ParallelPath,
  type ParallelFailure,
} from './core/geometry/parallel';
export {
  ellipseFromAxis,
  ellipseFromCentre,
  ellipseFromCorners,
  ellipsePolygon,
  type EllipseDefinition,
} from './core/geometry/ellipse';
export type { ValidationIssue, ValidityCode } from './core/geometry/validity';
export { MESSAGES, formatMessage } from './core/i18n';
export type { Locale, MessageCode } from './core/i18n';
export type {
  Editor,
  EditorEvents,
  BasemapInfo,
  BasemapsApi,
  LayersApi,
  StraightedgeApi,
  ChangesApi,
  ToolsApi,
  SelectionApi,
  SnappingApi,
  GridApi,
  ConstraintsApi,
  TemplatesApi,
  MeasurementsApi,
  LocalLayersApi,
  ImportApi,
  UnitsApi,
  InputResult,
} from './core/Editor';
export {
  crsLengthUnit,
  fromMetres,
  isLengthUnit,
  LENGTH_UNITS,
  lengthUnitInfo,
  toMetres,
  unitFromText,
} from './core/units';
export type { LengthUnit, LengthUnitInfo } from './core/units';
export { LOCAL_GEOMETRY_TYPES, LocalLayerImportError } from './core/layers/local';
export {
  flatFromStyle,
  parseColor,
  rgba,
  styleFromFlat,
  StyleError,
  styleSections,
  validateStyle,
} from './core/layers/style';
export type { LayerStyle, StrokeDash } from './core/layers/style';
export { LAYER_Z_INDEX_BASE } from './core/layers/LayerManager';
export type { LayerChangeType, LayerStylesJson } from './core/layers/LayerManager';
export { EXPORT_FORMATS, exportLayers } from './core/export/exportLayers';
export { IMPORT_FORMATS, ImportError, readImport } from './core/import/readImport';
export { applyImport, importTargets } from './core/import/applyImport';
export type {
  ImportFormat,
  ImportFormatInfo,
  ImportGroup,
  ImportPreview,
  ReadImportOptions,
} from './core/import/readImport';
export type { ImportContext, ImportResult, ImportTarget } from './core/import/applyImport';
export type {
  ExportFormat,
  ExportFormatInfo,
  ExportLayer,
  ExportOptions,
  ExportResult,
} from './core/export/exportLayers';
export type {
  LocalGeometryType,
  LocalLayerChange,
  LocalLayerDefinition,
  LocalLayerInfo,
  LocalLayersJson,
} from './core/layers/local';
export { TemplateImportError } from './core/templates';
export type {
  Template,
  TemplateFeature,
  TemplateInfo,
  TemplateJson,
  TemplateChange,
} from './core/templates';
export type { SnapResult, SnapTarget } from './core/snapping';
export { BaseTool } from './core/tools';
export {
  createHighlightStyle,
  HIGHLIGHT_LAYER_PROPERTY,
  vertexPoints,
} from './core/selection/Selection';
export {
  createLayerHighlightStyle,
  LAYER_HIGHLIGHT_PROPERTY,
  LAYER_HIGHLIGHT_Z_INDEX,
} from './core/layers/highlight';
export { constrainToAngleStep, nearestAllowedAngle } from './core/constraints';
export { parseInput } from './core/input';
export type { ParsedInput } from './core/input';
export { distanceMetres, offsetMetres, unitsPerMetre } from './core/measure';
export type { AngleConstraintResult } from './core/constraints';
export type { DrawType, InputRequest, Tool, ToolContext, ToolOptions } from './core/tools';
export type { LayerInfo } from './core/layers/LayerManager';
export type { OriginalGeometry } from './core/layers/originals';
export {
  ConfigError,
  validateConfig,
  validateBasemapConfig,
  validateLayerConfig,
} from './core/config';
export type {
  EditorConfig,
  CursorConfig,
  ChangesConfig,
  ResolvedChangesConfig,
  SelectionConfig,
  ResolvedSelectionConfig,
  LayerHighlightConfig,
  ResolvedLayerHighlightConfig,
  SnappingConfig,
  ResolvedSnappingConfig,
  SnapMode,
  GridConfig,
  ResolvedGridConfig,
  UnitsConfig,
  ResolvedUnitsConfig,
  DraftConfig,
  ResolvedDraftConfig,
  ConstraintsConfig,
  AngleConstraintConfig,
  ResolvedConstraintsConfig,
  ResolvedEditorConfig,
  ResolvedLayerConfig,
  ResolvedBasemapConfig,
  ResolvedEditableConfig,
  ViewConfig,
  ProjectionConfig,
  Proj4Instance,
  BasemapConfig,
  OsmBasemapConfig,
  XyzBasemapConfig,
  WmsBasemapConfig,
  WmtsBasemapConfig,
  VectorTileBasemapConfig,
  GeoTiffBasemapConfig,
  GeoTiffSourceConfig,
  LayerConfig,
  VectorSourceConfig,
  VectorFormat,
  VectorLoader,
  EditableConfig,
  EditOperation,
  GeometryType,
  DimensionConfig,
  ResolvedDimensionConfig,
  DimensionPreset,
  DimensionTerminator,
  SchemaConfig,
  FieldConfig,
  FieldType,
} from './core/config';
