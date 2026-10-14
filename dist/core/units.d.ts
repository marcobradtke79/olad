import { ProjectionLike } from 'ol/proj';
/** Length units the editor reads and writes. */
export type LengthUnit = 'm' | 'km' | 'cm' | 'mm' | 'ft' | 'us-ft' | 'in' | 'yd' | 'mi' | 'nmi';
export interface LengthUnitInfo {
    id: LengthUnit;
    /** Metres per unit. */
    metres: number;
    /** Symbol shown after numbers. */
    symbol: string;
    /** Name for selects. */
    label: string;
    system: 'metric' | 'imperial';
    /** Spellings accepted in typed input (lower case), besides the id and the symbol. */
    aliases: string[];
}
export declare const LENGTH_UNITS: readonly LengthUnitInfo[];
export declare function isLengthUnit(value: unknown): value is LengthUnit;
export declare function lengthUnitInfo(unit: LengthUnit): LengthUnitInfo;
/** The unit a typed word names (`ft`, `feet`, `'`, `US ft` …), case-insensitive; `null` if none. */
export declare function unitFromText(text: string): LengthUnit | null;
/** Every accepted spelling, longest first (for building a matcher). */
export declare function unitSpellings(): string[];
/**
 * The length unit of a CRS: its OpenLayers units when they are a length (`m`, `ft`, `us-ft`),
 * else metres (degrees, pixels, unknown codes).
 */
export declare function crsLengthUnit(projection: ProjectionLike): LengthUnit;
export declare function toMetres(value: number, unit: LengthUnit): number;
export declare function fromMetres(metres: number, unit: LengthUnit): number;
/**
 * A length for display in `unit`'s system: metric in m (2 decimals) and km (3, from 1 km);
 * feet in ft (2 decimals) and mi (3, from 1 mi); any other unit in itself.
 */
export declare function formatLength(metres: number, unit?: LengthUnit): string;
/**
 * An area for display in `unit`'s system: metric m² (1 decimal), ha from 10 000 m², km² from
 * 1 km²; imperial ft² (1 decimal; US ft² for survey feet), ac from 1 acre, mi² from 640 acres.
 */
export declare function formatArea(squareMetres: number, unit?: LengthUnit): string;
