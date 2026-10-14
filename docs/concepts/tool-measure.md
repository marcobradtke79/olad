# Measure tools

**Status:** implemented (2026-10-13). Defined by the project owner on 2026-10-13: a measurement toolbox with tools for distances, areas and angles, usable while viewing; results listed in a panel and kept on the map until cleared.

## Purpose

Questions about the plan come before and during editing: how long is this fence, how big is this parcel, is this corner square? The measure tools answer them in ground units (metres, square metres, degrees) without changing any data, so they work while the map is only being viewed and never reach a layer or the change set.

## Model

**Definition** (owner, 2026-10-13)

1. A **Measure toolbar** with Distance, Area, Angle and Clear, and a **results panel** listing every measurement with its values and a remove button.
2. The tools work **in both modes**: with edit mode off they run without switching it on.
3. **Distance**: a polyline of clicked points; each segment and the total are shown; Enter finishes.
4. **Area**: the corners of a polygon; area and perimeter are shown; Enter finishes.
5. **Angle**: three points, first point, vertex, second point; finishes on the third.
6. **Existing objects**: Alt+click a line or polygon to measure it directly.
7. Finished measurements **stay on the map** with their labels until removed or cleared.

**Read-only tools and edit mode** (cross-cutting, see [edit mode](edit-mode.md) and the [tools framework](tools.md))

The tools declare `readOnly`. A read-only tool may be activated with edit mode off, keeps running when edit mode is switched off, and while it runs outside edit mode the inspect click selection is paused (clicks are points), snapping stays on and numeric input is accepted. The crosshair and the grid dots remain edit-mode features, so the normal cursor shows while viewing.

**The tools** (`measure-distance`, `measure-area`, `measure-angle`; one class, `MeasureTool`)

- Points come from clicks (snapped by the [pointer pipeline](pointer-pipeline.md)) or typed [numeric input](numeric-input.md): `x,y`, and `@dx,dy` / `@distance<angle` relative to the last point. A point equal to the last one is ignored.
- While a measurement is in progress it is drawn dashed with live labels following the pointer, and the editor emits `measure` (the results panel shows it).
- Enter finishes a distance (2 points or more) or an area (3 or more); the angle finishes itself. Backspace drops the last point; Escape drops the measurement in progress, never finished ones. The tool stays active for the next measurement.
- Alt+click with nothing in progress measures the visible editor-layer object nearest the raw pointer within the pick tolerance: with the distance tool a line's length or a polygon's perimeter, with the area tool a polygon's area (holes subtracted) and perimeter; of a multi-part object the part nearest the pointer. The measurement records its `source` (layer and feature id). Nothing suitable: the prompt says what to Alt+click.

**Values** (`measureLength`, `measureArea`, `measureAngle`, [measurement](measurement.md))

- In a metric projection that is true to scale (UTM and similar, scale within 1 %) lengths and areas are planar grid values, as surveyors use them.
- In Web Mercator lengths use the local scale at each segment's midpoint (`distanceMetres`), and areas are integrated exactly on the projection's sphere along the straight Mercator edges, so lengths and areas agree with each other and with typed metres.
- Elsewhere (geographic) on the sphere (`ol/sphere`).
- Angles are the angle at the vertex, 0 … 180°, with the reflex; Mercator is conformal, so the map angle is the true local angle.
- Display: `formatLength` (m with 2 decimals, km from 1 000 m), `formatArea` (m², ha from 10 000 m², km² from 1 000 000 m²), `formatAngle` (° with 1 decimal).

**Store and overlay** (`editor.measurements`)

- `list`, `get`, `add(kind, coordinates, { holes?, source? })`, `remove`, `clear`, `getLive`; `measurechange` after every change. Names count per kind ("Distance 1", "Area 2").
- An overlay above the editor layers (not an editor layer: never hit, snapped or exported) draws each measurement: a distance with a label per segment and the total at its end, an area filled with its area and perimeter at an interior point, an angle with its legs, an arc and the value.
- On a projection switch the coordinates are transformed and the values kept; the measurement in progress is dropped.

**Results panel** (`<olcad-measure-results>`)

One row per measurement (icon, name, values; a click zooms to it; a remove button), the live measurement while measuring, Clear all, and a hint when empty. The toolbar's Clear button does the same as Clear all and is disabled without measurements.

## Related

- [Measurement](measurement.md): the projection-aware lengths, areas and angles the tools display.
- [Edit mode](edit-mode.md): measure tools are read-only and run with edit mode off.
- [Tools framework](tools.md): the read-only tool rule; prompts, Enter, Backspace and Escape.
- [Snapping](snapping.md): measure points are snapped, also outside edit mode.
- [Numeric input](numeric-input.md): measure points can be typed, relative to the last point.
- [Projections](projections.md): measurements follow a projection switch.
- [Selection](selection.md): inspect clicks pause while a measure tool runs outside edit mode; measuring never changes the selection.
- [UI shell](ui-shell.md): the Measure toolbar and the Measure panel with `<olcad-measure-results>`.

## Surface

- `editor.tools.activate('measure-distance' | 'measure-area' | 'measure-angle')`, `Tool.readOnly`, exported `MeasureTool`, `MEASURE_PROMPTS`, `MeasureStep` ([tools.md](../tools.md#measurement)).
- `editor.measurements` (`MeasurementsApi`), events `measure` and `measurechange`, types `Measurement`, `MeasurementKind`, `MeasurementValues`, `MeasurementSource`, `MeasurementExtras`; helpers `measureLength`, `measureArea`, `measureAngle`, `formatLength`, `formatArea`, `formatAngle`, `computeMeasurement`, `MEASUREMENT_MIN_POINTS` ([api.md](../api.md#editormeasurements)).
- Toolbar buttons `measure-distance`, `measure-area`, `measure-angle`, `measure-clear`; `<olcad-measure-results>` ([ui.md](../ui.md#olcad-measure-results)).

## Open questions

- A `units` config (feet, gon) for display and typed values, planned in [measurement](measurement.md).
- Exporting measurements (as GeoJSON or a report), and keeping them across reloads like templates?
- Snapping to the points of earlier measurements?
- Show the geodesic (ellipsoidal) value beside the grid value in UTM, or let the host choose?

## Source

- `src/core/tools/measure.ts`
- `src/core/measure/measurements.ts`
- `src/core/measure/MeasurementStore.ts`
- `src/ui/elements/OlcadMeasureResults.ts`
