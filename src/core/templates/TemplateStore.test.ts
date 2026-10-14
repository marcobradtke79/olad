// @vitest-environment jsdom
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { describe, expect, it, vi } from 'vitest';
import { unitsPerMetre } from '../measure';
import { TemplateImportError, TemplateStore } from './TemplateStore';

const road = () =>
  new Feature({
    id: 7,
    name: 'Main',
    tags: { lanes: 2 },
    geometry: new LineString([
      [100, 100],
      [200, 100],
    ]),
  });
const hydrant = () => new Feature({ pressure: 4, geometry: new Point([150, 120]) });

function store() {
  const onChange = vi.fn();
  return { store: new TemplateStore(onChange), onChange };
}

describe('TemplateStore', () => {
  it('stores deep copies without geometry and id properties', () => {
    const { store: s, onChange } = store();
    const source = road();
    const id = s.create(
      [
        { feature: source, layer: 'roads', idProperty: 'id' },
        { feature: hydrant(), layer: 'hydrants' },
      ],
      [100, 100],
    );
    expect(onChange).toHaveBeenLastCalledWith({ id, type: 'add' });
    expect(s.list()).toEqual([
      { id, name: 'Template 1', featureCount: 2, layers: ['roads', 'hydrants'] },
    ]);
    const template = s.get(id)!;
    expect(template.features[0]!.properties).toEqual({ name: 'Main', tags: { lanes: 2 } });
    // Later edits of the source do not reach the template.
    (source.getGeometry() as LineString).translate(5, 5);
    (source.get('tags') as { lanes: number }).lanes = 4;
    expect((template.features[0]!.geometry as LineString).getFirstCoordinate()).toEqual([100, 100]);
    expect(template.features[0]!.properties.tags).toEqual({ lanes: 2 });
    expect(() => s.create([], [0, 0])).toThrow('at least one object');
  });

  it('suggests, keeps and changes names; removes templates', () => {
    const { store: s, onChange } = store();
    const a = s.create([{ feature: hydrant(), layer: 'h' }], [0, 0]);
    const b = s.create([{ feature: hydrant(), layer: 'h' }], [0, 0], '  Plot  ');
    expect(s.get(b)!.name).toBe('Plot');
    expect(s.suggestName()).toBe('Template 2');
    s.rename(a, 'Lamp group');
    expect(onChange).toHaveBeenLastCalledWith({ id: a, type: 'rename' });
    expect(s.suggestName()).toBe('Template 1');
    expect(() => s.rename(a, '  ')).toThrow('empty');
    s.remove(b);
    expect(onChange).toHaveBeenLastCalledWith({ id: b, type: 'remove' });
    expect(s.list().map((t) => t.name)).toEqual(['Lamp group']);
    expect(() => s.remove('nope')).toThrow('Unknown template');
  });

  it('places copies with the base point at the target, keeping metres in Web Mercator', () => {
    const { store: s } = store();
    const base = fromLonLat([8.4, 49]);
    const line = new Feature(new LineString([base, [base[0]! + 100, base[1]!]]));
    const id = s.create([{ feature: line, layer: 'roads' }], base);
    const template = s.get(id)!;
    // Same latitude: a plain translation.
    const near = [base[0]! + 500, base[1]!];
    const [moved] = s.placed(template, near, 'EPSG:3857') as LineString[];
    expect(moved!.getCoordinates()[0]).toEqual(near);
    expect(moved!.getCoordinates()[1]![0]).toBeCloseTo(near[0]! + 100, 6);
    // Further north the same metres need more map units.
    const north = fromLonLat([8.4, 60]);
    const [far] = s.placed(template, north, 'EPSG:3857') as LineString[];
    const expected = (100 * unitsPerMetre('EPSG:3857', north)) / unitsPerMetre('EPSG:3857', base);
    expect(far!.getLength()).toBeCloseTo(expected, 6);
    expect(far!.getCoordinates()[0]![0]).toBeCloseTo(north[0]!, 6);
    // The stored geometry is untouched.
    expect((template.features[0]!.geometry as LineString).getFirstCoordinate()).toEqual(base);
  });

  it('reprojects stored geometries and the base point', () => {
    const { store: s } = store();
    const base = fromLonLat([8.4, 49]);
    const id = s.create([{ feature: new Feature(new Point(base)), layer: 'h' }], base);
    s.reproject('EPSG:3857', 'EPSG:4326');
    const template = s.get(id)!;
    expect(template.base[0]).toBeCloseTo(8.4, 9);
    expect((template.features[0]!.geometry as Point).getCoordinates()[1]).toBeCloseTo(49, 9);
  });

  it('exports plain JSON in EPSG:4326 and imports it back', () => {
    const { store: s, onChange } = store();
    const base = fromLonLat([8.4, 49]);
    const feature = new Feature({
      name: 'A',
      geometry: new LineString([base, fromLonLat([8.401, 49])]),
    });
    const id = s.create([{ feature, layer: 'roads' }], base, 'Road piece');
    const json = s.export('EPSG:3857');
    expect(JSON.parse(JSON.stringify(json))).toEqual(json);
    expect(json[0]).toMatchObject({ version: 1, id, name: 'Road piece', crs: 'EPSG:4326' });
    expect(json[0]!.base[0]).toBeCloseTo(8.4, 9);
    expect(json[0]!.features[0]).toMatchObject({
      layer: 'roads',
      properties: { name: 'A' },
      geometry: { type: 'LineString' },
    });

    const other = new TemplateStore(onChange);
    const [copy] = other.import(JSON.parse(JSON.stringify(json)), 'EPSG:3857');
    expect(copy).toBe(id);
    expect(onChange).toHaveBeenLastCalledWith({ id: null, type: 'import' });
    const restored = other.get(copy!)!;
    expect(restored.base[0]).toBeCloseTo(base[0]!, 6);
    expect((restored.features[0]!.geometry as LineString).getLength()).toBeCloseTo(
      (feature.getGeometry() as LineString).getLength(),
      6,
    );
    // An id that exists already gets a fresh one.
    const [again] = other.import(json, 'EPSG:3857');
    expect(again).not.toBe(id);
    expect(other.list()).toHaveLength(2);
  });

  it('rejects malformed imports with the offending path and adds nothing', () => {
    const { store: s } = store();
    const path = (json: unknown) => {
      try {
        s.import(json, 'EPSG:3857');
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateImportError);
        return (error as TemplateImportError).path;
      }
      return null;
    };
    const valid = {
      version: 1,
      name: 'T',
      base: [8, 49],
      features: [{ layer: 'h', geometry: { type: 'Point', coordinates: [8, 49] } }],
    };
    expect(path({})).toBe('templates');
    expect(path([{ ...valid, version: 2 }])).toBe('templates[0].version');
    expect(path([valid, { ...valid, name: '' }])).toBe('templates[1].name');
    expect(path([{ ...valid, base: [8] }])).toBe('templates[0].base');
    expect(path([{ ...valid, crs: 'EPSG:3857' }])).toBe('templates[0].crs');
    expect(path([{ ...valid, features: [] }])).toBe('templates[0].features');
    expect(path([{ ...valid, features: [{ layer: 1 }] }])).toBe('templates[0].features[0].layer');
    expect(path([{ ...valid, features: [{ layer: 'h', geometry: { type: 'Nope' } }] }])).toBe(
      'templates[0].features[0].geometry',
    );
    expect(s.list()).toEqual([]);
    expect(path([valid])).toBeNull();
    expect(s.list()).toHaveLength(1);
  });
});
