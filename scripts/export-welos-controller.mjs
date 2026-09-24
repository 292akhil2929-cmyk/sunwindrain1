import { readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile("docs/models/welos-owlcad-document-v2.json", "utf8"));
const nodes = source.nodes.filter((node) => node.name.startsWith("C"));
await writeFile("docs/models/welos-controller-detail.json", JSON.stringify({ version: 5, nodes }, null, 2) + "\n");
console.log(`Exported ${nodes.length} controller parts`);
