import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createWelosAssembly } from "../src/model/scene.js";

class NodeFileReader {
  result = null;
  onloadend = null;

  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }

  async readAsDataURL(blob) {
    const bytes = Buffer.from(await blob.arrayBuffer());
    this.result = `data:${blob.type || "application/octet-stream"};base64,${bytes.toString("base64")}`;
    this.onloadend?.();
  }
}

globalThis.FileReader ??= NodeFileReader;

const outputPath = resolve(process.argv[2] || "output/welos-concept-system.glb");
const assembly = createWelosAssembly();
assembly.traverse((object) => {
  if (object.userData) object.userData = {};
});

const result = await new GLTFExporter().parseAsync(assembly, { binary: true, onlyVisible: true });
await writeFile(outputPath, Buffer.from(result));
console.log(`Exported ${outputPath} (${(result.byteLength / 1024).toFixed(1)} KiB)`);
