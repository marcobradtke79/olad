import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPoint from 'ol/geom/MultiPoint';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { describe, expect, it } from 'vitest';
import {
  insertVertexAfter,
  listVertices,
  nearestEdge,
  nearestVertex,
  removeVertex,
  setVertex,
} from './vertices';

const square = () =>
  new Polygon([
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ]);

describe('listVertices', () => {
  it('lists every vertex with its path, rings without the closing copy', () => {
    expect(listVertices(new Point([1, 2]))).toEqual([{ coordinate: [1, 2], path: [] }]);
    expect(
      listVertices(
        new MultiPoint([
          [0, 0],
          [1, 1],
        ]),
      ).map((v) => v.path),
    ).toEqual([[0], [1]]);
    expect(
      listVertices(
        new LineString([
          [0, 0],
          [5, 0],
        ]),
      ).map((v) => v.path),
    ).toEqual([[0], [1]]);
    expect(listVertices(square()).map((v) => v.path)).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ]);
    const multi = new MultiLineString([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [2, 0],
        [3, 0],
        [4, 0],
      ],
    ]);
    expect(listVertices(multi).map((v) => v.path)).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
    ]);
    const polygons = new MultiPolygon([square().getCoordinates(), square().getCoordinates()]);
    expect(listVertices(polygons)).toHaveLength(8);
    expect(listVertices(polygons)[7]!.path).toEqual([1, 0, 3]);
  });
});

describe('nearestVertex and nearestEdge', () => {
  it('finds the closest vertex within the tolerance', () => {
    expect(nearestVertex(square(), [9, 1], 2)).toEqual({ coordinate: [10, 0], path: [0, 1] });
    expect(nearestVertex(square(), [5, 5], 2)).toBeNull();
    expect(nearestVertex(new Point([3, 3]), [3.5, 3], 1)).toEqual({ coordinate: [3, 3], path: [] });
  });

  it('finds the closest segment and the foot of the perpendicular on it', () => {
    expect(nearestEdge(square(), [4, -1], 2)).toEqual({ path: [0, 0], foot: [4, 0] });
    expect(nearestEdge(square(), [11, 4], 2)).toEqual({ path: [0, 1], foot: [10, 4] });
    // Beyond the end of a segment the foot is clamped to the vertex.
    expect(
      nearestEdge(
        new LineString([
          [0, 0],
          [10, 0],
        ]),
        [12, 0],
        3,
      ),
    ).toEqual({ path: [0], foot: [10, 0] });
    expect(nearestEdge(square(), [5, 5], 2)).toBeNull();
    expect(nearestEdge(new MultiPoint([[0, 0]]), [0, 0], 5)).toBeNull();
  });
});

describe('setVertex, insertVertexAfter, removeVertex', () => {
  it('return copies and keep rings closed', () => {
    const polygon = square();
    const moved = setVertex(polygon, [0, 0], [1, 1]) as Polygon;
    expect(moved.getCoordinates()[0]).toEqual([
      [1, 1],
      [10, 0],
      [10, 10],
      [0, 10],
      [1, 1],
    ]);
    expect(polygon.getCoordinates()[0]![0]).toEqual([0, 0]); // untouched
    const inserted = insertVertexAfter(polygon, [0, 3], [0, 5]) as Polygon;
    expect(inserted.getCoordinates()[0]).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 5],
      [0, 0],
    ]);
    const removed = removeVertex(polygon, [0, 0]) as Polygon;
    expect(removed.getCoordinates()[0]).toEqual([
      [10, 0],
      [10, 10],
      [0, 10],
      [10, 0],
    ]);
  });

  it('edit lines, multi geometries and points', () => {
    const line = new LineString([
      [0, 0],
      [10, 0],
    ]);
    expect((setVertex(line, [1], [10, 5]) as LineString).getCoordinates()).toEqual([
      [0, 0],
      [10, 5],
    ]);
    expect((insertVertexAfter(line, [0], [5, 0]) as LineString).getCoordinates()).toEqual([
      [0, 0],
      [5, 0],
      [10, 0],
    ]);
    expect((removeVertex(line, [0]) as LineString).getCoordinates()).toEqual([[10, 0]]);
    const multi = new MultiLineString([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [2, 0],
        [3, 0],
      ],
    ]);
    expect((setVertex(multi, [1, 1], [3, 3]) as MultiLineString).getCoordinates()[1]).toEqual([
      [2, 0],
      [3, 3],
    ]);
    const polygons = new MultiPolygon([square().getCoordinates()]);
    const edited = setVertex(polygons, [0, 0, 2], [12, 12]) as MultiPolygon;
    expect(edited.getCoordinates()[0]![0]![2]).toEqual([12, 12]);
    expect((setVertex(new Point([0, 0]), [], [4, 4]) as Point).getCoordinates()).toEqual([4, 4]);
  });
});
