# Modify tool

**Status:** implemented (2026-10-12). The definition below was confirmed by the project owner on 2026-10-12 and the tool was rewritten to it the same day (click, move, click; one command per placement; Delete and Alt+click remove; Enter finishes). A tool change keeps the selection, as decided with the owner.

## Purpose

Edit the shape of an object vertex by vertex, the way CAD grips work: pick the object, pick a grip, place it with the crosshair. Every placement is exact because the crosshair is snapped and constrained, and every placement is one command, so a slip is one undo step away.

## Model

**Definition** (owner, 2026-10-12)

1. When the tool is activated, the user selects **one** object. A selection of exactly one updatable object made beforehand is used and the select step skipped; with several objects selected, the one clicked becomes the object.
2. All vertices of the selected geometry are highlighted.
3. Clicking a vertex picks it up: it follows the crosshair (click, move, click; no drag).
4. A second click places the vertex. The placement is submitted immediately as one `updateGeometry` command, so each vertex is one undo step.
5. The user continues with other vertices of the same geometry, or finishes with Enter or by changing the tool. Enter ends the session and clears the selection; a tool change ends the session but keeps the selection (the general rule for tools), and nothing is lost either way because every placement is already a command.
6. Insert and delete belong to the tool: clicking a segment picks up a new vertex there; Alt+click on a vertex (or Delete while a vertex is under the pointer) removes it.

**State machine**

- **select**: click one object of an editor layer for which `canEdit('update')` holds; skipped when exactly one such object is already selected. With several objects selected, the tool waits here until one is clicked.
- **idle**: the object's vertices are highlighted (the selection's grips; the hovered one gets a ring); the tool waits for a click on a vertex (pick up), on a segment (pick up a new vertex at the nearest point of the segment) or Alt+click / Delete on a vertex (remove, one command). Hit testing uses the raw pointer position, not the snapped one, so a nearby snap target cannot steal the grip.
- **placing**: the picked vertex follows the snapped and constrained crosshair on the preview layer (dashed ghost of the geometry plus the vertex marker); a click or a typed point places it (one command) and returns to **idle**; Escape or Backspace drops it back. A geometry change from outside (undo) while placing drops the pick as well.
- Enter (`finish`) ends the session: selection cleared, tool back to **select**. Escape in **idle** does the same. A tool change ends the session and keeps the selection.

**Commands**

Every placement, insert and delete is one `updateGeometry` through [editing](editing.md). A rejected geometry (for example a ring that would self-intersect, see [validation](validation.md)) leaves the previous geometry in place with a `validationerror`: the vertex returns to where it was.

**Reference point**

While **placing**, the vertex's original position is the tool's reference point, so the angle lock ([constraints](constraints.md)), the perpendicular snap ([snapping](snapping.md)) and relative [numeric input](numeric-input.md) (`@dx,dy`, `@distance<angle`) place the vertex precisely relative to where it was. The crosshair ([straightedge](straightedge.md)) is the only pointer while placing, as everywhere in edit mode.

**No in-place mutation**

Unlike the move tool, the modify tool never lets OpenLayers change the feature: the new geometry is built from a copy (`setVertex`, `insertVertexAfter`, `removeVertex` on a vertex path) and handed to `execute`. The feature changes only when the command is applied, so a rejection needs no restore and the [selection](selection.md) highlight always shows the committed state. The snapshot-and-restore helpers in the same module serve the move tool.

## Related

- [Selection](selection.md): the object is taken from or put into the selection; Enter clears it, a tool change keeps it.
- [Editing](editing.md): one command per placement, insert and delete.
- [Tools framework](tools.md): select step, prompts per state, Enter finishes, Escape steps back; the reference point while placing.
- [Snapping](snapping.md): the placed vertex snaps to other geometry; perpendicular from the vertex's original position.
- [Validation](validation.md): a rejected result returns the vertex to its previous position.
- [Constraints](constraints.md): the angle lock applies while a vertex is being placed, around its old position.
- [Numeric input](numeric-input.md): a typed point places the picked vertex, relative forms measured from its original position.
- [Straightedge](straightedge.md): the picked vertex follows the crosshair.
- [Curve tool](tool-curve.md): uses the same grip pattern for its handles and the shared `PointPickInteraction` (raw pointer position, `pickTolerance`).

## Surface

- `editor.tools.activate('modify')`, `tools.finish()` (Enter) ends the session, `tools.removeLastPoint()` drops the pick or removes the hovered vertex and returns whether it did; exported `MODIFY_PROMPTS`, `ModifyStep` ([tools.md](../tools.md#modify-vertex-edit)).
- Toolbar button Vertices ([ui.md](../ui.md)).

## Open questions

- May a picked vertex be dropped onto a neighbouring vertex of the same ring? Today this is a `zero-length-segment` rejection; CAD users sometimes use it to merge vertices.
- Delete while **placing**: cancel the pick or delete the vertex?
- Should the first pick in a session also offer "stretch" (move several vertices inside a box), or is that a separate tool?
- Snapping candidates include the object being edited, so a vertex dragged near its own old position snaps back onto it. Exclude the picked vertex from the candidates?

## Source

- `src/core/tools/modify.ts`
- `src/core/geometry/vertices.ts`
- `src/core/tools/preview.ts`
- `src/ui/keyboard.ts` (Delete and Backspace routing)
