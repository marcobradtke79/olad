# Template copy tool

**Status:** implemented (2026-10-13). Defined by the project owner on 2026-10-13 with the [templates](templates.md): select the objects, pick a base point, name the template in the command line.

## Purpose

Turn objects already on the map into a reusable template without drawing anything new: pick what belongs together, say where its handle is, give it a name.

## Model

**State machine** (the [move tool](tool-move.md)'s first steps)

1. **select**: the shared select and box-select interactions of the [select tool](tool-select.md); any objects, read-only ones included ([selection](selection.md)). A selection at activation skips the step; Enter continues.
2. **base**: a click (snapped) or a typed `x,y` ([numeric input](numeric-input.md)).
3. **name**: the prompt suggests `Template <n>`; a typed text is taken as the name through `Tool.handleText` before any parsing (so `12` is a name here), an empty Enter keeps the suggestion.
4. On completion the template is stored ([templates](templates.md)), the selection is cleared, the prompt confirms `Template "…" stored.` and the tool starts over at **select**. No command is executed: copying changes no data.

Escape and Backspace step back: name → base → select (clearing the selection). Switching tools keeps the selection.

**UI** ([UI shell](ui-shell.md)): button Copy to template in the Modify toolbar and at the top of the Templates panel.

## Related

- [Templates](templates.md): stores what this tool collects.
- [Template insert tool](tool-template-insert.md): places copies of the stored template.
- [Move tool](tool-move.md): same select and base point steps.
- [Select tool](tool-select.md): reuses the click and box selection.
- [Selection](selection.md): the selection is the objects; cleared when stored.
- [Numeric input](numeric-input.md): the base point may be typed; the name step is the first user of the text channel (`handleText`).
- [Tools framework](tools.md): `handleText` for text steps.
- [UI shell](ui-shell.md): toolbar button and panel button.
- [Construction tools](construction-tools.md): this tool and the insert tool deliver the planned Copy.

## Surface

- `editor.tools.activate('template-copy')`, exported `TemplateCopyTool`, `TEMPLATE_COPY_PROMPTS`, `TemplateCopyStep` ([tools.md](../tools.md#template-copy)).
- Toolbar button Copy to template, icon `copy` ([ui.md](../ui.md#olcad-toolbar)).

## Open questions

- Should the base point default to a meaningful point (first vertex, centre of the extent) so Enter can skip it?
- Copy to template while drawing, without leaving the current tool?

## Source

- `src/core/tools/templateCopy.ts`
- `src/core/templates/TemplateStore.ts`
