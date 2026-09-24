import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// Editable presentation concept for OwlCAD's Code > Document JSON editor.
// Geometry is illustrative, not an electrical, structural, or safety design.
const parts = [
  ["C01 Cabinet backplate", "box", [360, 16, 440], [0, 0, 220], "#aeb9b5"],
  ["C01 Left enclosure rail", "box", [16, 140, 440], [-184, -70, 220], "#89948f"],
  ["C01 Right enclosure rail", "box", [16, 140, 440], [184, -70, 220], "#89948f"],
  ["C01 Top enclosure rail", "box", [384, 140, 16], [0, -70, 432], "#89948f"],
  ["C01 Bottom enclosure rail", "box", [384, 140, 16], [0, -70, 8], "#89948f"],
  ["C01 Exploded access door", "box", [360, 12, 440], [430, -250, 220], "#d8dfd9"],
  ["C03 Controller PCB", "box", [130, 12, 105], [-95, -60, 335], "#1c8056"],
  ["C03 ESP32-S3 module", "box", [53, 10, 45], [-105, -72, 350], "#1b2420"],
  ["C04 Energy meter", "box", [90, 48, 125], [98, -65, 320], "#e6e8df"],
  ["C04 Meter display", "box", [65, 8, 34], [98, -93, 345], "#18344b"],
  ["C05 Protection DIN rail", "box", [300, 25, 15], [0, -45, 245], "#838b87"],
  ...[-120, -60, 0, 60, 120].map((x, i) => [`C05 Breaker ${i + 1}`, "box", [44, 44, 88], [x, -68, 203], i === 2 ? "#df7647" : "#e5e8df"]),
  ["C06 Communications gateway", "box", [110, 55, 65], [-105, -62, 105], "#28342e"],
  ...[45, 83, 121, 159].map((x, i) => [`C07 Terminal ${i + 1}`, "box", [30, 35, 48], [x, -63, 103], i < 2 ? "#3d88c4" : "#73a473"]),
  ["C08 Cabinet ventilation fan", "cylinder", [38, 18], [130, -85, 380], "#2b3431", [Math.PI / 2, 0, 0]],
  ["S01 Solar stand", "cylinder", [15, 260], [-640, 380, 130], "#8d9792"],
  ["S01 PV module frame", "box", [510, 30, 320], [-640, 380, 400], "#39464a", [-0.25, 0, 0]],
  ...[-820, -700, -580, -460].map((x, i) => [`S01 PV cell strip ${i + 1}`, "box", [110, 8, 284], [x, 355, 400], "#285f78", [-0.25, 0, 0]]),
  ["F01 Water conduit", "cylinder", [57, 430], [-650, -390, 145], "#3f8abc", [0, Math.PI / 2, 0]],
  ["F01 Turbine casing", "cylinder", [100, 75], [-650, -390, 165], "#828d88", [Math.PI / 2, 0, 0]],
  ["F01 Rotor hub", "cylinder", [45, 85], [-650, -342, 165], "#c98139", [Math.PI / 2, 0, 0]],
  ["F01 Generator housing", "box", [145, 110, 95], [-650, -245, 170], "#24343b"],
  ["B01 Anaerobic digester", "cylinder", [130, 270], [610, -390, 135], "#528665"],
  ["B01 Gas holder dome", "sphere", [125], [610, -390, 285], "#73a87c"],
  ["B01 Engine generator", "box", [180, 130, 110], [810, -390, 70], "#2b332f"],
  ["B01 Biogas line", "cylinder", [12, 175], [730, -390, 175], "#d89b3d", [0, Math.PI / 2, 0]],
  ["W01 Tower", "cylinder", [17, 520], [650, 390, 260], "#bfc8c2"],
  ["W01 Nacelle", "box", [150, 78, 65], [650, 390, 545], "#e0e6e0"],
  ["W01 Rotor hub", "cylinder", [28, 45], [650, 330, 545], "#d69642", [Math.PI / 2, 0, 0]],
  ["W01 Blade 1", "box", [27, 16, 225], [650, 300, 680], "#e7ece7"],
  ["W01 Blade 2", "box", [27, 16, 225], [764, 300, 477], "#e7ece7", [0, -2.094, 0]],
  ["W01 Blade 3", "box", [27, 16, 225], [536, 300, 477], "#e7ece7", [0, 2.094, 0]],
];

// The first edition was only a blockout. These smaller features give every
// subsystem a more recognizable, inspectable physical form in the CAD editor.
const add = (name, type, dimensions, position, color, rotation) =>
  parts.push([name, type, dimensions, position, color, rotation]);
const steel = "#8e9b98";
const black = "#1a2527";
const white = "#e8ebe5";
const copper = "#b87935";

// Enclosure: recessed instrument door, seals, hinges and readable controls.
add("C01 Door inset panel", "box", [322, 4, 398], [430, -260, 220], "#b9c5c1");
add("C01 Door gasket", "box", [290, 3, 360], [430, -264, 220], black);
add("C01 Smoked inspection window", "box", [258, 4, 170], [430, -268, 304], "#233945");
add("C01 Window internal display", "box", [172, 3, 82], [430, -272, 312], "#14546c");
for (const x of [292, 568]) {
  add(`C01 Door vertical trim ${x}`, "box", [7, 7, 402], [x, -267, 220], steel);
}
for (const z of [22, 418]) {
  add(`C01 Door horizontal trim ${z}`, "box", [310, 7, 7], [430, -267, z], steel);
}
for (const z of [95, 350]) {
  add(`C01 Hinge barrel ${z}`, "cylinder", [11, 52], [255, -208, z], steel);
}
add("C01 Door handle escutcheon", "box", [25, 10, 85], [565, -272, 210], black);
add("C01 Door handle shaft", "cylinder", [11, 28], [565, -285, 210], copper, [Math.PI / 2, 0, 0]);
add("C01 Door handle grip", "box", [12, 19, 60], [565, -305, 194], steel);
for (let i = 0; i < 3; i += 1) {
  add(`C01 Door status lamp ${i + 1}`, "cylinder", [8, 5], [355 + i * 28, -278, 163], ["#4fbf79", "#e6b451", "#c7544d"][i], [Math.PI / 2, 0, 0]);
}
for (let i = 0; i < 10; i += 1) {
  add(`C01 Cooling vent ${i + 1}`, "box", [45, 4, 4], [353 + (i % 5) * 35, -270, 68 + Math.floor(i / 5) * 12], "#596866");
}
for (const x of [-155, 155]) {
  for (const z of [30, 410]) {
    add(`C01 Mounting bolt ${x} ${z}`, "cylinder", [6, 4], [x, -86, z], copper, [Math.PI / 2, 0, 0]);
  }
}

// Realistic controller-board cues: shield, headers, USB and mounted passives.
add("C03 ESP32 RF shield", "box", [38, 3, 29], [-105, -80, 355], "#b5bdb9");
add("C03 Antenna keep-out", "box", [48, 3, 10], [-105, -81, 375], "#c99f5b");
add("C03 USB-C connector", "box", [18, 10, 8], [-95, -83, 318], steel);
for (const x of [-128, -82]) {
  for (let i = 0; i < 8; i += 1) {
    add(`C03 Header ${x} pin ${i + 1}`, "box", [3, 4, 3], [x, -82, 331 + i * 5], copper);
  }
}
for (let i = 0; i < 12; i += 1) {
  add(`C03 SMD component ${i + 1}`, "box", [6, 3, 3], [-151 + (i % 6) * 16, -79, 300 + Math.floor(i / 6) * 10], i % 3 ? "#242e2c" : "#bcb7a2");
}
for (let i = 0; i < 4; i += 1) {
  add(`C03 Plug-in relay ${i + 1}`, "box", [24, 19, 22], [-148 + i * 31, -85, 385], "#273f45");
}
for (let i = 0; i < 6; i += 1) {
  add(`C03 Copper trace ${i + 1}`, "box", [39, 2, 1.5], [-147 + (i % 3) * 35, -78, 286 + Math.floor(i / 3) * 8], copper);
}

// Meter, protection devices and terminal screws.
add("C04 Meter display glass", "box", [59, 3, 25], [98, -99, 345], "#61a9ad");
for (let i = 0; i < 3; i += 1) {
  add(`C04 Meter soft key ${i + 1}`, "cylinder", [5, 3], [76 + i * 21, -96, 291], "#879792", [Math.PI / 2, 0, 0]);
}
for (let i = 0; i < 5; i += 1) {
  const x = -120 + i * 60;
  add(`C05 Breaker ${i + 1} front face`, "box", [39, 3, 75], [x, -93, 203], white);
  add(`C05 Breaker ${i + 1} switch`, "box", [13, 8, 21], [x, -99, 210], i === 2 ? "#bd5e43" : "#313b3b");
  add(`C05 Breaker ${i + 1} indicator`, "box", [22, 2, 5], [x, -95, 170], i === 2 ? "#bd5e43" : "#6e9f75");
  for (const z of [161, 245]) {
    add(`C05 Breaker ${i + 1} screw ${z}`, "cylinder", [4, 3], [x, -95, z], steel, [Math.PI / 2, 0, 0]);
  }
}
for (let i = 0; i < 4; i += 1) {
  const x = 45 + i * 38;
  add(`C07 Terminal ${i + 1} face`, "box", [24, 4, 39], [x, -83, 104], i < 2 ? "#2d709d" : "#5d9168");
  add(`C07 Terminal ${i + 1} screw`, "cylinder", [6, 4], [x, -87, 113], steel, [Math.PI / 2, 0, 0]);
  add(`C07 Terminal ${i + 1} port`, "box", [12, 3, 7], [x, -87, 89], black);
}
for (let i = 0; i < 8; i += 1) {
  add(`C08 Fan guard spoke ${i + 1}`, "box", [4, 4, 68], [130, -98, 380], steel, [0, i * Math.PI / 4, 0]);
}
for (const x of [-164, 164]) {
  add(`C02 Slotted cable duct spine ${x}`, "box", [18, 28, 345], [x, -49, 219], "#596967");
  for (let i = 0; i < 12; i += 1) {
    add(`C02 Cable duct slot ${x} ${i + 1}`, "box", [20, 3, 8], [x, -66, 67 + i * 27], black);
  }
}
for (const z of [58, 268]) {
  add(`C02 Horizontal cable duct ${z}`, "box", [315, 28, 18], [0, -49, z], "#596967");
}
const wireColors = ["#b64e3e", "#2f759a", "#222c2e", "#be9e46", "#5f9b68"];
for (let i = 0; i < 5; i += 1) {
  const x = -120 + i * 60;
  add(`C09 Breaker output lead ${i + 1}`, "cylinder", [3, 52], [x, -98, 136], wireColors[i]);
  add(`C09 Breaker input lead ${i + 1}`, "cylinder", [3, 35], [x, -98, 269], wireColors[i]);
}
for (let i = 0; i < 4; i += 1) {
  add(`C09 Field terminal lead ${i + 1}`, "cylinder", [3, 38], [45 + i * 38, -90, 63], wireColors[i]);
}
for (const x of [-140, 140]) {
  for (const z of [24, 415]) {
    add(`C01 Cabinet captive fastener ${x} ${z}`, "cylinder", [5, 5], [x, -94, z], steel, [Math.PI / 2, 0, 0]);
  }
}

// PV: cell matrix, busbars, side rails, clamps and junction box.
for (let row = 0; row < 4; row += 1) {
  for (let col = 0; col < 8; col += 1) {
    add(`S01 PV glass cell R${row + 1} C${col + 1}`, "box", [56, 3, 64], [-852 + col * 61, 348, 292 + row * 72], (row + col) % 3 === 0 ? "#20556f" : "#174c65", [-0.25, 0, 0]);
    add(`S01 Cell busbar R${row + 1} C${col + 1}`, "box", [2, 2, 57], [-852 + col * 61, 344, 292 + row * 72], "#96afaf", [-0.25, 0, 0]);
  }
}
for (const x of [-902, -378]) {
  add(`S01 Aluminum edge rail ${x}`, "box", [10, 36, 328], [x, 374, 400], steel, [-0.25, 0, 0]);
}
for (const z of [231, 569]) {
  add(`S01 Aluminum end rail ${z}`, "box", [530, 36, 10], [-640, 374, z], steel, [-0.25, 0, 0]);
}
add("S01 Junction box", "box", [110, 42, 55], [-640, 425, 400], black);
for (const x of [-860, -420]) {
  add(`S01 Frame clamp ${x}`, "box", [34, 45, 12], [x, 400, 235], steel);
}

// Micro-hydro: two pipe flanges, turbine access face, bolts and generator fins.
for (const x of [-862, -438]) {
  add(`F01 Pipe flange ${x}`, "cylinder", [79, 23], [x, -390, 145], steel, [0, Math.PI / 2, 0]);
  add(`F01 Inner flange ${x}`, "cylinder", [58, 25], [x + (x < -650 ? -12 : 12), -390, 145], "#307ca9", [0, Math.PI / 2, 0]);
}
add("F01 Turbine access cover", "cylinder", [87, 10], [-650, -333, 165], "#abb7b2", [Math.PI / 2, 0, 0]);
for (let i = 0; i < 10; i += 1) {
  const a = i * Math.PI * 2 / 10;
  add(`F01 Turbine cover bolt ${i + 1}`, "cylinder", [5, 6], [-650 + Math.cos(a) * 74, -325, 165 + Math.sin(a) * 74], copper, [Math.PI / 2, 0, 0]);
}
for (let i = 0; i < 8; i += 1) {
  add(`F01 Generator cooling fin ${i + 1}`, "box", [8, 118, 101], [-707 + i * 16, -245, 170], "#5d6b6d");
}
add("F01 Generator terminal housing", "box", [70, 65, 40], [-650, -245, 241], black);
add("F01 Turbine shaft", "cylinder", [18, 100], [-650, -289, 165], steel, [Math.PI / 2, 0, 0]);

// Biogas: service hatches, reinforced tank bands, valve and generator cooling.
for (const z of [55, 145, 245]) {
  add(`B01 Tank reinforcing band ${z}`, "cylinder", [134, 9], [610, -390, z], steel);
}
add("B01 Inspection hatch", "cylinder", [40, 8], [610, -526, 134], white, [Math.PI / 2, 0, 0]);
add("B01 Hatch fastener", "cylinder", [9, 10], [610, -538, 134], copper, [Math.PI / 2, 0, 0]);
add("B01 Pressure gauge body", "cylinder", [21, 8], [730, -390, 288], white, [Math.PI / 2, 0, 0]);
add("B01 Pressure gauge dial", "cylinder", [16, 3], [730, -396, 288], black, [Math.PI / 2, 0, 0]);
add("B01 Manual shutoff valve", "box", [35, 44, 33], [730, -390, 195], copper);
for (let i = 0; i < 7; i += 1) {
  add(`B01 Genset cooling louver ${i + 1}`, "box", [7, 6, 62], [745 + i * 19, -460, 71], steel);
}
add("B01 Generator exhaust", "cylinder", [16, 110], [845, -390, 176], black);
add("B01 Generator fuel valve", "cylinder", [12, 37], [735, -390, 70], copper, [0, Math.PI / 2, 0]);

// Wind: base flange, tower collars, nacelle ventilation and anemometer.
add("W01 Tower foundation flange", "cylinder", [58, 17], [650, 390, 9], steel);
for (const z of [140, 275, 405]) {
  add(`W01 Tower collar ${z}`, "cylinder", [21, 12], [650, 390, z], steel);
}
for (let i = 0; i < 6; i += 1) {
  add(`W01 Nacelle vent ${i + 1}`, "box", [9, 3, 27], [600 + i * 18, 347, 547], "#899792");
}
add("W01 Rotor nose cone", "sphere", [29], [650, 306, 545], white);
add("W01 Anemometer mast", "cylinder", [4, 44], [705, 390, 601], black);
add("W01 Anemometer sensor", "sphere", [11], [705, 390, 630], black);
for (const x of [575, 725]) {
  add(`W01 Nacelle seam ${x}`, "box", [4, 82, 67], [x, 390, 545], steel);
}

const nodes = parts.map(([name, type, dimensions, position, color, rotation = [0, 0, 0]], index) => ({
  id: `welos-concept-${String(index + 1).padStart(3, "0")}`,
  name,
  kind: "primitive",
  type,
  params: type === "box" ? { width: dimensions[0], depth: dimensions[1], height: dimensions[2] }
    : type === "cylinder" ? { radius: dimensions[0], height: dimensions[1] }
    : { radius: dimensions[0] },
  transform: { position, rotation, scale: [1, 1, 1] },
  color,
}));

const outputPath = resolve(process.argv[2] || "docs/models/welos-owlcad-document.json");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify({ version: 5, nodes }, null, 2) + "\n");
console.log(`Exported ${nodes.length} editable OwlCAD parts to ${outputPath}`);
