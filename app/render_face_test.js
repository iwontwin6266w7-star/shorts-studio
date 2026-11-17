import { createCanvas } from "canvas";
import fs from "node:fs";
import * as toon from "./src/videos/nightmarket/toon.ts";

const width = 600;
const height = 1000;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// Background
ctx.fillStyle = "#f6ecd2";
ctx.fillRect(0, 0, width, height);

const p = new toon.Pen(ctx);

// Draw a giant close-up head in the centre to clearly show features
const hx = 300;
const hy = 400;
const ha = 160; // head half width
const H = toon.headBlob(1, ha, 1);
const hp = toon.blobPts(hx, hy, H);

// Skin
p.shadedFill(hp, "#ffe2c2", "#e6b090", -2.1, ha);
p.inkRing(hp, 14, 1.2);

// Hat (cap)
const outfit = toon.soldier(0, { hat: "cap", cap: "#e2453c" });
// We can test faceFront directly or soldier body
toon.soldier(0);

// Draw faceFront by accessing internal or drawing character
toon.soldier(0);
const outfitObj = toon.soldier(2, { hat: "shako" });
toon.bodyFront(p, outfitObj, {
  expr: "grin",
  facing: 1,
  look: 0.5,
  blink: 0,
  light: -2.1,
  seed: 2
});

const buffer = canvas.toBuffer("image/png");
fs.writeFileSync("/root/shorts-studio/app/face_test.png", buffer);
console.log("Saved face_test.png successfully!");
