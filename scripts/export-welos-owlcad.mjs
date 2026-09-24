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
