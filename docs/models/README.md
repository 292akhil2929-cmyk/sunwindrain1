# WELOS judge model

This is an illustrative system model, not a manufacturable or safety-validated CAD design. It shows a central controller alongside WELOS Sun (PV), Flow (micro-hydro), Farm (biogas), and Wind (tower-mounted turbine).

## Edit the native parts in OwlCAD

1. Open [OwlCAD](https://owlcad.com/app) and create a blank document.
2. Open **Code → Document JSON**.
3. Paste the contents of the improved [`welos-owlcad-document-v2.json`](./welos-owlcad-document-v2.json) and select **Apply**.
4. Select a named part in the object tree to edit its dimensions, position, rotation, and color.
5. Save or download a copy in OwlCAD before leaving the browser. Cloud sharing requires an OwlCAD account.

The improved document has 290 named, editable parts, including cabinet door hardware, a PCB/ESP32-S3 visual assembly, protection devices, a photovoltaic cell grid, micro-hydro flanges, biogas fittings, and wind-turbine details. The older [42-part blockout](./welos-owlcad-document.json) is retained for comparison. Rebuild the improved document with `node scripts/export-welos-owlcad.mjs docs/models/welos-owlcad-document-v2.json`.

## Import into another 3D application

[`welos-system-v2.glb`](./welos-system-v2.glb) is the matching portable 3D presentation model, with beveled edges and physically based materials. The native OwlCAD JSON is the better choice for editing individual parts. Rebuild this GLB with `node scripts/export-welos-cad-glb.mjs`. The older [GLB](./welos-concept-system.glb) is retained as an archive.

The controller enclosure, circuit board, breakers, and source modules are visual placeholders. This package does not specify rated protection, wiring, certified components, thermal design, or build-ready mechanical tolerances.
