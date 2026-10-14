# Measurement

**Status:** partial (2026-10-13). Projection-aware offsets and distances exist for numeric input; lengths, areas and angles with the live `measure` event exist for the [measure tools](tool-measure.md) (2026-10-13). Length units (config `units.length`, `editor.units`, CRS default, imperial display) exist since 2026-10-14. Live measurement while drawing with the other tools and angle units are planned.

## Purpose

Web Mercator distorts: at 49° N a map unit is about 0.66 m, so a typed "10" could never simply be 10 map units. All measurement and numeric input go through one projection-aware module so that metres mean ground metres in every view projection, and so the accuracy limits are documented in one place rather than scattered through tools.

## Model

- **Projected metric CRS** (UTM and similar): planar math; the point resolution is about 1.
- **EPSG:3857**: the exact local scale `1 / cos φ` at the working point (100 m east at 49° N is about 152 map units).
- **Geographic CRS** (degrees): geodesic computation on the sphere with a bearing.
- Scale is taken at the **start point** of an offset, so a long typed segment is off by the change of scale along it (a 10 km segment at 49° N by about 0.1 %); distances between two points use the midpoint scale.
- Angles are screen-space degrees everywhere ([numeric input](numeric-input.md)), not geodesic bearings.

- **Lengths** of polylines (`measureLength`): planar in a true-to-scale metric grid (UTM), per segment at its midpoint scale otherwise.
- **Areas** (`measureArea`): planar in a true-to-scale grid; in EPSG:3857 integrated exactly on the projection's sphere along the straight Mercator edges (−∮ R tanh(y / R) dx), so areas agree with the Mercator lengths (`ol/sphere`'s mean-radius area differs by about 0.2 %); `ol/sphere` in geographic projections.
- **Angles** (`measureAngle`) at a vertex, 0 … 180°, with the reflex; true local angles because Mercator is conformal.
- Display formats `formatLength`, `formatArea`, `formatAngle`; the live value of the measure tool in progress is the `measure` event.

**Units** (2026-10-14)

- Values are metres, square metres and degrees everywhere in the API, the data and the change set. Units affect only typed input ([numeric input](numeric-input.md)) and display.
- The default length unit is `units.length`, `'auto'` by default: the view projection's unit (`m`, `ft`, `us-ft`), metres for geographic CRS; `editor.units.setLength` changes it, `unitschange` announces it.
- Display follows the default unit's system: metric m / km and m² / ha / km²; feet ft / mi and ft² / ac / mi² (`US ft` for survey feet); a fixed other unit (`yd`, `nmi` …) shows lengths in itself. Measurement labels are rewritten when the unit changes; the measure panel and the [table view](table-view.md) follow it.

**Planned**

- The `measure` event also while the drawing and construction tools are in progress: current segment length, total length, angle to the straightedge, radius (circles, arcs), area (polygons), in the configured units; the input bar and hosts display it.
- Angle units (`units.angle`: `deg`, `rad`, `gon`) for typed and displayed angles.

## Related

- [Text tool](tool-text.md): text heights in metres are converted to pixels at the text.
- [Measure tools](tool-measure.md): distances, areas and angles measured on the map with these computations.
- [Parallel tool](tool-parallel.md): the typed length is converted at the start point.
- [Numeric input](numeric-input.md): metres typed as offsets or lengths are converted here.
- [Projections](projections.md): the view projection decides which computation applies.
- [Construction tools](construction-tools.md): radius, angle and length feedback and typed values.
- [Grid](grid.md): grid spacing is in view units, so it is a ground distance only in projected metric systems.
- [Circle tool](tool-circle.md): the chord tolerance `curves.tolerance` is in metres and converted to map units at the centre; a typed radius is metres.
- [Ellipse tool](tool-ellipse.md): the same chord tolerance in metres; a typed half-axis is metres.
- [Regular polygon tool](tool-regular-polygon.md): a typed circumradius is metres, converted at the centre.
- [Offset tool](tool-offset.md): the offset distance is metres, converted at the object.
- [Curve tool](tool-curve.md): the chord tolerance is converted at the start; typed handles are metres.
- [Templates](templates.md): copies are scaled by the units-per-metre ratio to keep their size in Web Mercator.
- [Table view](table-view.md): the geometry column shows projection-aware lengths and areas.
- [UI shell](ui-shell.md): `<olcad-unit-select>` switches the default length unit; the measure panel and the command line show lengths in it.

## Surface

- Config `units` ([configuration.md](../configuration.md#units)), `editor.units`, event `unitschange`, `<olcad-unit-select>` ([ui.md](../ui.md#olcad-unit-select)).
- Exported `offsetMetres`, `distanceMetres`, `unitsPerMetre`, `measureLength`, `measureArea`, `measureAngle`, `formatLength`, `formatArea`, `formatAngle`, the units module (`LENGTH_UNITS`, `crsLengthUnit`, `toMetres`, `fromMetres`) ([api.md](../api.md#projections-and-measurement), [tools.md](../tools.md#numeric-input)).

## Open questions

- Should typed lengths in Web Mercator integrate the scale along the segment for long distances, or is the start-point scale acceptable at the accuracy the project needs?
- Units: metres and feet only, or a free unit table?

## Source

- `src/core/measure/index.ts`
- `src/core/measure/measurements.ts`
- `src/core/units.ts`
- `src/ui/elements/OlcadUnitSelect.ts`
