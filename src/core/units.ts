import { get as getProjection, type ProjectionLike } from 'ol/proj';

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

export const LENGTH_UNITS: readonly LengthUnitInfo[] = [
  {
    id: 'm',
    metres: 1,
    symbol: 'm',
    label: 'Metres',
    system: 'metric',
    aliases: ['meter', 'meters', 'metre', 'metres'],
  },
  {
    id: 'km',
    metres: 1000,
    symbol: 'km',
    label: 'Kilometres',
    system: 'metric',
    aliases: ['kilometer', 'kilometers', 'kilometre', 'kilometres'],
  },
  {
    id: 'cm',
    metres: 0.01,
    symbol: 'cm',
    label: 'Centimetres',
    system: 'metric',
    aliases: ['centimeter', 'centimeters', 'centimetre', 'centimetres'],
  },
  {
    id: 'mm',
    metres: 0.001,
    symbol: 'mm',
    label: 'Millimetres',
    system: 'metric',
    aliases: ['millimeter', 'millimeters', 'millimetre', 'millimetres'],
  },
  {
    id: 'ft',
    metres: 0.3048,
    symbol: 'ft',
    label: 'Feet',
    system: 'imperial',
    aliases: ['foot', 'feet', "'"],
  },
  {
    id: 'us-ft',
    metres: 1200 / 3937,
    symbol: 'US ft',
    label: 'US survey feet',
    system: 'imperial',
    aliases: ['usft', 'ftus', 'us ft', 'survey ft', 'survey feet'],
  },
  {
    id: 'in',
    metres: 0.0254,
    symbol: 'in',
    label: 'Inches',
    system: 'imperial',
    aliases: ['inch', 'inches', '"'],
  },
  {
    id: 'yd',
    metres: 0.9144,
    symbol: 'yd',
    label: 'Yards',
    system: 'imperial',
    aliases: ['yard', 'yards'],
  },
  {
    id: 'mi',
    metres: 1609.344,
    symbol: 'mi',
    label: 'Miles',
    system: 'imperial',
    aliases: ['mile', 'miles'],
  },
  {
    id: 'nmi',
    metres: 1852,
    symbol: 'nmi',
    label: 'Nautical miles',
    system: 'imperial',
    aliases: ['nm', 'nautical mile', 'nautical miles'],
  },
];

const BY_ID = new Map(LENGTH_UNITS.map((u) => [u.id, u]));
const BY_TEXT = new Map<string, LengthUnit>();
for (const unit of LENGTH_UNITS) {
  for (const text of [unit.id, unit.symbol.toLowerCase(), ...unit.aliases])
    BY_TEXT.set(text, unit.id);
}

export function isLengthUnit(value: unknown): value is LengthUnit {
  return typeof value === 'string' && BY_ID.has(value as LengthUnit);
}

export function lengthUnitInfo(unit: LengthUnit): LengthUnitInfo {
  return BY_ID.get(unit)!;
}

/** The unit a typed word names (`ft`, `feet`, `'`, `US ft` …), case-insensitive; `null` if none. */
export function unitFromText(text: string): LengthUnit | null {
  return BY_TEXT.get(text.trim().toLowerCase().replace(/\s+/g, ' ')) ?? null;
}

/** Every accepted spelling, longest first (for building a matcher). */
export function unitSpellings(): string[] {
  return [...BY_TEXT.keys()].sort((a, b) => b.length - a.length);
}

/**
 * The length unit of a CRS: its OpenLayers units when they are a length (`m`, `ft`, `us-ft`),
 * else metres (degrees, pixels, unknown codes).
 */
export function crsLengthUnit(projection: ProjectionLike): LengthUnit {
  const units = getProjection(projection)?.getUnits();
  return units === 'ft' || units === 'us-ft' ? units : 'm';
}

export function toMetres(value: number, unit: LengthUnit): number {
  return value * lengthUnitInfo(unit).metres;
}

export function fromMetres(metres: number, unit: LengthUnit): number {
  return metres / lengthUnitInfo(unit).metres;
}

const fixed = (value: number, digits: number) => value.toFixed(digits);

/**
 * A length for display in `unit`'s system: metric in m (2 decimals) and km (3, from 1 km);
 * feet in ft (2 decimals) and mi (3, from 1 mi); any other unit in itself.
 */
export function formatLength(metres: number, unit: LengthUnit = 'm'): string {
  const info = lengthUnitInfo(unit);
  if (unit === 'm' && metres >= 1000) return `${fixed(metres / 1000, 3)} km`;
  if ((unit === 'ft' || unit === 'us-ft') && metres >= 1609.344) {
    return `${fixed(metres / 1609.344, 3)} mi`;
  }
  const digits = unit === 'mm' ? 1 : unit === 'km' || unit === 'mi' || unit === 'nmi' ? 3 : 2;
  return `${fixed(fromMetres(metres, unit), digits)} ${info.symbol}`;
}

/**
 * An area for display in `unit`'s system: metric m² (1 decimal), ha from 10 000 m², km² from
 * 1 km²; imperial ft² (1 decimal; US ft² for survey feet), ac from 1 acre, mi² from 640 acres.
 */
export function formatArea(squareMetres: number, unit: LengthUnit = 'm'): string {
  if (lengthUnitInfo(unit).system === 'metric') {
    if (squareMetres >= 1e6) return `${fixed(squareMetres / 1e6, 3)} km²`;
    if (squareMetres >= 1e4) return `${fixed(squareMetres / 1e4, 2)} ha`;
    return `${fixed(squareMetres, 1)} m²`;
  }
  const acre = 4046.8564224;
  if (squareMetres >= 640 * acre) return `${fixed(squareMetres / (640 * acre), 3)} mi²`;
  if (squareMetres >= acre) return `${fixed(squareMetres / acre, 2)} ac`;
  const foot = unit === 'us-ft' ? 'us-ft' : 'ft';
  const perSquare = lengthUnitInfo(foot).metres ** 2;
  return `${fixed(squareMetres / perSquare, 1)} ${foot === 'us-ft' ? 'US ft²' : 'ft²'}`;
}
