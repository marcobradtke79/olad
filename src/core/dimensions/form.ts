import type { FieldConfig, ResolvedLayerConfig } from '../config/types';

/** Attributes every dimension layer offers in forms, besides its own schema. */
export const DIMENSION_FORM_FIELDS: readonly FieldConfig[] = [
  { name: 'fieldValue', type: 'number', min: 0, label: 'Field value (m)' },
  { name: 'text', type: 'string', label: 'Text' },
];

/**
 * The attributes a form shows for a layer: its schema fields, and for a dimension layer also
 * the field value and the free text (unless the schema declares them itself).
 */
export function layerFormFields(
  layer: Pick<ResolvedLayerConfig, 'schema' | 'dimension'>,
): FieldConfig[] {
  const fields = [...(layer.schema?.fields ?? [])];
  if (!layer.dimension) return fields;
  const names = new Set(fields.map((field) => field.name));
  return [...DIMENSION_FORM_FIELDS.filter((field) => !names.has(field.name)), ...fields];
}
