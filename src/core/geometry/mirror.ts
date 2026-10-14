import type { Coordinate } from 'ol/coordinate';
import type Geometry from 'ol/geom/Geometry';
import GeometryCollection from 'ol/geom/GeometryCollection';
import LinearRing from 'ol/geom/LinearRing';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPoint from 'ol/geom/MultiPoint';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { projectOnSegment } from './segments';

/** `p` reflected across the infinite line through `a` and `b`. */
export function reflectPoint(p: Coordinate, a: Coordinate, b: Coordinate): Coordinate {
  const { foot } = projectOnSegment(p, a, b);
  return [2 * foot[0]! - p[0]!, 2 * foot[1]! - p[1]!];
}

/**
 * A copy of `geometry` reflected across the line through `a` and `b`. Polygon rings are
 * reversed after the reflection so each keeps its winding (a reflection flips orientation).
 * Throws when `a` and `b` coincide.
 */
export function mirrorGeometry(geometry: Geometry, a: Coordinate, b: Coordinate): Geometry {
  if (a[0] === b[0] && a[1] === b[1]) throw new Error('The mirror line needs two distinct points');
  const point = (c: Coordinate) => reflectPoint(c, a, b);
  const line = (cs: Coordinate[]) => cs.map(point);
  const ring = (cs: Coordinate[]) => line(cs).reverse();
  const polygon = (rings: Coordinate[][]) => rings.map(ring);
  if (geometry instanceof GeometryCollection) {
    return new GeometryCollection(
      geometry.getGeometriesArray().map((part) => mirrorGeometry(part, a, b)),
    );
  }
  const copy = geometry.clone();
  if (copy instanceof Point) copy.setCoordinates(point(copy.getCoordinates()));
  else if (copy instanceof MultiPoint) copy.setCoordinates(line(copy.getCoordinates()));
  else if (copy instanceof LinearRing) copy.setCoordinates(ring(copy.getCoordinates()));
  else if (copy instanceof LineString) copy.setCoordinates(line(copy.getCoordinates()));
  else if (copy instanceof MultiLineString) copy.setCoordinates(copy.getCoordinates().map(line));
  else if (copy instanceof Polygon) copy.setCoordinates(polygon(copy.getCoordinates()));
  else if (copy instanceof MultiPolygon) copy.setCoordinates(copy.getCoordinates().map(polygon));
  else throw new Error(`Cannot mirror a ${geometry.getType()}`);
  return copy;
}
