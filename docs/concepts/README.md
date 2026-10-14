# Concepts

How each tool and process of ol-cad is meant to work: the mental model, the steps and rules, how it relates to the other features, what is implemented and what is still open. The reference documentation in [`docs/`](../) ([api.md](../api.md), [configuration.md](../configuration.md), [tools.md](../tools.md), [change-set.md](../change-set.md), [ui.md](../ui.md)) describes only what exists; the concept files are the one place where the target behaviour and the current state sit side by side, with a status per concept.

Read the concept of a feature before changing it. Working rules for keeping these files current are in `CLAUDE.md` (sections 11 and 13); `tests/unit/concept-docs.test.ts` fails when a concept is missing from this index, a link is broken, two related concepts do not link each other, a file lacks the template sections or a named source path does not exist.

## Concept map

Status: **implemented** (behaviour exists and matches the concept), **partial** (parts exist, the rest is marked planned in the file), **planned** (nothing or almost nothing exists yet).

### Modes and context

| Concept                                             | Status      | What it covers                                                                                                             |
| --------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| [Edit mode](edit-mode.md)                           | implemented | The on/off gate between viewing and editing: what it enables, what leaving it cancels, what survives it.                   |
| [Layers and editability](layers-and-editability.md) | implemented | One layer per object class, per-operation editability, the active layer and the local draft layer.                         |
| [Moving drafts](draft-move.md)                      | implemented | A selected draft object moved into a layer that takes its geometry, then its attribute form.                               |
| [Selection](selection.md)                           | partial     | The shared set of features tools act on, its highlight, pruning, inspect mode and the Delete action.                       |
| [Local layers](local-layers.md)                     | implemented | Layers the user creates in the browser: geometry type, attributes, rename, delete; untracked; IndexedDB.                   |
| [Layer styles](layer-styles.md)                     | implemented | Users reorder layers and change their colours, labels, opacity and zoom range (View → Layer styles…); kept in the browser. |
| [Layer highlight](layer-highlight.md)               | implemented | All objects of a layer drawn in their own style above the layers, below the selection; API, config, layer list button.     |
| [Templates](templates.md)                           | implemented | Named copies of objects with a base point: store, JSON export / import, placement and target rule, panel.                  |
| [Projections](projections.md)                       | implemented | The view projection as in-memory CRS, the runtime switch and loss-free originals.                                          |

### Editing pipeline

| Concept                               | Status      | What it covers                                                                                    |
| ------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| [Editing](editing.md)                 | implemented | Every mutation is a command: validate, apply, history, events; how tools submit their changes.    |
| [Change tracking](change-tracking.md) | implemented | Baseline snapshots, net changes, the exported change set, accept and discard.                     |
| [Validation](validation.md)           | partial     | Geometry validity before a command is applied, translated messages; attribute validation to come. |
| [Attributes](attributes.md)           | partial     | Schema-driven properties, defaults, the generated form and the popup after an insert.             |

### Tools

| Concept                                         | Status      | What it covers                                                                                                          |
| ----------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| [Tools framework](tools.md)                     | partial     | The Tool contract: lifecycle, options, prompts, keyboard verbs, reference point, suspension.                            |
| [Select tool](tool-select.md)                   | partial     | Click, toggle and box selection; the shared select interaction.                                                         |
| [Draw tool](tool-draw.md)                       | partial     | Point, line and polygon into the active or draft layer; typed vertices; select after insert.                            |
| [Rectangle tool](tool-rectangle.md)             | implemented | Two corners, by click or command line; sides follow the straightedge; inserted like a drawing.                          |
| [Circle tool](tool-circle.md)                   | implemented | Centre + radius, centre + point or three points, behind one flyout button; linearized in metres.                        |
| [Ellipse tool](tool-ellipse.md)                 | implemented | Centre and axes, axis ends and half-axis, or box corners, behind one flyout button; linearized in metres.               |
| [Regular polygon tool](tool-regular-polygon.md) | implemented | Equal sides (3 to 1024): typed side count, centre, one vertex; inscribed; the first tool with a value step.             |
| [Curve tool](tool-curve.md)                     | implemented | Cubic Bézier: start, end, a handle at each end as adjustable grips; Enter inserts; linearized in metres.                |
| [Parallel tool](tool-parallel.md)               | implemented | Pick a line or polygon and a start point; the line follows it to the crosshair; click inserts, reference kept.          |
| [Text tool](tool-text.md)                       | implemented | Insert point, height in metres, text in the command line; point objects in text layers, rotated along the straightedge. |
| [Measure tools](tool-measure.md)                | implemented | Distance, area and angle by clicks or Alt+click on an object; kept on the map; usable without edit mode.                |
| [Offset tool](tool-offset.md)                   | implemented | Parallel copy of a line or polygon: select, typed distance, side click; into the source layer, else active or draft.    |
| [Trim tool](tool-trim.md)                       | implemented | Boundary first, then clicks remove the clicked parts of lines; interior pieces split a line.                            |
| [Extend tool](tool-extend.md)                   | implemented | Boundary first, then clicks extend the nearer end of lines along their end segment to it.                               |
| [Template copy tool](tool-template-copy.md)     | implemented | Select objects, pick a base point, name the template in the command line.                                               |
| [Template insert tool](tool-template-insert.md) | implemented | Preview at the pointer; every click or typed point inserts a copy; Escape ends.                                         |
| [Modify tool](tool-modify.md)                   | implemented | Vertex editing with CAD grips: pick an object, pick a vertex, place it; one command per vertex.                         |
| [Move tool](tool-move.md)                       | implemented | CAD-style move: select, base point, second point; preview; relative input.                                              |
| [Rotate tool](tool-rotate.md)                   | implemented | CAD-style rotate: select, centre, first and second angle point; preview; deselect.                                      |
| [Mirror tool](tool-mirror.md)                   | implemented | Select, two points of the mirror line, `Create a copy? [y/N]`; in place or copies with the attribute popup.             |
| [Scale tool](tool-scale.md)                     | implemented | Select, base point, then a typed factor or a reference and a target point; uniform; deselect.                           |
| [Construction tools](construction-tools.md)     | planned     | Three-point rectangle, two-point circle, arc, trim, extend, fillet, chamfer, split, merge.                              |

### Precision aids

| Concept                                 | Status      | What it covers                                                                                     |
| --------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| [Pointer pipeline](pointer-pipeline.md) | implemented | How a raw pointer position becomes the coordinate a tool sees: snap, constraint, grid, feedback.   |
| [Snapping](snapping.md)                 | partial     | Object snap modes, candidates, tolerance, precedence; tracing and further modes planned.           |
| [Grid](grid.md)                         | implemented | Grid snap as the fallback aid, spacing and origin in view units, the dot overlay.                  |
| [Straightedge](straightedge.md)         | implemented | The rotatable crosshair as parallel straightedge: angle, colour, reference pick.                   |
| [Constraints](constraints.md)           | partial     | Angle lock relative to the straightedge; parallel, perpendicular and locked length planned.        |
| [Numeric input](numeric-input.md)       | implemented | Typed coordinates: grammar, resolution against the reference point, what each tool accepts.        |
| [Measurement](measurement.md)           | partial     | Projection-aware lengths, areas, angles and offsets; live `measure` event; `units` config planned. |

### UI

| Concept                     | Status      | What it covers                                                                                              |
| --------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| [UI shell](ui-shell.md)     | partial     | The Web Components layer: binding pattern, dock and panels, toolbar, command line, keyboard shortcuts.      |
| [Import](import.md)         | implemented | File → Import…: GeoJSON, TopoJSON, KML, GML or GPX into new local layers or existing layers, one undo step. |
| [Export](export.md)         | implemented | File → Export…: chosen layers into one GeoJSON, KML, GML 3.2 or GPX file, downloaded in the browser.        |
| [Table view](table-view.md) | partial     | One layer's objects as rows in a bottom panel opened from the layer list; selection sync, sort, filter.     |

## Template

Every concept file has these parts, in this order:

```markdown
# <Concept name>

**Status:** implemented | partial | planned (milestone N). One sentence on what exists and what is missing, with the date of the last status change.

## Purpose

What problem it solves and the CAD mental model behind it.

## Model

States, steps, rules and invariants. State machines as numbered steps, precedence as an ordered list, planned behaviour marked "Planned".

## Related

- [other-concept](other-concept.md): one line on how the two relate (depends on, feeds, overrides, cancels).

## Surface

Config keys, `editor.*` members, events and UI elements, each pointing at the reference documentation.

## Open questions

Decisions still owed to the project owner, and known gaps between code and intent.

## Source

- `src/...` paths of the implementing modules.
```

## Linking rules

- Links are relative (`selection.md`, `../api.md#events`).
- When concept A names concept B in its `Related` list, B names A in its list. The test enforces this for every link between two concept files, so a link in the body also needs a backlink.
- The `Related` entry says _how_ the two relate; the reference documentation is not repeated.
- Facts with a single source of truth (option names, signatures, event payloads, class names) stay in the reference documentation and are linked, not copied.
- Planned behaviour is written in the `Model` section and marked "Planned", so a reader sees the target and the gap in one place; the `Status` line summarises the gap.
