# Workflow: import, edit, export

Load a file you received, correct it on the map using the existing data as reference, and pass it on as a file in another format, without touching the server data.

> The screenshots show the reference layout that ships with OLAD. Your application may offer import and export elsewhere.

**You will use:** [Import](Import-and-Export#import), [local layers](Edit-Mode-and-Layers#your-own-layers-local-layers), the [modify tools](Modify-Tools), [Export](Import-and-Export#export).

## 1. Import into a local layer

1. Choose **File → Import…** and drop the file, for example `planning.geojson`, onto the dialog.
2. Each group (points, lines, polygons) is set to **New local layer**. Give the layers clear names, then click **Import**.

<img src="images/import-dialog.png" width="560" alt="The Import dialog">

The new layers appear in the Layers panel, marked "· local". They live in your browser and are not sent to the server when you save.

## 2. Edit

1. Press <img src="images/icons/edit.png" width="20" alt=""> **Edit** on the imported layer.
2. Fix what needs fixing, with snapping to the existing data:
   - [Vertices](Modify-Tools#vertices) to move corners onto the real parcel corners,
   - [Move](Modify-Tools#move) and [Rotate](Modify-Tools#rotate) to fit a misplaced object,
   - [Trim](Modify-Tools#trim) and [Extend](Modify-Tools#extend) for lines.
3. Add attributes in the **Attributes** panel. Use <img src="images/icons/settings.png" width="20" alt=""> **Settings** on the layer's row to add attribute fields first.

## 3. Export

1. Choose **File → Export…**.
2. Tick only the imported layer(s).
3. Choose the format, for example **KML** for Google Earth, and click **Export**.

<img src="images/export-dialog.png" width="480" alt="The Export dialog">

The file is downloaded. Your edits to the local layers stay in the browser for the next session; delete the layers with **Settings → Delete layer** when you are done.

## Alternative: import into a server layer

In step 1, choose **Into Parcels** (or another existing layer) instead of **New local layer**. The imported objects then become pending changes and are sent to the server with your next **File → Save**.
