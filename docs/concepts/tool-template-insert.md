# Template insert tool

**Status:** implemented (2026-10-13). Defined by the project owner on 2026-10-13 with the [templates](templates.md): started from the Templates panel, every click inserts a copy until Escape; no attribute popup.

## Purpose

Place copies of a template quickly and precisely: the preview shows exactly what will be inserted, snapping puts the base point on existing geometry, typed offsets space copies evenly.

## Model

- Options `{ template: id }`; available when the template exists and at least one object has a target layer (`canInsertTemplate`, the rule in [templates](templates.md) and [layers and editability](layers-and-editability.md)).
- A dashed preview of the objects that will be inserted follows the snapped pointer with the base point at it.
- Every click or typed point ([numeric input](numeric-input.md): `x,y`, or `@dx,dy` relative to the last copy, the tool's `referencePoint`) executes one composite of inserts ([editing](editing.md)) and selects the copies ([selection](selection.md)). A rejected copy ([validation](validation.md)) shows a notice in front of the prompt.
- No [attribute](attributes.md) popup: the inserts carry the template id.
- Escape, Enter and Backspace end the tool through `ctx.done()` ([tools framework](tools.md)). After a projection switch the last point no longer serves as reference.

**UI** ([UI shell](ui-shell.md)): the Insert button of each template row in `<olcad-template-list>`, pressed while the tool runs for that template.

## Related

- [Templates](templates.md): what is inserted, how it is placed and where it goes.
- [Template copy tool](tool-template-copy.md): makes the templates this tool places.
- [Editing](editing.md): one composite per copy, one undo step.
- [Selection](selection.md): the copies become the selection.
- [Layers and editability](layers-and-editability.md): the target rule per object.
- [Numeric input](numeric-input.md): typed insertion points, relative to the last copy.
- [Attributes](attributes.md): no popup for template copies.
- [Validation](validation.md): a rejected copy changes nothing.
- [Tools framework](tools.md): ends itself with `ctx.done()`.
- [UI shell](ui-shell.md): started from the Templates panel.
- [Construction tools](construction-tools.md): with the copy tool, the delivered Copy.

## Surface

- `editor.tools.activate('template-insert', { template })`, exported `TemplateInsertTool`, `TEMPLATE_INSERT_PROMPTS` ([tools.md](../tools.md#template-insert)).

## Open questions

- Rotate the copy before placing (typed angle or straightedge angle)?
- A one-shot mode (insert once, then end) for hosts that prefer it?

## Source

- `src/core/tools/templateInsert.ts`
- `src/core/templates/insert.ts`
