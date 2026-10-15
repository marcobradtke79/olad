import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type { EditOperation, ResolvedChangesConfig } from '../config/types';
import { validateDimensionFeature } from '../dimensions/validate';
import { validateGeometry } from '../geometry/validity';
import { formatMessage, type Locale } from '../i18n';
import type { LayerManager } from '../layers/LayerManager';
import { ChangeTracker, featureProperties } from './ChangeTracker';
import { flatten, type AtomicCommand, type Command } from './commands';
import { exportChangeSet, type ChangeSet } from './exportChangeSet';

export interface ValidationError {
  /** Stable code, see docs/api.md. */
  code: string;
  /** Translated message. */
  message: string;
  /** The command that was rejected (the composite when inside one). */
  command: Command;
  layer?: string;
  featureId?: string | number;
}

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

export interface EditingEvents {
  change(changeSet: ChangeSet): void;
  validationerror(error: ValidationError): void;
  historychange(state: HistoryState): void;
  /** A new feature was inserted by a command (not by redo). */
  featureinsert(event: {
    layer: string;
    feature: Feature;
    template?: string;
    imported?: boolean;
  }): void;
}

export interface EditingOptions {
  layers: LayerManager;
  getProjection(): string;
  locale: Locale;
  messages: Record<string, string>;
  changes: ResolvedChangesConfig;
  events: EditingEvents;
  /**
   * Whether a layer's changes belong in the change set. Untracked layers (the draft layer)
   * still go through validation, undo / redo and the events, but never reach the tracker, so
   * `accept` and `discard` leave their features alone. Default: every layer is tracked.
   */
  isTracked?(layer: string): boolean;
  /**
   * Commands that follow from an applied command and belong to the same undo step, for example
   * associative dimensions following a moved object. Called with the applied atomic commands;
   * follow-ups that fail validation are left out without rejecting the command.
   */
  followUp?(applied: AtomicCommand[]): Command | null;
}

/** What `undo` needs to revert an applied atomic command, and `redo` to apply it again. */
type Record_ =
  | { type: 'insert'; layer: string; feature: Feature; tempId: string }
  | { type: 'updateGeometry'; feature: Feature; before: Geometry | undefined; after: Geometry }
  | {
      type: 'updateProperties';
      feature: Feature;
      before: Record<string, unknown>;
      after: Record<string, unknown>;
    }
  | { type: 'delete'; layer: string; feature: Feature }
  | { type: 'composite'; records: Record_[] };

const OPERATION_OF: Record<AtomicCommand['type'], EditOperation> = {
  insert: 'insert',
  updateGeometry: 'update',
  updateProperties: 'update',
  delete: 'delete',
};

/**
 * The command pipeline: validates commands against layer editability and geometry validity,
 * applies them to the OpenLayers sources, keeps the undo / redo stacks and feeds the change
 * tracker. Nothing else may modify features.
 */
export class Editing {
  readonly tracker = new ChangeTracker();
  private readonly undoStack: Record_[] = [];
  private readonly redoStack: Record_[] = [];
  private readonly layers: LayerManager;
  private readonly options: EditingOptions;
  private tempCounter = 0;

  constructor(options: EditingOptions) {
    this.options = options;
    this.layers = options.layers;
  }

  /** Validate and apply a command. Returns `false` (after `validationerror`) when rejected. */
  execute(command: Command): boolean {
    const atomics = flatten(command);
    for (const atomic of atomics) {
      const error = this.validate(atomic, command);
      if (error) {
        this.options.events.validationerror(error);
        return false;
      }
    }
    let record: Record_ =
      command.type === 'composite'
        ? { type: 'composite' as const, records: atomics.map((c) => this.apply(c)) }
        : this.apply(command);
    // Follow-ups (associative dimensions) join the same undo step.
    const follow = this.options.followUp?.(atomics);
    if (follow) {
      const extra = flatten(follow).filter((atomic) => this.validate(atomic, follow) === null);
      if (extra.length > 0) {
        const base = record.type === 'composite' ? record.records : [record];
        record = { type: 'composite', records: [...base, ...extra.map((c) => this.apply(c))] };
      }
    }
    this.undoStack.push(record);
    this.redoStack.length = 0;
    this.notify();
    for (const atomic of atomics) {
      if (atomic.type === 'insert') {
        this.options.events.featureinsert({
          layer: atomic.layer,
          feature: atomic.feature,
          ...(atomic.template !== undefined ? { template: atomic.template } : {}),
          ...(atomic.imported ? { imported: true } : {}),
        });
      }
    }
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): boolean {
    const record = this.undoStack.pop();
    if (!record) return false;
    this.revert(record);
    this.redoStack.push(record);
    this.notify();
    return true;
  }

  redo(): boolean {
    const record = this.redoStack.pop();
    if (!record) return false;
    this.reapply(record);
    this.undoStack.push(record);
    this.notify();
    return true;
  }

  getChangeSet(): ChangeSet {
    return exportChangeSet({
      tracker: this.tracker,
      dataProjection: (layer) => this.layers.dataProjection(layer),
      viewProjection: this.options.getProjection(),
      options: this.options.changes,
    });
  }

  hasChanges(): boolean {
    return this.tracker.hasChanges();
  }

  /**
   * The host saved the change set: inserted features get their real ids from `idMap`, the
   * current state becomes the new baseline and the history is cleared.
   */
  accept(options: { idMap?: Record<string, string | number> } = {}): void {
    const viewProjection = this.options.getProjection();
    for (const [feature, entry] of this.tracker.all()) {
      if (entry.deleted) {
        this.layers.originals.delete(feature);
        continue;
      }
      if (entry.inserted && entry.tempId !== undefined) {
        const id = options.idMap?.[entry.tempId];
        if (id !== undefined) feature.setId(id);
      }
      const geometry = feature.getGeometry();
      if (geometry) {
        const dataProjection = this.layers.dataProjection(entry.layer);
        this.layers.originals.set(
          feature,
          dataProjection,
          geometry.clone().transform(viewProjection, dataProjection),
        );
      }
    }
    this.reset();
  }

  /** Put every touched feature back into its baseline state and clear the history. */
  discard(): void {
    for (const [feature, entry] of this.tracker.all()) {
      const source = this.layers.getSource(entry.layer);
      if (entry.inserted) {
        if (source.hasFeature(feature)) source.removeFeature(feature);
        continue;
      }
      this.tracker.restore(feature);
      if (entry.deleted && !source.hasFeature(feature)) source.addFeature(feature);
    }
    this.reset();
  }

  /** The view projection changed: move the snapshots and the history along. */
  reproject(from: string, to: string): void {
    this.tracker.reproject(from, to);
    const walk = (record: Record_): void => {
      if (record.type === 'updateGeometry') {
        record.before?.transform(from, to);
        record.after.transform(from, to);
      } else if (record.type === 'composite') {
        record.records.forEach(walk);
      }
    };
    this.undoStack.forEach(walk);
    this.redoStack.forEach(walk);
  }

  /** A layer was removed: forget its changes; the history is cleared as a whole. */
  dropLayer(layer: string): void {
    this.tracker.dropLayer(layer);
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.notify();
  }

  /**
   * Whether `operation` may be applied to `feature`: the layer's editability rules, except
   * that a feature inserted and not yet accepted may always be updated and deleted (its net
   * change stays an insert, or disappears).
   */
  canEdit(operation: EditOperation, feature: Feature): boolean {
    const layer = this.layers.layerOf(feature) ?? this.tracker.entry(feature)?.layer;
    if (layer === undefined) return false;
    if (operation !== 'insert' && this.tracker.entry(feature)?.inserted) return true;
    return this.layers.canEdit(layer, operation, feature);
  }

  /** Veto for the loader: do not re-add features deleted locally. */
  shouldLoad(layer: string, id: string | number): boolean {
    return !this.tracker.isDeletedId(layer, id);
  }

  private reset(): void {
    this.tracker.clear();
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.notify();
  }

  private notify(): void {
    this.options.events.historychange({ canUndo: this.canUndo(), canRedo: this.canRedo() });
    this.options.events.change(this.getChangeSet());
  }

  private validate(atomic: AtomicCommand, command: Command): ValidationError | null {
    const fail = (
      code: string,
      params: Record<string, string | number> = {},
      layer?: string,
      featureId?: string | number,
    ): ValidationError => ({
      code,
      message: formatMessage(this.options.locale, this.options.messages, code, params),
      command,
      ...(layer !== undefined ? { layer } : {}),
      ...(featureId !== undefined ? { featureId } : {}),
    });
    const operation = OPERATION_OF[atomic.type];
    let layer: string | undefined;
    const feature = atomic.feature;
    if (atomic.type === 'insert') {
      layer = atomic.layer;
      if (!this.layers.has(layer)) return fail('layer-unknown', { layer });
    } else {
      layer = this.layers.layerOf(feature) ?? this.tracker.entry(feature)?.layer;
      if (layer === undefined) return fail('feature-not-in-layer');
      if (feature.getId() === undefined) return fail('feature-without-id', {}, layer);
    }
    const featureId = feature.getId();
    const allowed =
      atomic.type === 'insert'
        ? this.layers.canEdit(layer, 'insert')
        : this.canEdit(operation, feature);
    if (!allowed) return fail('not-editable', { layer, operation }, layer, featureId);
    const geometry =
      atomic.type === 'insert'
        ? feature.getGeometry()
        : atomic.type === 'updateGeometry'
          ? atomic.geometry
          : undefined;
    // A dimension's points follow their own rules (a station may end at the line's end, a
    // level's label may sit on its point): `validateDimensionFeature` below checks them.
    const dimensionLayer = Boolean(this.layers.getConfig(layer).dimension);
    if ((atomic.type === 'insert' || atomic.type === 'updateGeometry') && !dimensionLayer) {
      const issue = validateGeometry(geometry, this.layers.getConfig(layer).geometryType);
      if (issue) return fail(issue.code, issue.params, layer, featureId);
    }
    // Dimension layers: the object must be a dimension this version draws, with valid values.
    if (atomic.type !== 'delete' && dimensionLayer) {
      const properties = featureProperties(feature);
      if (atomic.type === 'updateProperties') {
        for (const [name, value] of Object.entries(atomic.properties)) {
          if (value === undefined) delete properties[name];
          else properties[name] = value;
        }
      }
      const issue = validateDimensionFeature(geometry ?? feature.getGeometry(), properties);
      if (issue) return fail(issue.code, issue.params, layer, featureId);
    }
    return null;
  }

  private apply(atomic: AtomicCommand): Record_ {
    switch (atomic.type) {
      case 'insert': {
        const tempId = `tmp-${++this.tempCounter}`;
        const record: Record_ = {
          type: 'insert',
          layer: atomic.layer,
          feature: atomic.feature,
          tempId,
        };
        this.reapply(record);
        return record;
      }
      case 'updateGeometry': {
        const { feature } = atomic;
        const record: Record_ = {
          type: 'updateGeometry',
          feature,
          before: feature.getGeometry()?.clone(),
          after: atomic.geometry.clone(),
        };
        this.reapply(record);
        return record;
      }
      case 'updateProperties': {
        const { feature } = atomic;
        const current = featureProperties(feature);
        const before: Record<string, unknown> = {};
        for (const name of Object.keys(atomic.properties)) before[name] = current[name];
        const record: Record_ = {
          type: 'updateProperties',
          feature,
          before,
          after: { ...atomic.properties },
        };
        this.reapply(record);
        return record;
      }
      case 'delete': {
        const layer = this.layers.layerOf(atomic.feature)!;
        const record: Record_ = { type: 'delete', layer, feature: atomic.feature };
        this.reapply(record);
        return record;
      }
    }
  }

  private isTracked(layer: string): boolean {
    return this.options.isTracked?.(layer) ?? true;
  }

  /** Apply a record (first time and on redo). */
  private reapply(record: Record_): void {
    switch (record.type) {
      case 'insert':
        record.feature.setId(record.tempId);
        this.layers.getSource(record.layer).addFeature(record.feature);
        if (this.isTracked(record.layer)) {
          this.tracker.markInserted(record.feature, record.layer, record.tempId);
        }
        break;
      case 'updateGeometry': {
        const layer = this.layerOf(record.feature);
        if (this.isTracked(layer)) this.tracker.touch(record.feature, layer);
        record.feature.setGeometry(record.after.clone());
        break;
      }
      case 'updateProperties': {
        const layer = this.layerOf(record.feature);
        if (this.isTracked(layer)) this.tracker.touch(record.feature, layer);
        setProperties(record.feature, record.after);
        break;
      }
      case 'delete':
        if (this.isTracked(record.layer)) this.tracker.markDeleted(record.feature, record.layer);
        this.layers.getSource(record.layer).removeFeature(record.feature);
        break;
      case 'composite':
        for (const inner of record.records) this.reapply(inner);
    }
  }

  private revert(record: Record_): void {
    switch (record.type) {
      case 'insert':
        this.layers.getSource(record.layer).removeFeature(record.feature);
        if (this.isTracked(record.layer)) this.tracker.unmarkInserted(record.feature);
        break;
      case 'updateGeometry':
        record.feature.setGeometry(record.before?.clone());
        break;
      case 'updateProperties':
        setProperties(record.feature, record.before);
        break;
      case 'delete':
        this.layers.getSource(record.layer).addFeature(record.feature);
        if (this.isTracked(record.layer)) this.tracker.unmarkDeleted(record.feature);
        break;
      case 'composite':
        for (const inner of [...record.records].reverse()) this.revert(inner);
    }
  }

  private layerOf(feature: Feature): string {
    return this.layers.layerOf(feature) ?? this.tracker.entry(feature)!.layer;
  }
}

/** Set properties; `undefined` removes the property. */
function setProperties(feature: Feature, properties: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(properties)) {
    if (value === undefined) feature.unset(name);
    else feature.set(name, value);
  }
}
