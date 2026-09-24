# WELOS judge model

This is an illustrative system model, not a manufacturable or safety-validated CAD design. It shows a central controller alongside WELOS Sun (PV), Flow (micro-hydro), Farm (biogas), and Wind (tower-mounted turbine).

## Edit the native parts in OwlCAD

1. Open [OwlCAD](https://owlcad.com/app) and create a blank document.
2. Open **Code → Document JSON**.
3. Paste the contents of [`welos-owlcad-document.json`](./welos-owlcad-document.json) and select **Apply**.
4. Select a named part in the object tree to edit its dimensions, position, rotation, and color.
5. Save or download a copy in OwlCAD before leaving the browser. Cloud sharing requires an OwlCAD account.

The editable document has 42 named primitives. The export is reproducible with `node scripts/export-welos-owlcad.mjs`.

## Import into another 3D application

[`welos-concept-system.glb`](./welos-concept-system.glb) is a portable 3D presentation model. It can be imported into a GLB-capable application, but the native OwlCAD JSON is the better choice for editing individual parts. Rebuild the GLB with `node scripts/export-welos-model.mjs docs/models/welos-concept-system.glb`.

The controller enclosure, circuit board, breakers, and source modules are visual placeholders. This package does not specify rated protection, wiring, certified components, thermal design, or build-ready mechanical tolerances.
