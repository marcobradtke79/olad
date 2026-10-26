# Workflow: correcting roads

Clean up line data: cut off overshooting lines, close gaps, move a vertex onto an exact point and add a parallel line at a fixed distance.

> The screenshots show the reference layout that ships with OLAD. Your application may arrange toolbars and panels differently.

**You will use:** [Trim](Modify-Tools#trim), [Extend](Modify-Tools#extend), [Vertices](Modify-Tools#vertices), [Offset](Modify-Tools#offset), [Draw parallel](Drawing-Tools#draw-parallel), [snapping](Precision-Aids#snapping).

Start by pressing <img src="images/icons/edit.png" width="20" alt=""> **Edit** on the **Roads** layer in the Layers panel.

## Cut off a line that overshoots

A road was drawn too long and runs past the parcel where it should end.

1. Click <img src="images/icons/trim.png" width="20" alt=""> **Trim**.
2. Click the **boundary**: here the parcel.
3. Point at the part of the road that sticks out. A dashed preview shows what will be removed. Click.

| Before                                     | After                                    |
| ------------------------------------------ | ---------------------------------------- |
| ![Before trimming](images/trim-before.png) | ![After trimming](images/trim-after.png) |

The boundary stays chosen: click more lines to trim them at the same boundary. Press **Enter** to choose another boundary.

## Close a gap

A road ends just short of the street it should join.

1. Click <img src="images/icons/extend.png" width="20" alt=""> **Extend**.
2. Click the street as the **boundary**.
3. Click the short road **near the end** that should reach it. That end is lengthened in its own direction until it meets the street.

## Move a vertex onto an exact point

1. Click <img src="images/icons/vertices.png" width="20" alt=""> **Vertices** and click the road.
2. Click the vertex to move. It follows the crosshair.
3. Move it to the target. Snapping catches corners, midpoints and right-angle points. Click, or type the new position, for example `@0,2.5`.

![Moving a vertex with snapping](images/modify-vertices.png)

Press **Enter** when the object is done.

## Add a parallel line at a fixed distance

For a kerb line 3 m beside the road centre line:

- **The whole road, exactly 3 m away**: click <img src="images/icons/offset.png" width="20" alt=""> **Offset**, click the road, type `3`, then click on the side the kerb goes to.
- **Only part of the road**: click <img src="images/icons/drawParallel.png" width="20" alt=""> **Draw parallel** and click the road. Click the start point beside it: its distance from the road sets the distance of the parallel. Then move the crosshair along the road and click where the parallel should end, or type its length.

![A parallel along part of the road](images/draw-parallel.png)

Every step is one undo step, so **Ctrl+Z** takes back exactly the last correction. Save with **File → Save**.
