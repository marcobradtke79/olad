import type { FieldConfig, ResolvedLayerConfig } from '../config/types';
import { LEVEL_KINDS } from './types';

/** Attributes every dimension layer offers in forms, besides its own schema. */
export const DIMENSION_FORM_FIELDS: readonly FieldConfig[] = [
  { name: 'fieldValue', type: 'number', min: 0, label: 'Field value' },
  { name: 'text', type: 'string', label: 'Text' },
];

/**
 * The attributes a form shows for a layer: its schema fields, and for a dimension layer also
 * the field value and the free text (unless the schema declares them itself); for a station
 * also its field offset, for a spot level its kind.
 */
export function layerFormFields(
  layer: Pick<ResolvedLayerConfig, 'schema' | 'dimension'>,
  feature?: { get(key: string): unknown },
): FieldConfig[] {
  const fields = [...(layer.schema?.fields ?? [])];
  if (!layer.dimension) return fields;
  const names = new Set(fields.map((field) => field.name));
  const type = feature?.get('dimType');
  const extra: FieldConfig[] = [...DIMENSION_FORM_FIELDS];
  if (type === 'station') {
    extra.splice(1, 0, { name: 'fieldOffset', type: 'number', label: 'Field offset' });
  }
  if (type === 'level') {
    extra.push({ name: 'levelKind', type: 'enum', values: [...LEVEL_KINDS], label: 'Level kind' });
  }
  return [...extra.filter((field) => !names.has(field.name)), ...fields];
}
