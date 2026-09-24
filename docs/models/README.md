# WELOS judge model

This is an illustrative system model, not a manufacturable or safety-validated CAD design. It shows a central controller alongside WELOS Sun (PV), Flow (micro-hydro), Farm (biogas), and Wind (tower-mounted turbine).

## Edit the native parts in OwlCAD

1. Open [OwlCAD](https://owlcad.com/app) and create a blank document.
2. Open **Code → Document JSON**.
3. Paste the contents of the improved [`welos-owlcad-document-v2.json`](./welos-owlcad-document-v2.json) and select **Apply**.
4. Select a named part in the object tree to edit its dimensions, position, rotation, and color.
5. Save or download a copy in OwlCAD before leaving the browser. Cloud sharing requires an OwlCAD account.

The improved document has 336 named, editable parts, including cabinet door hardware, cable ducts, a PCB/ESP32-S3 visual assembly, protection devices, a photovoltaic cell grid, micro-hydro flanges, biogas fittings, and wind-turbine details. The older [42-part blockout](./welos-owlcad-document.json) is retained for comparison. Rebuild the improved document with `node scripts/export-welos-owlcad.mjs docs/models/welos-owlcad-document-v2.json`.

For a stronger close-up presentation, use the separate [188-part controller-only OwlCAD document](./welos-controller-detail.json). It isolates the cabinet and can be rotated and inspected without the four source modules shrinking the overall view. Rebuild it with `node scripts/export-welos-controller.mjs`.

## Import into another 3D application

[`welos-system-v2.glb`](./welos-system-v2.glb) is the matching portable 3D presentation model, with beveled edges and physically based materials. The [controller-only GLB](./welos-controller-detail.glb) is better for close-up inspection. The native OwlCAD JSON files are the better choice for editing individual parts. Rebuild either GLB with `node scripts/export-welos-cad-glb.mjs INPUT.json OUTPUT.glb`. The older [GLB](./welos-concept-system.glb) is retained as an archive.

[`welos-controller-concept-render.png`](./welos-controller-concept-render.png) is an AI-generated presentation illustration of the intended material finish and cable layout. It is **not** a photograph, and details in it should not be treated as dimensions, wiring instructions, or proof of a functioning prototype. It was generated with the built-in image-generation tool using a photorealistic industrial-controller product-mockup prompt.

The controller enclosure, circuit board, breakers, and source modules are visual placeholders. This package does not specify rated protection, wiring, certified components, thermal design, or build-ready mechanical tolerances.
