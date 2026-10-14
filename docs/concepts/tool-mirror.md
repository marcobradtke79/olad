# Mirror tool

**Status:** implemented (2026-10-13). Defined by the project owner on 2026-10-13: select one or several objects, draw the mirror line, answer whether a copy should be created (default no, just Enter); copies open the attribute dialog. Decided with the owner: `y/N` typed in the command line, read-only objects only as copies, the popup steps through several copies.

## Purpose

MIRROR builds symmetric layouts from half of them: the other side of a junction, the twin of a building, the opposite row of lamps. In place it flips objects that were drawn the wrong way round.

## Model

**State machine** (the [rotate tool](tool-rotate.md) pattern)

1. **select**: the shared click and box selection of the [select tool](tool-select.md); any objects ([selection](selection.md)). A selection at activation skips the step; Enter continues.
2. **first**: first point of the mirror line, click (snapped) or typed ([numeric input](numeric-input.md)).
3. **second**: second point; typed points may be relative to the first (`referencePoint`), so the angle lock and the perpendicular snap work. Dashed preview: the mirrored objects and the line, extended across them. A point on the first one is ignored.
4. **copy**: `Create a copy? [y/N]`. `Tool.handleText` takes `y / yes / j / ja` (copies) or `n / no / nein` (in place); Enter on the empty line (`finish`) and a map click mean no. Other text is refused.
5. Done: the selection is cleared and the tool returns to **select**.

Escape and Backspace step back: copy → second → first → select (clearing the selection). Switching tools keeps the selection.

**Geometry** (`mirrorGeometry`, `reflectPoint`): each vertex is reflected across the line through the two points (`2·foot − p`); polygon rings are reversed afterwards so they keep their winding, since a reflection flips it. The result is a new geometry: the tool never changes a feature in place.

**In place** ([editing](editing.md)): one `updateGeometry` per object the user may update, as one composite; read-only objects are skipped ([layers and editability](layers-and-editability.md)) and the next prompt says how many.

**Copies**: one composite of inserts. Each copy goes to its source layer when it exists, allows `insert` and takes the type, else the active layer, else the draft layer: the rule of the [templates](templates.md) (`templateTarget`); attributes are copied (`copyProperties`: without geometry and id property) over the target's schema defaults. The inserts carry no template flag, so the popup [attribute](attributes.md) form opens and steps through the copies.

**Validation** ([validation](validation.md)): a rejected command changes nothing and keeps the copy question with a notice.

**UI** ([UI shell](ui-shell.md)): button Mirror in the Modify toolbar; prompts per step in the command line.

## Related

- [Rotate tool](tool-rotate.md): same select-then-points pattern, deselect afterwards.
- [Scale tool](tool-scale.md): the other transformation on the rotate pattern; it has no copy option yet.
- [Move tool](tool-move.md): same select step and point picking.
- [Select tool](tool-select.md): reuses the click and box selection.
- [Selection](selection.md): the objects to mirror; cleared afterwards.
- [Numeric input](numeric-input.md): typed line points; the copy answer through `handleText`.
- [Editing](editing.md): one composite per mirror, updates or inserts.
- [Layers and editability](layers-and-editability.md): read-only objects only as copies; the target rule for copies.
- [Templates](templates.md): shares the target rule and the attribute copy.
- [Attributes](attributes.md): the popup steps through the copies.
- [Validation](validation.md): rejected results keep the question.
- [Construction tools](construction-tools.md): mirror is one of the transformations listed there.
- [Tools framework](tools.md): a text step (`handleText`) answering a question.
- [UI shell](ui-shell.md): button in the Modify toolbar.

## Surface

- `editor.tools.activate('mirror')`, exported `MirrorTool`, `MIRROR_PROMPTS`, `MirrorStep`, `mirrorGeometry`, `reflectPoint` ([tools.md](../tools.md#mirror), [api.md](../api.md)).
- Toolbar button Mirror, icon `mirror` ([ui.md](../ui.md#olcad-toolbar)).

## Open questions

- Should the copies stay selected afterwards (for an immediate move) instead of clearing the selection?
- Point symbols with a rotation attribute or text labels: should their angle be mirrored too?
- Mirroring across an existing segment picked by click (like the straightedge reference pick) instead of two points?

## Source

- `src/core/tools/mirror.ts`
- `src/core/geometry/mirror.ts`
- `src/core/templates/insert.ts`
- `src/ui/elements/OlcadAttributeForm.ts`
