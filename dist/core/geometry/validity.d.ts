import { default as Geometry } from 'ol/geom/Geometry';
import { GeometryType } from '../config/types';
export type ValidityCode = 'geometry-type' | 'empty-geometry' | 'too-few-vertices' | 'ring-not-closed' | 'zero-length-segment' | 'self-intersection';
export interface ValidationIssue {
    code: ValidityCode;
    /** Message parameters, for example the expected and actual geometry type. */
    params: Record<string, string | number>;
}
/**
 * Planar validity of a geometry for a layer of `expectedType`: matching type, not empty,
 * minimum vertex counts, closed rings, no zero-length segments and no self-intersecting rings.
 * Returns the first issue found, or `null` when the geometry is valid.
 */
export declare function validateGeometry(geometry: Geometry | undefined, expectedType: GeometryType): ValidationIssue | null;
