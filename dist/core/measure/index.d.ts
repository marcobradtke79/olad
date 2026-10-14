import { Coordinate } from 'ol/coordinate';
import { ProjectionLike } from 'ol/proj';
/** Map units per metre at `coordinate`: 1 / cos φ in EPSG:3857, about 1 in UTM. */
export declare function unitsPerMetre(projection: ProjectionLike, coordinate: Coordinate): number;
/** `coordinate` moved by `dx` metres east and `dy` metres north. */
export declare function offsetMetres(projection: ProjectionLike, coordinate: Coordinate, dx: number, dy: number): Coordinate;
/** Distance between two coordinates in metres. */
export declare function distanceMetres(projection: ProjectionLike, a: Coordinate, b: Coordinate): number;
