import { default as Feature } from 'ol/Feature';
import { default as Geometry } from 'ol/geom/Geometry';
/**
 * Commands are plain data. Tools and hosts build them with the factories below and hand them
 * to `editor.execute`, which validates, applies and records them for undo and change tracking.
 */
export type Command = InsertFeatureCommand | UpdateGeometryCommand | UpdatePropertiesCommand | DeleteFeatureCommand | CompositeCommand;
export type AtomicCommand = Exclude<Command, CompositeCommand>;
export interface InsertFeatureCommand {
    type: 'insert';
    layer: string;
    /** Feature with geometry and properties in the view projection. Gets a temporary id. */
    feature: Feature;
    /** Id of the template the feature was inserted from; such inserts open no attribute popup. */
    template?: string;
    /** Inserted by a file import (`editor.import`); such inserts open no attribute popup. */
    imported?: boolean;
}
export interface UpdateGeometryCommand {
    type: 'updateGeometry';
    feature: Feature;
    /** New geometry in the view projection. It is cloned on apply. */
    geometry: Geometry;
}
export interface UpdatePropertiesCommand {
    type: 'updateProperties';
    feature: Feature;
    /** Properties to set. `undefined` removes a property. */
    properties: Record<string, unknown>;
}
export interface DeleteFeatureCommand {
    type: 'delete';
    feature: Feature;
}
/** Several commands applied together: validated all-or-nothing, undone and redone as one step. */
export interface CompositeCommand {
    type: 'composite';
    label?: string;
    commands: Command[];
}
export declare const insertFeature: (layer: string, feature: Feature, options?: {
    template?: string;
    imported?: boolean;
}) => InsertFeatureCommand;
export declare const updateGeometry: (feature: Feature, geometry: Geometry) => UpdateGeometryCommand;
export declare const updateProperties: (feature: Feature, properties: Record<string, unknown>) => UpdatePropertiesCommand;
export declare const deleteFeature: (feature: Feature) => DeleteFeatureCommand;
export declare const composite: (commands: Command[], label?: string) => CompositeCommand;
/** The atomic commands of a command tree, in execution order. */
export declare function flatten(command: Command): AtomicCommand[];
