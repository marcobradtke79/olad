# Drawing tools

How to create new objects: points, lines, polygons, rectangles, circles, ellipses, regular polygons, curves, parallels and texts.

> The screenshots show the reference layout that ships with OLAD. Your application may arrange the toolbars differently.

![The Draw toolbar](images/toolbar-draw.png)

## Before you draw

1. Open the **Layers** panel and press <img src="images/icons/edit.png" width="20" alt=""> **Edit** on the layer you want to add to. This switches edit mode on and makes the layer active. Without an active layer, new objects go into the [Draft layer](Edit-Mode-and-Layers#drafts).
2. Choose a tool from the **Draw** toolbar. Only the tools that fit the layer are enabled: polygon tools for a polygon layer, line tools for a line layer, point and text tools for a point layer. If a drawing tool is already running when you switch layers, it keeps running for the new layer (its button stays pressed) and you can start drawing right away. Pressing a pressed button switches the tool off.
3. Follow the **prompt on the command line**: it always says what the tool expects next.

Every drawing tool works the same way:

- **Click** on the map to place a point, or **type** it on the command line. Snapping, the grid and the angle lock help you place it exactly. See [Precision aids](Precision-Aids).
- **Enter** finishes, **Escape** steps back or cancels, **Backspace** removes the last point.
- The tool stays active after an object is finished, so you can draw several in a row.
- The new object is **selected**. If the layer has attributes, the [attribute form](Attributes-and-Table#the-attribute-popup) opens so you can fill them in.
- If the shape is not valid (for example a polygon whose edges cross), it is refused with a message and nothing is added.

## Draw point

<img src="images/icons/drawPoint.png" width="24" alt="">

Click on the map: each click places one point. You can also type `x,y` and press Enter.

## Draw line

<img src="images/icons/drawLine.png" width="24" alt="">

1. Click the first point.
2. Click each further point. Instead of clicking, type a coordinate, an offset (`@10,0`), a distance and angle (`@25<90`), or just a length (`12.5`): the next point is then placed that far away in the direction of the pointer.
3. **Double-click** or press **Enter** to finish (at least two points).

## Draw polygon

<img src="images/icons/drawPolygon.png" width="24" alt="">

Like a line: click the corners one after another, then **double-click** or press **Enter** to close the polygon (at least three corners).

## Draw rectangle

<img src="images/icons/drawRectangle.png" width="24" alt="">

1. **First corner**: click or type `x,y`.
2. **Opposite corner**: click, or type it relative to the first corner. For example `@30,20` makes a rectangle 30 wide and 20 high.

A dashed preview follows the pointer.

![Drawing a rectangle](images/draw-rectangle.png)

The sides follow the **straightedge**: normally they run east–west and north–south. After [Align to segment](Precision-Aids#straightedge) the rectangle comes out parallel to the segment you picked, for example the edge of a building.

## Draw circle (flyout)

The circle button has three variants. Right-click it or click its triangle to choose one.

| Variant                                                                               | Steps                                                                         |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| <img src="images/icons/drawCircle.png" width="20" alt=""> **Centre and radius**       | Click the centre, then type the radius (`15`) or click a point on the circle. |
| <img src="images/icons/drawCirclePoint.png" width="20" alt=""> **Centre and point**   | Click the centre, then click a point the circle passes through.               |
| <img src="images/icons/drawCircleThreePoints.png" width="20" alt=""> **Three points** | Click three points on the circle.                                             |

![Drawing a circle by centre and radius](images/draw-circle.png)

Circles are stored as polygons with enough corners that they look perfectly round. Your application sets how exact they are.

## Draw ellipse (flyout)

| Variant                                                                                    | Steps                                                                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| <img src="images/icons/drawEllipse.png" width="20" alt=""> **Centre and axes**             | Click the centre, then the end of the first axis, then type the other half-axis or click a point at that distance. |
| <img src="images/icons/drawEllipseAxis.png" width="20" alt=""> **Axis ends and half-axis** | Click both ends of the first axis, then type the other half-axis or click a point.                                 |
| <img src="images/icons/drawEllipseBox.png" width="20" alt=""> **Box corners**              | Click two opposite corners of a box: the ellipse fills it.                                                         |

![The ellipse button's variants](images/toolbar-ellipse-flyout.png)

## Draw regular polygon

<img src="images/icons/drawRegularPolygon.png" width="24" alt="">

A polygon with equal sides, such as a hexagon:

1. **Number of sides**: type it and press Enter, or press Enter to keep the number shown (6 at first).
2. **Centre**: click or type `x,y`.
3. **Vertex**: click a corner, or type the distance from the centre to the corners.

## Draw curve

<img src="images/icons/drawCurve.png" width="24" alt="">

A smooth curve whose start and end direction you control:

1. Click the **start point**.
2. Click the **end point**. The curve appears with a handle at each end.
3. **Click a handle** to pick it up and move it. The curve bends as you move. Click again to put the handle down. Repeat as often as you like.
4. Press **Enter** to add the curve.

![Shaping a curve with its handles](images/draw-curve.png)

A handle's direction is the direction the curve leaves its end, and its length controls how far the curve keeps that direction. Typing `@30<45` while a handle is picked makes the curve leave at 45°.

## Draw parallel

<img src="images/icons/drawParallel.png" width="24" alt="">

Draws a line at a fixed distance beside an existing line or polygon, following its bends:

1. **Click the line or polygon** to run parallel to. If one is already selected, this step is skipped.
2. **Click the start point** beside it. Its distance from the object sets the distance of the parallel.
3. **Move the crosshair along the object**: a dashed preview follows. Click to end the parallel there, or type its length.

![Drawing a parallel to a road](images/draw-parallel.png)

The tool then asks for the next start point beside the same object. Escape picks a different object.

## Draw text

<img src="images/icons/drawText.png" width="24" alt="">

Places a text on the map, for example a street name or a note. It needs a text layer, or no active layer (the text then goes into the Draft layer).

1. **Insert point**: click where the text starts.
2. **Text height**: type the height of the letters on the ground (for example `2.5` for 2.5 m), or press Enter to keep the height offered.
3. **Text**: type the text and press Enter.

The text follows the straightedge angle, so it can be aligned with a road. It grows and shrinks as you zoom, like a printed map.

## See also

- [Precision aids](Precision-Aids): snapping, grid, angle lock and typed input
- [Modify tools](Modify-Tools)
- [Workflow: a parcel with exact dimensions](Workflow-Precise-Parcel)
