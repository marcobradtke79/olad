/** Every dimension type of the concept; milestone D1 draws and accepts `aligned` only. */
export const DIMENSION_TYPES = [
  'aligned',
  'rotated',
  'running',
  'tie',
  'angular',
  'radius',
  'diameter',
  'arc',
  'station',
  'level',
  'slope',
] as const;

export type DimensionType = (typeof DIMENSION_TYPES)[number];

/** The types the editor accepts and draws so far. */
export const SUPPORTED_DIMENSION_TYPES: readonly DimensionType[] = [
  'aligned',
  'rotated',
  'running',
  'tie',
];

/** `stale`: a measured object changed (planned); `deviates`: field and GIS value differ beyond the tolerance. */
export type DimensionStatus = 'ok' | 'stale' | 'deviates';

/** Properties of a dimension object. Values are metres; the geometry holds the definition points. */
export interface DimensionProperties {
  /** Dimension type. A two-point line without it is an `aligned` dimension. */
  dimType?: DimensionType;
  /** Direction of a `rotated` or `running` dimension in degrees, counter-clockwise from the x-axis. */
  rotation?: number;
  /** Signed distance of the dimension line from the measured points in metres, left of p1 → p2 positive. */
  offset?: number;
  /** Shift of the value along the dimension line from its middle, in metres; `null` = centred. */
  textPosition?: number | null;
  /** GIS value as computed when the dimension was last measured (written by the tools). */
  gisValue?: number | null;
  /** Field measurement in metres, or `null`. */
  fieldValue?: number | null;
  /** Free text replacing the value; `{value}` inserts it. */
  text?: string | null;
  /** Group id of a chain or baseline set. */
  chain?: string | null;
  /** References to the measured objects (planned). */
  refs?: unknown;
  /** Status as last stored. */
  status?: DimensionStatus;
}
