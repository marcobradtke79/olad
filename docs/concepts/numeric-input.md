# Numeric input

**Status:** implemented (2026-10-14). Absolute, relative, polar and direct-distance forms resolve through the measure module and feed the drawing, construction and transformation tools; a number can also be taken as a value (`Tool.handleValue`) or a length (`Tool.handleLength`) by a tool step; lengths take units, else the default unit (2026-10-14); the command line wraps `editor.input`.

## Purpose

CAD users type what they know: a coordinate, an offset of 12.5 m, a length at 30°. ol-cad resolves such text in the core (`editor.input(text)`) into a map coordinate and hands it to the active tool as if it had been clicked, so the command line in the UI is a thin wrapper and a host can drive tools from its own input.

## Model

**Grammar**

| Input             | Meaning                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `x,y`             | Absolute, in view-projection units (`,`, `;` or space as separator).                         |
| `@dx,dy`          | Offset east and north from the reference point.                                              |
| `@distance<angle` | Polar: a length from the reference point at degrees counter-clockwise from the straightedge. |
| `distance`        | Direct distance entry: a length from the reference point towards the pointer.                |

**Units** (2026-10-14, decided with the owner)

- Every length may carry a unit (`5ft`, `5 ft`, `3'`, `12.5 m`, `@3ft,4ft`, `@10 mi<45`): `m`, `km`, `cm`, `mm`, `ft`, `us-ft`, `in`, `yd`, `mi`, `nmi` and their usual spellings. Absolute `x,y` is map units and takes none.
- Precedence for a length: its typed unit > `units.length` > the view projection's unit (`'auto'`: `m`, `ft` or `us-ft`; metres for geographic CRS). The default follows a projection switch while `'auto'`; prompts name it (`{unit}`), and lengths are shown in its system ([measurement](measurement.md)).
- Lengths are converted to metres in the parser; everything after works in metres as before.

**Resolution** (`editor.input`)

1. Parse; unparsable text → `input-invalid`.
2. Edit mode and an active tool are required → else `input-no-tool`.
3. A single number typed **without a unit** is first offered to the tool's current step as a **value** (`Tool.handleValue`: the side count of the [regular polygon tool](tool-regular-polygon.md), the scale factor); taken → `{ ok, text, value }`, done. Then the length in metres is offered as a **length** (`Tool.handleLength`: the offset distance, the ellipse half-axis, the parallel length, the text height); taken → `{ ok, text, length }`, done. Otherwise it is a distance as below.
4. Absolute input is used as is. The other forms need the tool's `referencePoint()` → else `input-no-reference` (first vertex open, select step of move).
5. Metres (from the typed or default unit) become map units through [measurement](measurement.md) at the reference point.
6. Polar angles are relative to the [straightedge](straightedge.md) angle.
7. Direct distance goes in the direction from the reference point to the last snapped pointer position ([pointer pipeline](pointer-pipeline.md)), angle-locked when the lock is on ([constraints](constraints.md)); along the straightedge when the pointer has not been on the map yet.
8. The coordinate goes to the tool's `handleInput`; a tool or step that takes no points, or a value step that refuses the number → `input-not-accepted`.
9. The result (`{ ok, text, coordinate }`, `{ ok, text, value }`, `{ ok, text, length }` or `{ ok: false, code, error }`) is returned and emitted as `input`; messages use the same lookup as [validation](validation.md).

**Who accepts what**

| Tool / step                                                                | Accepts                                                                                                         |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| draw, point layer                                                          | the point is inserted                                                                                           |
| draw, line / polygon                                                       | appended as the next vertex                                                                                     |
| move, base step                                                            | `x,y` (no reference yet)                                                                                        |
| move, target step                                                          | all forms, relative to the base point                                                                           |
| rectangle, first corner                                                    | `x,y` (no reference yet)                                                                                        |
| rectangle, opposite corner                                                 | all forms, relative to the first corner                                                                         |
| circle, centre or first point                                              | `x,y` (no reference yet)                                                                                        |
| circle, radius step                                                        | a plain number is the radius in metres; the other forms give a point whose distance to the centre is the radius |
| circle, point on the circle, second and third point                        | all forms, relative to the centre or the previous point                                                         |
| regular polygon, number of sides                                           | a plain whole number ≥ 3 as the side count (value); `x,y` keeps the count and sets the centre                   |
| regular polygon, centre                                                    | `x,y` (no reference yet)                                                                                        |
| regular polygon, vertex                                                    | all forms, relative to the centre; a plain number is the circumradius in metres                                 |
| curve, start                                                               | `x,y` (no reference yet)                                                                                        |
| curve, end                                                                 | all forms, relative to the start                                                                                |
| curve, placing a handle                                                    | all forms, relative to the handle's end point (`@distance<angle` sets angle and tension)                        |
| curve, shape step                                                          | refused (click a handle first)                                                                                  |
| offset, distance step                                                      | a plain positive number as the distance in metres (value); points refused                                       |
| offset, side step                                                          | `x,y` picks the side; relative forms have no reference point                                                    |
| rotate, centre step                                                        | `x,y` (no reference yet)                                                                                        |
| rotate, angle steps                                                        | all forms, relative to the centre                                                                               |
| modify, placing a vertex                                                   | all forms, relative to the vertex's old position                                                                |
| select, the select step of move and rotate, modify without a picked vertex | refused                                                                                                         |

**Planned**

- Angle and scale factor values in the [construction tools](construction-tools.md) through the same `handleValue` channel the regular polygon and offset tools use. (The circle tool's radius needs no value: a plain number resolves to a point at that distance from the centre, which is the radius whatever the direction.)

**Typed-input steps focus the command line** (2026-10-13)

A tool step that expects the user to type, rather than click, says so with `Tool.getInputRequest()`: `'text'` (the text tool's text, a template name, the mirror copy answer) or `'value'` (the text height, the number of sides, the offset distance, the scale factor, the circle radius, the ellipse half-axis). The editor publishes it (`editor.tools.getInputRequest()`, `toolprompt.input`), and `<olcad-input-bar>` focuses its input, selects what is in it and highlights itself, so the user types right away; it never takes the focus from an open dialog or another text field. When the step ends the input gives the focus back, so the keyboard shortcuts (Delete, Backspace) act on the map again. Point steps return `null`: typing a point stays optional there, and the shortcuts keep working.

## Related

- [Text tool](tool-text.md): the height through `handleValue`, the text itself through `handleText`.
- [Measure tools](tool-measure.md): measure points typed as `x,y` or relative to the last point; accepted outside edit mode.
- [Parallel tool](tool-parallel.md): the start as `x,y`; a plain number is the length in metres through `handleValue`.
- [Tools framework](tools.md): the resolved coordinate goes to `handleInput`, a plain number first to `handleValue`; `referencePoint` anchors relative forms.
- [Measurement](measurement.md): converts metres to map units at the reference point.
- [Straightedge](straightedge.md): polar angles and the default direction are relative to its angle.
- [Constraints](constraints.md): direct distance follows the angle lock.
- [Pointer pipeline](pointer-pipeline.md): direct distance reads the last snapped pointer position.
- [Draw tool](tool-draw.md): typed vertices.
- [Move tool](tool-move.md): base point and relative second point.
- [Rotate tool](tool-rotate.md): centre as `x,y`, both angle points relative to the centre.
- [Modify tool](tool-modify.md): a typed point places the picked vertex, relative to its original position.
- [Validation](validation.md): the `input-*` codes share the message mechanism.
- [Projections](projections.md): absolute input is in view units; metres mean the same in every projection.
- [Construction tools](construction-tools.md): single values as radius, angle or factor.
- [UI shell](ui-shell.md): the input bar is the command line; Enter on empty input finishes, Escape cancels.
- [Rectangle tool](tool-rectangle.md): first corner as `x,y`, opposite corner relative to the first.
- [Circle tool](tool-circle.md): centre as `x,y`; a plain number is the radius in metres; points on the circle relative to the previous point.
- [Regular polygon tool](tool-regular-polygon.md): the side count is the first value taken through `handleValue`; centre as `x,y`; vertex relative to the centre, a plain number as circumradius.
- [Offset tool](tool-offset.md): the distance is a value through `handleValue`; the side may be typed as `x,y`.
- [Curve tool](tool-curve.md): end relative to the start; a picked handle relative to its end point; the shape step takes no points.
- [Template copy tool](tool-template-copy.md): the name step takes text (`handleText`) before parsing; the [template insert tool](tool-template-insert.md) takes typed insertion points.
- [Mirror tool](tool-mirror.md): typed line points; the copy answer `y` / `n` through `handleText`.
- [Scale tool](tool-scale.md): the factor as a plain value through `handleValue`; reference and target points relative to the base.
- [Ellipse tool](tool-ellipse.md): points absolute or relative; a plain number in the half-axis step is the half-axis in metres.

## Surface

- `editor.input(text)`, event `input`, exported `parseInput`, `InputResult`, `ParsedInput` ([api.md](../api.md), [tools.md](../tools.md#numeric-input)).
- `<olcad-input-bar>` ([ui.md](../ui.md)).

## Open questions

- Should absolute input accept a CRS prefix (`EPSG:25832 32500000,5600000`) and transform, so coordinates from a survey sheet can be typed regardless of the view projection?
- Decimal comma for German locales (`12,5`) clashes with the pair separator; offer `;` as the only separator when `locale` is `de`?

## Source

- `src/core/input/parse.ts`
- `src/core/units.ts`
- `src/core/input/index.ts`
- `src/core/Editor.ts` (`input`, `resolveInput`)
- `src/core/measure/index.ts`
- `src/ui/elements/OlcadInputBar.ts`
