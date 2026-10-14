# Change tracking

**Status:** implemented (2026-10-12). Baseline snapshots, net-change collapse, export with per-change CRS, accept and discard exist. Conflict hints and a host id generator are open (CLAUDE.md section 14).

## Purpose

The host owns the transport to its backend; ol-cad owns the bookkeeping. Whatever sequence of commands, undos and redos the user produces, the host receives one **net** change per feature: what to insert, what to update (and only the fields that changed), what to delete. The change set is plain JSON in the CRS the backend served, so it can be posted as is.

## Model

**Baseline**

- At a feature's first touch the tracker snapshots its geometry and properties (in the view projection) and notes whether it was inserted in this session (with its `tempId`).
- The baseline is the state after load, after the last `accept`, or after `discard`.

**Net change derivation** (not a log)

| Flags / comparison                         | Net result                     |
| ------------------------------------------ | ------------------------------ |
| inserted and later deleted                 | nothing                        |
| inserted                                   | `insert` with the final state  |
| deleted (loaded feature)                   | `delete`                       |
| touched, current state equals the baseline | nothing                        |
| touched, differs                           | `update` with the changed keys |

Because the set is derived by comparison, repeated edits collapse by construction, and undoing back to the original state removes the entry without any special casing. This is also why a pending insert may always be updated or deleted regardless of layer flags (see [layers and editability](layers-and-editability.md)).

**Export**

- `{ version: 1, crs?, changes[] }`; each change carries `op`, `layer`, its own `crs` (the layer's data projection, or `changes.crs` when forced) and GeoJSON geometry transformed into it; the top-level `crs` only when all changes share one.
- `update` carries only changed properties (removed ones as `null`) and geometry only when it changed, plus `changed[]`; `changes.fullFeatures` switches to full output. `changes.precision` limits decimals.
- `JSON.stringify` round-trips losslessly.

**Accept and discard**

- `accept({ idMap })` after a successful save: inserted features receive their backend ids (`tempId` → id), the current state becomes the baseline, the originals store ([projections](projections.md)) is refreshed for touched features and cleared for deleted ones, the history is cleared, `change` fires with an empty set.
- `discard()`: inserted features are removed, deleted ones return, updated ones get their baseline geometry and properties; history cleared; `change` fires.
- Both leave draft objects alone, because draft commands never reach the tracker.

**Projection switch**

Snapshots are transformed with the view, so comparison stays valid after a switch (see [projections](projections.md)).

**Layer removal** drops the layer's tracked changes and clears the whole history (a partial history could reference features that no longer exist).

**Reload interplay**

`bbox` layers reload after a projection switch or extent change; the tracker's deleted ids keep locally deleted features from reappearing, and touched features are kept across the reload.

## Related

- [Editing](editing.md): every applied command feeds the tracker; `accept` / `discard` are exposed on `editor.changes`.
- [Projections](projections.md): snapshots are reprojected on a switch; export uses each layer's data projection; `accept` refreshes the originals.
- [Moving drafts](draft-move.md): only the insert into the target layer is tracked; the draft side is untracked.
- [Layers and editability](layers-and-editability.md): the pending-insert exception follows from the collapse rules; draft objects are never tracked.
- [Validation](validation.md): only validated commands reach the tracker, so the exported geometries are always valid.
- [Table view](table-view.md): marks each row as inserted, updated or unchanged from the net changes.
- [Local layers](local-layers.md): untracked like the draft layer; never in the change set.
- [Export](export.md): independent of the change set; unsaved edits are written too.
- [Import](import.md): imports into server layers are tracked, into local layers not.

## Surface

- Config `changes` (`crs`, `precision`, `fullFeatures`) ([configuration.md](../configuration.md)).
- `editor.changes.get()`, `hasChanges()`, `accept({ idMap })`, `discard()`, event `change` ([api.md](../api.md), format and collapse table in [change-set.md](../change-set.md)).
- Reference save implementation: `test-server/public/index.html` ([test-server.md](../test-server.md)).

## Open questions

- Conflict hint: should `update` / `delete` carry a per-feature version or timestamp from the source so the backend can detect concurrent edits? (CLAUDE.md section 14.)
- Host-supplied id generator instead of `tempId` (for clients that mint UUIDs)? (Section 14.)
- Should `accept` take a partial id map and keep the unmapped inserts as pending (today a missing entry keeps the temporary id and the feature is treated as accepted)?

## Source

- `src/core/changes/ChangeTracker.ts`
- `src/core/changes/exportChangeSet.ts`
- `src/core/changes/Editing.ts` (`accept`, `discard`, `dropLayer`)
- `src/core/layers/originals.ts`
