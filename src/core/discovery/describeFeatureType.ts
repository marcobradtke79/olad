import type { FieldConfig, FieldType, GeometryType } from '../config/types';
import { children, descendants, firstChild, localPart, parseXml } from '../xml';
import { serviceException } from './serviceError';

export interface DescribedFeatureType {
  /** The feature element's name, without prefix. */
  name: string;
  /** The first geometry property and its geometry type. */
  geometry?: { property: string; geometryType: GeometryType };
  /** Every geometry property (the first one is `geometry`). */
  geometryProperties: string[];
  /** The other properties as schema fields. */
  fields: FieldConfig[];
}

const GEOMETRY_TYPES: Record<string, GeometryType> = {
  Point: 'Point',
  MultiPoint: 'MultiPoint',
  LineString: 'LineString',
  Curve: 'LineString',
  MultiLineString: 'MultiLineString',
  MultiCurve: 'MultiLineString',
  Polygon: 'Polygon',
  Surface: 'Polygon',
  MultiPolygon: 'MultiPolygon',
  MultiSurface: 'MultiPolygon',
  Geometry: 'Any',
  MultiGeometry: 'Any',
  GeometryCollection: 'Any',
};

/** The geometry type of a GML property type (`gml:MultiSurfacePropertyType`), else `undefined`. */
export function geometryTypeOf(type: string): GeometryType | undefined {
  const local = localPart(type);
  if (!local.endsWith('PropertyType')) return undefined;
  return GEOMETRY_TYPES[local.slice(0, -'PropertyType'.length)];
}

/** The field type of an XML Schema simple type; unknown types read as strings. */
export function fieldTypeOf(type: string): FieldType {
  const local = localPart(type);
  if (
    /^(int|integer|long|short|byte)$/.test(local) ||
    /Integer$/.test(local) ||
    /^unsigned/.test(local)
  ) {
    return 'integer';
  }
  if (/^(double|float|decimal)$/.test(local)) return 'number';
  if (local === 'boolean') return 'boolean';
  if (local === 'date') return 'date';
  return 'string';
}

/**
 * Read a DescribeFeatureType answer (an XML Schema): one entry per top-level element whose
 * complex type has a sequence of elements.
 */
export function readDescribeFeatureType(xml: string): DescribedFeatureType[] {
  const schema = parseXml(xml).documentElement;
  const exception = serviceException(schema);
  if (exception) throw new Error(exception);
  if (schema.localName !== 'schema') throw new Error('not an XML Schema document');
  const complexTypes = new Map(
    children(schema, 'complexType').map((t) => [t.getAttribute('name') ?? '', t]),
  );
  return children(schema, 'element').flatMap((element) => {
    const name = element.getAttribute('name');
    if (!name) return [];
    const type =
      firstChild(element, 'complexType') ??
      complexTypes.get(localPart(element.getAttribute('type') ?? ''));
    if (!type) return [];
    const described: DescribedFeatureType = { name, geometryProperties: [], fields: [] };
    for (const sequence of descendants(type, 'sequence')) {
      for (const property of children(sequence, 'element')) readProperty(property, described);
    }
    return [described];
  });
}

function readProperty(property: Element, described: DescribedFeatureType): void {
  const name = property.getAttribute('name') ?? localPart(property.getAttribute('ref') ?? '');
  if (!name) return;
  const typeName = property.getAttribute('type') ?? '';
  const geometryType = geometryTypeOf(typeName);
  if (geometryType) {
    described.geometryProperties.push(name);
    described.geometry ??= { property: name, geometryType };
    return;
  }
  const field: FieldConfig = { name, type: 'string' };
  const restriction = descendants(property, 'restriction')[0];
  if (restriction) {
    field.type = fieldTypeOf(restriction.getAttribute('base') ?? '');
    const values = children(restriction, 'enumeration')
      .map((e) => e.getAttribute('value'))
      .filter((v): v is string => v !== null);
    if (values.length > 0) {
      field.values = field.type === 'string' ? values : values.map(Number);
      field.type = 'enum';
    }
  } else {
    field.type = fieldTypeOf(typeName);
  }
  if (property.getAttribute('nillable') === 'false' && property.getAttribute('minOccurs') !== '0') {
    field.required = true;
  }
  described.fields.push(field);
}
