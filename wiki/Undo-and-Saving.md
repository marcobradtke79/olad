# Undo and saving

How OLAD keeps track of your edits, how to undo them, and how they reach the server.

> The reference page has Save and Discard in its File menu. Your application may offer them as buttons elsewhere, or save automatically.

## Undo and redo

Every change is one step: drawing an object, moving a vertex, applying attributes, an import. Use <img src="images/icons/undo.png" width="20" alt=""> **Undo** and <img src="images/icons/redo.png" width="20" alt=""> **Redo** in the main toolbar, or the keys:

- **Ctrl+Z** (Cmd+Z on a Mac): undo,
- **Shift+Ctrl+Z** or **Ctrl+Y** (Shift+Cmd+Z, Cmd+Y): redo.

Undo works across tools and also for drafts and local layers.

## Changes are kept until you save

Your edits change the map immediately, but they are only **pending changes** in the browser until you save. OLAD records what you did to each object since the last save, but only the end result counts:

- an object you added and then changed is sent as one new object with its final shape and attributes,
- an object you added and deleted again is not sent at all,
- an object you changed back to its original state counts as unchanged.

The [table view](Attributes-and-Table#table-view) marks new and changed objects until you save.

## Save

**File → Save** sends your pending changes to the server:

- **Success**: the changes are accepted. New objects receive their final ids from the server, and the pending list is empty again.
- **Failure** (no connection, server error): nothing is lost. Your changes stay pending, and you can try again later.

**Not saved to the server**: [drafts](Edit-Mode-and-Layers#drafts), [local layers](Edit-Mode-and-Layers#your-own-layers-local-layers), [measurements](Measuring) and [templates](Templates). To keep a draft, move it into a layer first.

## Discard

**File → Discard** throws away all pending changes: every object returns to its state at the last save. Drafts and local layers are not affected.

## When an edit is refused

OLAD checks every change before it is applied. A change is refused, and nothing happens, when:

- the shape is not valid: a polygon whose edges cross, a line with only one point, a zero-length segment,
- the layer does not allow it: adding, changing or deleting may be switched off per layer,
- the geometry type does not fit the layer.

The command line explains why.

## See also

- [Attributes and table](Attributes-and-Table)
- [Keyboard shortcuts](Keyboard-Shortcuts)
