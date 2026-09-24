import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

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

const inputPath = resolve(process.argv[2] || "docs/models/welos-owlcad-document-v2.json");
const outputPath = resolve(process.argv[3] || "docs/models/welos-system-v2.glb");
const document = JSON.parse(await readFile(inputPath, "utf8"));
if (document.version !== 5 || !Array.isArray(document.nodes)) throw new Error("Invalid OwlCAD document");

const model = new THREE.Group();
model.name = "WELOS system — detailed visual concept";
model.rotation.x = -Math.PI / 2;
const geometryCache = new Map();
const materialCache = new Map();
const getMaterial = (hex) => {
  if (!materialCache.has(hex)) {
    const metallic = ["#8e9b98", "#89948f", "#b9c5c1", "#aeb9b5", "#b5bdb9", "#e8ebe5", "#e0e6e0", "#d8dfd9", "#b87935", "#c98139"].includes(hex);
    materialCache.set(hex, new THREE.MeshStandardMaterial({
      color: hex,
      metalness: metallic ? 0.66 : 0.1,
      roughness: metallic ? 0.32 : 0.48,
    }));
  }
  return materialCache.get(hex);
};

for (const part of document.nodes) {
  const p = part.params;
  const key = `${part.type}:${JSON.stringify(p)}`;
  let geometry = geometryCache.get(key);
  if (!geometry) {
    if (part.type === "box") {
      const edge = Math.min(p.width, p.depth, p.height) * 0.08;
      geometry = new RoundedBoxGeometry(p.width, p.depth, p.height, 2, Math.min(edge, 4));
    } else if (part.type === "cylinder") {
      geometry = new THREE.CylinderGeometry(p.radius, p.radius, p.height, 32);
      geometry.rotateX(Math.PI / 2); // OwlCAD cylinders are vertical along Z.
    } else if (part.type === "sphere") {
      geometry = new THREE.SphereGeometry(p.radius, 32, 20);
    } else {
      throw new Error(`Unsupported primitive: ${part.type}`);
    }
    geometryCache.set(key, geometry);
  }
  const mesh = new THREE.Mesh(geometry, getMaterial(part.color));
  mesh.name = part.name;
  mesh.position.set(...part.transform.position);
  mesh.rotation.set(...part.transform.rotation);
  mesh.scale.set(...part.transform.scale);
  model.add(mesh);
}

const result = await new GLTFExporter().parseAsync(model, { binary: true, onlyVisible: true });
await writeFile(outputPath, Buffer.from(result));
console.log(`Exported ${document.nodes.length} parts to ${outputPath} (${(result.byteLength / 1024 / 1024).toFixed(2)} MiB)`);
