# Moving drafts to a layer

**Status:** implemented (2026-10-13). Defined by the project owner on 2026-10-13 and revised the same day: the move lives in the Layers panel, one button on each layer row that can take the selected drafts; several drafts move at once; afterwards the attributes are asked for.

## Purpose

The draft layer is a scratch pad: objects drawn while no layer is active, construction lines, template copies without a home. Some of them turn out to be real objects. Moving them into a proper layer, instead of redrawing them there, keeps the geometry exactly as constructed and asks for their attributes right away. The Layers panel is where the user picks a layer, so the move happens there.

## Model

**Definition** (owner, 2026-10-13)

1. While draft objects are selected, every layer row in the Layers panel (`<olcad-layer-list>`) whose layer can take at least one of them shows an icon button **Move selected draft here**; other rows show none.
2. A layer can take an object when it allows `insert` and its geometry type fits the object's geometry.
3. The button moves every selected draft object the layer takes, as one undo step; the others stay selected drafts.
4. Selecting draft objects opens the Layers flyout (with `reveal`); the Attributes panel only points there.
5. After the move the attribute form is shown for the moved objects: the Attributes flyout opens, and the popup steps through them on pages that have one.

**Which layers** (`draftTargets`)

Every layer except the draft layer, in layer order, that allows `insert` and takes the geometry: the same type, a single part for a multi-part layer (a line goes to a `MultiLineString` layer, wrapped on the move), or anything on an `Any` layer. A multi-part draft object does not go to a single-part layer. Read-only layers and layers without `insert` get no button.

**The move** (`editor.layers.moveDrafts`)

- One composite command through [editing](editing.md): `deleteFeature` for each moved draft object, then `insertFeature` for each copy into the target layer. It is validated as a whole and undone as one step, which puts the draft objects back.
- Each copy gets the target layer's schema defaults under the draft object's own attributes (a template copy placed into the draft layer brings its attributes along); the draft layer's id property is dropped. The geometry is cloned and wrapped for a multi-part layer.
- [Change tracking](change-tracking.md): the draft layer is untracked, so the change set shows plain `insert`s into the target layer, as if the objects had been drawn there.
- The copies are [selected](selection.md); `featureinsert` fires for each, so the popup form opens for a layer with schema fields and steps through several ("1 of 3", [attributes](attributes.md)); then `draftmove` fires once, on which the docked form with `reveal` opens its flyout on the copy's fields with the first input focused.

**Preconditions in the UI**

- The row buttons are disabled outside [edit mode](edit-mode.md), like the attribute inputs. The core API does not check edit mode, as `execute` does not.
- For a selected draft object the Attributes panel shows a hint that the move is in the Layers panel; it no longer opens for draft objects.

## Related

- [Text tool](tool-text.md): texts placed in the draft layer can be moved into a (text) layer with their properties.
- [Layers and editability](layers-and-editability.md): the draft layer is the source; `insert` rights and the geometry type of each layer decide its button.
- [Attributes](attributes.md): the form points a draft object to the Layers panel and opens on the moved objects (`draftmove`); the popup opens through `featureinsert`.
- [Editing](editing.md): the move is one composite of deletes and inserts.
- [Change tracking](change-tracking.md): only the inserts into the target layer reach the change set.
- [Selection](selection.md): the selected draft objects drive the buttons; the copies are selected afterwards.
- [Draw tool](tool-draw.md): draws into the draft layer while no layer is active; the move puts such objects where they belong.
- [Templates](templates.md): template copies placed into the draft layer keep their attributes when moved.
- [Validation](validation.md): the inserted copies are validated against the target layer (geometry type, validity).
- [Edit mode](edit-mode.md): the move buttons are disabled outside edit mode.
- [UI shell](ui-shell.md): the move buttons live in the Layers panel, which opens for selected drafts.
- [Local layers](local-layers.md): a local layer takes draft objects like any layer that allows inserts.

## Surface

- `editor.layers.draftTargets(feature)`, `editor.layers.moveDrafts(features, layerId)`, `editor.layers.moveDraft(feature, layerId)`, event `draftmove` ([api.md](../api.md#editorlayers)); core helpers `draftTargets`, `moveDraftsCommand`, `layerAcceptsGeometry`.
- `<olcad-layer-list reveal>`: `.olcad-layer-list__move-draft` (`data-action="move-draft"`, icon `moveToLayer`) ([ui.md](../ui.md#olcad-layer-list)); `<olcad-attribute-form reveal>` opens on `draftmove`.

## Open questions

- Should a move also be possible between ordinary layers (re-classifying an object), with a delete in the source layer's change set?
- Should the active layer's row (or a single fitting layer) be marked as the suggested target?

## Source

- `src/core/layers/draft.ts`
- `src/core/Editor.ts`
- `src/ui/elements/OlcadLayerList.ts`
- `src/ui/elements/OlcadAttributeForm.ts`
