import { Command } from '../changes/commands';
import { ResolvedLayerConfig } from '../config/types';
import { LocalLayerDefinition } from '../layers/local';
import { ImportGroup, ImportPreview } from './readImport';
/** Where the objects of one group go. */
export type ImportTarget = {
    type: 'new';
    title?: string;
} | {
    type: 'layer';
    id: string;
} | {
    type: 'skip';
};
export interface ImportResult {
    /** Local layers created for the import. */
    created: string[];
    /** Objects inserted. */
    inserted: number;
    /** Objects not imported: no usable geometry, invalid geometry, or a skipped group. */
    skipped: number;
    /** Attribute names left out because the target layer's schema lacks them. */
    droppedAttributes: string[];
}
/** What the import needs from the editor. */
export interface ImportContext {
    listLayers(): {
        id: string;
    }[];
    getConfig(id: string): ResolvedLayerConfig;
    canInsert(id: string): boolean;
    createLocalLayer(definition: LocalLayerDefinition): string;
    removeLocalLayer(id: string): void;
    execute(command: Command): boolean;
}
/**
 * The layers that can take every object of `group`: insert allowed and the same geometry type,
 * its multi-part form, or `Any`.
 */
export declare function importTargets(ctx: ImportContext, group: ImportGroup): string[];
/**
 * Insert the groups of `preview` into their targets (default: a new local layer named after
 * the group) as one composite command. Throws when a target cannot take a group or validation
 * rejects the command; local layers created for it are removed again then.
 */
export declare function applyImport(ctx: ImportContext, preview: ImportPreview, targets?: Record<string, ImportTarget>): ImportResult;
