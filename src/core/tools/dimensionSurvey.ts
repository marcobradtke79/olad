import Feature from 'ol/Feature';
import type { Coordinate } from 'ol/coordinate';
import { buffer, boundingExtent } from 'ol/extent';
import LineString from 'ol/geom/LineString';
import { referenceFor, type DimensionReference } from '../dimensions/references';
import { dimensionValues, finiteOf } from '../dimensions/values';
import { measureLength } from '../measure/measurements';
import { unitsPerMetre } from '../measure';
import { DimensionToolBase } from './dimensionBase';
import { pickTolerance } from './pointer';
import type { InputRequest, ToolContext, ToolOptions } from './Tool';

/** Variants of the survey dimension tool (`ToolOptions.method`). */
export const DIMENSION_SURVEY_METHODS = ['station', 'level', 'slope'] as const;
export type DimensionSurveyMethod = (typeof DIMENSION_SURVEY_METHODS)[number];

export type DimensionSurveyStep =
  | 'lineStart'
  | 'lineEnd'
  | 'point'
  | 'value'
  | 'endValue'
  | 'levelPoint'
  | 'levelLabel'
  | 'height'
  | 'slopeStart'
  | 'slopeEnd'
  | 'slopeValue';

/** Prompt shown by the input bar for each step; `{gis}` is the measured value. */
export const DIMENSION_SURVEY_PROMPTS: Record<DimensionSurveyStep, string> = {
  lineStart: 'Start of the measuring line: click (snaps to boundary marks and corners) or type x,y',
  lineEnd: 'End of the measuring line',
  point:
    'Point to record by station and offset: click or type; Enter writes the end measure, Escape ends',
  value:
    'Field values: station and offset in {unit} (e.g. 12.47 3.05), or the station only [Enter keeps {gis}]',
  endValue: 'End measure: field value in {unit} [Enter keeps {gis}]',
  levelPoint: 'Point of the spot level: click or type x,y',
  levelLabel: 'Position of the height label: click [Enter puts it beside the point]',
  height: 'Height in metres (e.g. 112.45 or -0.15)',
  slopeStart: 'Click the upper spot level, or the start of a slope arrow',
  slopeEnd: 'Click the lower spot level, or the end of the arrow (downhill)',
  slopeValue: 'Slope in % [Enter keeps {gis}]',
};

/** The method named by the options (the default when none), or `null` for an unknown one. */
export function dimensionSurveyMethod(options: ToolOptions = {}): DimensionSurveyMethod | null {
  if (options.method === undefined) return 'station';
  return (DIMENSION_SURVEY_METHODS as readonly string[]).includes(options.method)
    ? (options.method as DimensionSurveyMethod)
    : null;
}

let lineCounter = 0;

/** A spot level of the active layer picked for a slope. */
interface PickedLevel {
  feature: Feature;
  point: Coordinate;
  height: number;
}

/**
 * Survey and landscape dimensions in the active dimension layer. `station`: a measuring line
 * (start, end), then every point by its station along the line and its perpendicular offset,
 * with both field values typed in one entry; Enter writes the end measure. `level`: a spot
 * level (point, label position, height). `slope`: from two spot levels (the percentage from
 * their heights and distance; the arrow points downhill) or a free arrow with a typed
 * percentage.
 */
export class DimensionSurveyTool extends DimensionToolBase {
  readonly id = 'dimension-survey';
  private method: DimensionSurveyMethod = 'station';
  private step: DimensionSurveyStep = 'lineStart';
  private points: Coordinate[] = [];
  private refs: (DimensionReference | null)[] = [];
  /** Id shared by the points of one measuring line. */
  private chain: string | null = null;
  private levels: PickedLevel[] = [];

  override canActivate(ctx: ToolContext, options?: ToolOptions): boolean {
    return dimensionSurveyMethod(options) !== null && super.canActivate(ctx, options);
  }

  override getOptions(): ToolOptions {
    return { ...this.options, method: this.method };
  }

  override getInputRequest(): InputRequest {
    return ['value', 'endValue', 'height', 'slopeValue'].includes(this.step) ? 'value' : null;
  }

  override getPrompt(): string {
    return DIMENSION_SURVEY_PROMPTS[this.step].replace('{gis}', this.formattedGis());
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.method = dimensionSurveyMethod(options) ?? 'station';
    super.activate(ctx, options);
  }

  protected reset(): void {
    this.points = [];
    this.refs = [];
    this.levels = [];
    this.chain = null;
    this.goTo(
      this.method === 'station'
        ? 'lineStart'
        : this.method === 'level'
          ? 'levelPoint'
          : 'slopeStart',
    );
  }

  override cancel(): void {
    this.reset();
  }

  /** Enter: keeps the GIS value, writes the end measure, or puts a level's label beside it. */
  override finish(): void {
    switch (this.step) {
      case 'value':
        this.insertStation(null, null);
        return;
      case 'point':
        this.points = [this.points[0]!, this.points[1]!, this.points[1]!];
        this.refs = [this.refs[0] ?? null, this.refs[1] ?? null, this.refs[1] ?? null];
        this.goTo('endValue');
        return;
      case 'endValue':
        this.insert(null, null, this.stationExtras());
        return;
      case 'levelLabel':
        this.setLabel(null);
        return;
      case 'slopeValue':
        if (this.levels.length === 2) this.insert(null, null, this.slopeExtras());
        return;
      default:
    }
  }

  override removeLastPoint(): boolean {
    switch (this.step) {
      case 'lineEnd':
      case 'levelLabel':
      case 'slopeEnd':
        this.reset();
        return true;
      case 'point':
        this.points = [this.points[0]!];
        this.refs = [this.refs[0] ?? null];
        this.goTo('lineEnd');
        return true;
      case 'value':
      case 'endValue':
        this.points = this.points.slice(0, 2);
        this.refs = this.refs.slice(0, 2);
        this.goTo('point');
        return true;
      case 'height':
        this.points = this.points.slice(0, 1);
        this.goTo('levelLabel');
        return true;
      case 'slopeValue':
        this.points = this.points.slice(0, 1);
        this.levels = this.levels.slice(0, 1);
        this.goTo('slopeEnd');
        return true;
      default:
        return false;
    }
  }

  override handleInput(coordinate: number[]): boolean {
    if (this.getInputRequest() !== null) return false;
    this.onClick(coordinate, coordinate);
    return true;
  }

  /** A plain number: the station, the end measure, a height or a slope. */
  override handleValue(value: number): boolean {
    switch (this.step) {
      case 'value':
        this.insertStation(value, null);
        return true;
      case 'endValue':
        this.insert(value, null, this.stationExtras());
        return true;
      case 'height':
        this.insert(value, null, { levelKind: this.defaultKind() });
        return true;
      case 'slopeValue':
        this.insert(value, null, this.slopeExtras());
        return true;
      default:
        return false;
    }
  }

  /** A length with a unit: the station, the end measure or a height, in metres. */
  override handleLength(metres: number): boolean {
    return ['value', 'endValue', 'height'].includes(this.step) && this.handleValue(metres);
  }

  /** `station offset` in one entry (space separated), or `t <text>`. */
  override handleText(text: string): boolean {
    if (this.step === 'value') {
      const pair = /^\s*(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)\s*$/.exec(text);
      if (pair) {
        this.insertStation(Number(pair[1]!.replace(',', '.')), Number(pair[2]!.replace(',', '.')));
        return true;
      }
    }
    if (this.getInputRequest() === null) return false;
    const free = this.freeText(text);
    if (free === null) return false;
    if (this.step === 'value') {
      const line = this.keepLine();
      this.insert(null, free, this.stationExtras());
      line();
    } else if (this.step === 'endValue') {
      this.insert(null, free, this.stationExtras());
    } else this.insert(null, free, this.method === 'slope' ? this.slopeExtras() : {});
    return true;
  }

  /** Relative input from the measuring line's start, the level's point or the arrow's start. */
  override referencePoint(): number[] | null {
    return this.points[0] ?? null;
  }

  protected picked(): Coordinate[] {
    return this.points;
  }

  protected dimension(): Feature | null {
    if (this.method === 'station' && this.points.length === 3) {
      return new Feature({ geometry: new LineString(this.points), dimType: 'station' });
    }
    if (this.method === 'slope' && this.points.length === 2) {
      const [from, to] = this.levels;
      const gis = from && to ? this.slopeOf(from, to) : null;
      return new Feature({
        geometry: new LineString(this.points),
        dimType: 'slope',
        ...(gis === null ? {} : { gisValue: Math.round(gis * 1000) / 1000 }),
      });
    }
    if (this.method === 'level' && this.points.length === 2) {
      return new Feature({ geometry: new LineString(this.points), dimType: 'level' });
    }
    return null;
  }

  protected onClick(coordinate: Coordinate, raw: Coordinate): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const ref = referenceFor(ctx.getSnap?.() ?? null, coordinate);
    switch (this.step) {
      case 'lineStart':
      case 'levelPoint':
        this.points = [coordinate];
        this.refs = [ref];
        this.goTo(this.step === 'lineStart' ? 'lineEnd' : 'levelLabel');
        return;
      case 'lineEnd': {
        const start = this.points[0]!;
        if (start[0] === coordinate[0] && start[1] === coordinate[1]) return;
        this.points = [start, coordinate];
        this.refs = [this.refs[0] ?? null, ref];
        this.chain = `s-${Date.now().toString(36)}-${++lineCounter}`;
        this.goTo('point');
        return;
      }
      case 'point':
        this.points = [this.points[0]!, this.points[1]!, coordinate];
        this.refs = [this.refs[0] ?? null, this.refs[1] ?? null, ref];
        this.goTo('value');
        return;
      case 'levelLabel':
        this.setLabel(coordinate);
        return;
      case 'slopeStart':
      case 'slopeEnd': {
        const level = this.pickLevel(ctx, raw);
        if (this.step === 'slopeStart') {
          this.levels = level ? [level] : [];
          this.points = [level ? level.point : coordinate];
          this.goTo('slopeEnd');
          return;
        }
        if (this.levels.length === 1) {
          // From level to level: the arrow runs downhill.
          if (!level || level.feature === this.levels[0]!.feature) return;
          const [a, b] = [this.levels[0]!, level];
          const [high, low] = a.height >= b.height ? [a, b] : [b, a];
          this.levels = [high, low];
          this.points = [high.point, low.point];
        } else {
          const start = this.points[0]!;
          if (start[0] === coordinate[0] && start[1] === coordinate[1]) return;
          this.points = [start, coordinate];
        }
        this.goTo('slopeValue');
        return;
      }
      default:
    }
  }

  protected onMove(): void {
    this.refresh();
  }

  /** The station dimension's offset and line id (end measure included). */
  private stationExtras(): Record<string, unknown> {
    const refs = this.refs;
    return {
      chain: this.chain,
      ...(refs.some((r) => r !== null)
        ? { refs: [refs[0] ?? null, refs[1] ?? null, refs[2] ?? null] }
        : {}),
    };
  }

  /** Insert a station point; a typed offset takes the side of the measured one. */
  private insertStation(station: number | null, offset: number | null): void {
    const ctx = this.ctx;
    const target = this.target();
    const drawn = this.dimension();
    if (!ctx || !target || !drawn) return;
    const values = dimensionValues(drawn, target.layer.dimension, ctx.getProjection());
    const side = Math.sign(values?.second?.gis ?? 1) || 1;
    const line = this.keepLine();
    this.insert(station, null, {
      ...this.stationExtras(),
      gisOffset: values?.second ? Math.round(values.second.gis * 1e6) / 1e6 : null,
      ...(offset === null ? {} : { fieldOffset: side * Math.abs(offset) }),
    });
    line();
  }

  /**
   * The measuring line as it is now, and a function that restores it after an insert (which
   * resets the tool), so the next point of the same line can be recorded.
   */
  private keepLine(): () => void {
    const points = this.points.slice(0, 2);
    const refs = this.refs.slice(0, 2);
    const chain = this.chain;
    return () => {
      this.points = points;
      this.refs = refs;
      this.chain = chain;
      this.goTo('point');
    };
  }

  /** A derived slope references the two spot levels it was computed from. */
  private slopeExtras(): Record<string, unknown> {
    const target = this.target();
    const ids = this.levels.map((level) => level.feature.getId());
    if (!target || this.levels.length !== 2 || ids.some((id) => id === undefined)) return {};
    return {
      refs: ids.map((id) => ({ layer: target.layerId, id: id!, kind: 'vertex', path: [0] })),
    };
  }

  /** Put the level's label at `at`, or 2 mm (paper) beside the point. */
  private setLabel(at: Coordinate | null): void {
    const ctx = this.ctx;
    const target = this.target();
    const point = this.points[0];
    if (!ctx || !target || !point) return;
    const beside =
      (2 / 1000) *
      target.layer.dimension.referenceScale *
      unitsPerMetre(ctx.getProjection(), point);
    this.points = [point, at ?? [point[0]! + beside, point[1]! + beside]];
    this.goTo('height');
  }

  private defaultKind(): string {
    return this.target()?.layer.dimension.preset === 'architecture' ? 'finished' : 'existing';
  }

  /** Slope in percent between two levels: height difference over the horizontal distance. */
  private slopeOf(a: PickedLevel, b: PickedLevel): number | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const distance = measureLength(ctx.getProjection(), [a.point, b.point]).total;
    return distance > 0 ? (Math.abs(a.height - b.height) / distance) * 100 : null;
  }

  /** The spot level of the active dimension layer whose point is under the raw pointer. */
  private pickLevel(ctx: ToolContext, raw: Coordinate): PickedLevel | null {
    const target = this.target();
    if (!target) return null;
    const tolerance = pickTolerance(ctx);
    const extent = buffer(boundingExtent([raw]), tolerance);
    let best: PickedLevel | null = null;
    let bestDistance = tolerance;
    ctx.layers.getSource(target.layerId).forEachFeatureInExtent(extent, (feature) => {
      if (feature.get('dimType') !== 'level') return;
      const point = (feature.getGeometry() as LineString | undefined)?.getFirstCoordinate();
      const height = finiteOf(feature.get('fieldValue'));
      if (!point || height === null) return;
      const distance = Math.hypot(point[0]! - raw[0]!, point[1]! - raw[1]!);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = { feature, point, height };
      }
    });
    return best;
  }

  private goTo(step: DimensionSurveyStep): void {
    this.step = step;
    this.refresh(true);
  }
}
