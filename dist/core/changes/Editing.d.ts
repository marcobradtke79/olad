import { default as Feature } from 'ol/Feature';
import { EditOperation, ResolvedChangesConfig } from '../config/types';
import { Locale } from '../i18n';
import { LayerManager } from '../layers/LayerManager';
import { ChangeTracker } from './ChangeTracker';
import { Command } from './commands';
import { ChangeSet } from './exportChangeSet';
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
}
/**
 * The command pipeline: validates commands against layer editability and geometry validity,
 * applies them to the OpenLayers sources, keeps the undo / redo stacks and feeds the change
 * tracker. Nothing else may modify features.
 */
export declare class Editing {
    readonly tracker: ChangeTracker;
    private readonly undoStack;
    private readonly redoStack;
    private readonly layers;
    private readonly options;
    private tempCounter;
    constructor(options: EditingOptions);
    /** Validate and apply a command. Returns `false` (after `validationerror`) when rejected. */
    execute(command: Command): boolean;
    canUndo(): boolean;
    canRedo(): boolean;
    undo(): boolean;
    redo(): boolean;
    getChangeSet(): ChangeSet;
    hasChanges(): boolean;
    /**
     * The host saved the change set: inserted features get their real ids from `idMap`, the
     * current state becomes the new baseline and the history is cleared.
     */
    accept(options?: {
        idMap?: Record<string, string | number>;
    }): void;
    /** Put every touched feature back into its baseline state and clear the history. */
    discard(): void;
    /** The view projection changed: move the snapshots and the history along. */
    reproject(from: string, to: string): void;
    /** A layer was removed: forget its changes; the history is cleared as a whole. */
    dropLayer(layer: string): void;
    /**
     * Whether `operation` may be applied to `feature`: the layer's editability rules, except
     * that a feature inserted and not yet accepted may always be updated and deleted (its net
     * change stays an insert, or disappears).
     */
    canEdit(operation: EditOperation, feature: Feature): boolean;
    /** Veto for the loader: do not re-add features deleted locally. */
    shouldLoad(layer: string, id: string | number): boolean;
    private reset;
    private notify;
    private validate;
    private apply;
    private isTracked;
    /** Apply a record (first time and on redo). */
    private reapply;
    private revert;
    private layerOf;
}
