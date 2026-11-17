// Static scenery: merged batches (one mesh per material), box-section strands rebuilt along a path every frame
// (chains, rails), the town on both banks (kept for fly-over shots) and the NIGHT MARKET dressing: stalls, lantern
// strings, lamp trees, the upside-down flower shop, clockwork shop, the cage of keys, the water-subway rails and
// the bedroom / rooftop interior zones. Ground y = 0 everywhere (CONTRACT layout pins).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { brick, rng, ctex, rep, facadeHD, roofHD, stoneHD, cobbleHD, planksHD, beamHD } from "./paint";
import { twoTone } from "./shade";

export type Kit = Record<string, THREE.Object3D>;
export type V3 = [number, number, number];
/** bank top / deck height of the inherited bridge town (was story.ts D0; defined here so the world does not
 *  depend on story physics — the market ground itself sits at y = 0, the canal water surface) */
export const D0 = 6.0;
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------- materials (shared, cached) ----------------
const mats = new Map<string, THREE.Material>();
/** materials whose Strands are built as real interlocking chain links (MAT pass) instead of a textured box tube */
const CHAIN_MATS = new WeakSet<THREE.Material>();
export const lam = (key: string, make: () => THREE.MeshLambertMaterialParameters) => {
  let m = mats.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) {
    if (key === "chainHD") {
      // MAT pass: the chain material (world.ts) becomes slate blue-grey iron with a soft painted-metal highlight;
      // its Strands switch to link geometry, so links read in close-ups (bank f1780, overhead f1650)
      const c = twoTone(new THREE.MeshPhongMaterial({ color: "#7a8490", specular: "#6c727b", shininess: 30 }));
      CHAIN_MATS.add(c);
      m = c as unknown as THREE.MeshLambertMaterial;
    } else m = twoTone(new THREE.MeshLambertMaterial(make()));
    mats.set(key, m);
  }
  return m;
};
const lamOf = new Map<string, THREE.MeshLambertMaterial>();
// the nature kit ships a teal palette; our valley wants storybook greens and browns
const GREENS = ["#62ae4c", "#56a447", "#72b853"];
const RECOLOR: Record<string, string> = { grass: "#6aab4f", leafsDark: "#4a9142", woodBark: "#8a5a3c", woodInner: "#e8cfa4", wood: "#a8724a",
  woodDark: "#7a4f33", dirt: "#8a6a4a", stone: "#b7b4ad" };
/** Kenney GLB materials -> Lambert, so the whole world shares one lighting model */
const toLambert = (m: THREE.Material) => {
  let l = lamOf.get(m.uuid);
  if (!l) {
    const s = m as THREE.MeshStandardMaterial;
    const col = m.name === "leafsGreen" ? GREENS[lamOf.size % 3] : RECOLOR[m.name];
    l = twoTone(new THREE.MeshLambertMaterial({ color: col ? new THREE.Color(col) : s.color?.clone() ?? new THREE.Color("#ffffff"), map: s.map ?? null, side: s.side, alphaTest: s.alphaTest }));
    lamOf.set(m.uuid, l);
  }
  return l;
};

// ---------------- geometry pieces ----------------
const f32 = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.Float32BufferAttribute(out, a.itemSize);
};
/** quad a,b,c,d counter-clockwise seen from its front; uv (u0,v0) at a, (u1,v1) at c */
export const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u1 = 1, v1 = 1, u0 = 0, v0 = 0) => {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2, 3, 4, 5].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2));
  return g;
};
export const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  return g;
};
/** axis box from min to max, texture tiled every `tile` metres (0 = one image per face) */
export const boxGeo = (min: THREE.Vector3, max: THREE.Vector3, tile = 0, bottom = false) => {
  const [x0, y0, z0] = [min.x, min.y, min.z], [x1, y1, z1] = [max.x, max.y, max.z];
  const t = (a: number) => (tile ? a / tile : 1);
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const faces = [
    quad(V(x0, y0, z1), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z1), t(w), t(h)),
    quad(V(x1, y0, z0), V(x0, y0, z0), V(x0, y1, z0), V(x1, y1, z0), t(w), t(h)),
    quad(V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z0), t(d), t(h)),
    quad(V(x1, y0, z1), V(x1, y0, z0), V(x1, y1, z0), V(x1, y1, z1), t(d), t(h)),
    quad(V(x0, y1, z1), V(x1, y1, z1), V(x1, y1, z0), V(x0, y1, z0), t(w), t(d)),
  ];
  if (bottom) faces.push(quad(V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1), t(w), t(d)));
  return mergeGeometries(faces, false);
};

/** collects pieces by material and merges them into one static mesh per material */
export class Batch {
  private g = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) {
    const src = geo.index ? geo.toNonIndexed() : geo;
    const x = new THREE.BufferGeometry();
    x.setAttribute("position", f32(src.attributes.position));
    if (src.attributes.normal) x.setAttribute("normal", f32(src.attributes.normal)); else x.computeVertexNormals();
    x.setAttribute("uv", src.attributes.uv ? f32(src.attributes.uv) : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (m) x.applyMatrix4(m);
    const l = this.g.get(mat);
    if (l) l.push(x); else this.g.set(mat, [x]);
  }
  addObject(o: THREE.Object3D, m: THREE.Matrix4) {
    o.updateMatrixWorld(true);
    o.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh) return;
      this.add(mesh.geometry, toLambert(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material), new THREE.Matrix4().multiplyMatrices(m, mesh.matrixWorld));
    });
  }
  build(parent: THREE.Object3D, cast = true) {
    for (const [mat, list] of this.g) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.g.clear();
  }
}

// ---------------- strands: box-section tube along a path, rebuilt in place ----------------
// chain-link template (MAT pass): a stadium-shaped ring tube in link space (x along the chain, y in the ring plane,
// z across), NS centre-line samples x NR tube sides, smooth normals (clean ink silhouettes, no facet creases)
const LNS = 16, LNR = 6;
type LinkT = { p: Float32Array; n: Float32Array; idx: number[]; pitch: number };
const linkTemplate = (h: number): LinkT => {
  const ow = h * 0.85, rb = ow * 0.14, ol = ow * 1.62, rc = ow / 2 - rb, hl = ol / 2 - rb - rc;
  const p = new Float32Array(LNS * LNR * 3), n = new Float32Array(LNS * LNR * 3), idx: number[] = [];
  for (let j = 0; j < LNS; j++) {
    const th = (2 * Math.PI * (j + 0.5)) / LNS, nx = Math.cos(th), ny = Math.sin(th);
    const cx = rc * nx + Math.sign(nx) * hl, cy = rc * ny;
    for (let k = 0; k < LNR; k++) {
      const ph = (2 * Math.PI * k) / LNR, cp = Math.cos(ph), sp = Math.sin(ph), o = (j * LNR + k) * 3;
      p[o] = cx + rb * cp * nx; p[o + 1] = cy + rb * cp * ny; p[o + 2] = rb * sp;
      n[o] = cp * nx; n[o + 1] = cp * ny; n[o + 2] = sp;
      const a = j * LNR + k, b = j * LNR + ((k + 1) % LNR), c = ((j + 1) % LNS) * LNR + ((k + 1) % LNR), d = ((j + 1) % LNS) * LNR + k;
      idx.push(a, d, c, a, c, b); // outward winding
    }
  }
  return { p, n, idx, pitch: ol - 4 * rb };
};

export class Strand {
  mesh: THREE.Mesh;
  private pos: Float32Array; private nor: Float32Array; private uv: Float32Array;
  private lt: LinkT | null = null; private maxLinks = 0;
  constructor(public n: number, public w: number, public h: number, mat: THREE.Material, public tile = 1, cast = true) {
    const g = new THREE.BufferGeometry();
    if (CHAIN_MATS.has(mat)) {
      // link mode: up to maxLinks interlocking links laid along the path every frame (draw range = links used)
      const lt = (this.lt = linkTemplate(h)), nv = LNS * LNR;
      this.maxLinks = 440;
      this.pos = new Float32Array(this.maxLinks * nv * 3); this.nor = new Float32Array(this.maxLinks * nv * 3); this.uv = new Float32Array(this.maxLinks * nv * 2);
      const idx = new Uint32Array(this.maxLinks * lt.idx.length);
      for (let l = 0; l < this.maxLinks; l++) for (let i = 0; i < lt.idx.length; i++) idx[l * lt.idx.length + i] = lt.idx[i] + l * nv;
      g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(this.uv, 2));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.setDrawRange(0, 0);
    } else {
      this.pos = new Float32Array(n * 12); this.nor = new Float32Array(n * 12); this.uv = new Float32Array(n * 8);
      g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(this.uv, 2));
      const idx: number[] = [];
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < 4; k++) {
        const a = i * 4 + k, b = i * 4 + ((k + 1) % 4), c = (i + 1) * 4 + ((k + 1) % 4), d = (i + 1) * 4 + k;
        idx.push(a, b, c, a, c, d);
      }
      g.setIndex(idx);
    }
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false; this.mesh.castShadow = cast; this.mesh.receiveShadow = true;
  }
  private T = new THREE.Vector3(); private S = new THREE.Vector3(); private N = new THREE.Vector3();
  /** link mode: links every `pitch` along the polyline, centred, alternating ring plane (vertical / horizontal) */
  private setLinks(pts: THREE.Vector3[], lt: LinkT) {
    const { T, S, N } = this, nv = LNS * LNR;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = cum[cum.length - 1], count = Math.max(0, Math.min(this.maxLinks, Math.floor(total / lt.pitch)));
    const s0 = (total - (count - 1) * lt.pitch) / 2;
    let seg = 1;
    for (let l = 0; l < count; l++) {
      const s = s0 + l * lt.pitch;
      while (seg < pts.length - 1 && cum[seg] < s) seg++;
      const a = pts[seg - 1], b = pts[seg], u = (s - cum[seg - 1]) / Math.max(1e-6, cum[seg] - cum[seg - 1]);
      const px = a.x + (b.x - a.x) * u, py = a.y + (b.y - a.y) * u, pz = a.z + (b.z - a.z) * u;
      T.subVectors(b, a).normalize();
      S.set(-T.z, 0, T.x); // T x up
      if (S.lengthSq() < 1e-6) S.set(1, 0, 0);
      S.normalize(); N.crossVectors(S, T).normalize();
      const odd = l % 2 === 1;
      // ring plane: (T, N) for even links, (T, S) for odd links; z (thickness) across it
      const yx = odd ? S.x : N.x, yy = odd ? S.y : N.y, yz = odd ? S.z : N.z;
      const zx = odd ? -N.x : S.x, zy = odd ? -N.y : S.y, zz = odd ? -N.z : S.z;
      const base = l * nv * 3;
      for (let v = 0; v < nv * 3; v += 3) {
        const x = lt.p[v], y = lt.p[v + 1], z = lt.p[v + 2], o = base + v;
        this.pos[o] = px + T.x * x + yx * y + zx * z;
        this.pos[o + 1] = py + T.y * x + yy * y + zy * z;
        this.pos[o + 2] = pz + T.z * x + yz * y + zz * z;
        const nx = lt.n[v], ny = lt.n[v + 1], nz = lt.n[v + 2];
        this.nor[o] = T.x * nx + yx * ny + zx * nz;
        this.nor[o + 1] = T.y * nx + yy * ny + zy * nz;
        this.nor[o + 2] = T.z * nx + yz * ny + zz * nz;
      }
    }
    const g = this.mesh.geometry;
    g.setDrawRange(0, count * lt.idx.length);
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
  }
  set(pts: THREE.Vector3[]) {
    if (this.lt) { this.setLinks(pts, this.lt); return; }
    const { T, S, N } = this;
    let len = 0;
    for (let i = 0; i < this.n; i++) {
      const p = pts[Math.min(i, pts.length - 1)];
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      T.subVectors(b, a).normalize();
      S.crossVectors(T, V(0, 1, 0));
      if (S.lengthSq() < 1e-6) S.set(1, 0, 0);
      S.normalize(); N.crossVectors(S, T).normalize();
      if (i) len += p.distanceTo(pts[Math.min(i - 1, pts.length - 1)]);
      for (let k = 0; k < 4; k++) {
        const sx = k === 0 || k === 3 ? -1 : 1, sy = k < 2 ? -1 : 1, j = (i * 4 + k) * 3;
        this.pos[j] = p.x + S.x * sx * this.w / 2 + N.x * sy * this.h / 2;
        this.pos[j + 1] = p.y + S.y * sx * this.w / 2 + N.y * sy * this.h / 2;
        this.pos[j + 2] = p.z + S.z * sx * this.w / 2 + N.z * sy * this.h / 2;
        const nx = S.x * sx + N.x * sy, ny = S.y * sx + N.y * sy, nz = S.z * sx + N.z * sy, nl = Math.hypot(nx, ny, nz);
        this.nor[j] = nx / nl; this.nor[j + 1] = ny / nl; this.nor[j + 2] = nz / nl;
        this.uv[(i * 4 + k) * 2] = k / 4; this.uv[(i * 4 + k) * 2 + 1] = len / this.tile;
      }
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.attributes.uv.needsUpdate = true;
  }
}

// ---------------- set dressing around the lens ----------------
/** a sight line of the film: from the lens toward the shot's subject, `len` along d (d has unit forward component) */
export type Ray = { o: THREE.Vector3; d: THREE.Vector3; len: number; core: boolean };
let sight: Ray[] = [];
/** does any sight line pass through this box? (centre lines only for small props, so they can still frame a shot) */
const inTheWay = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, coreOnly = false) => {
  for (const { o, d, len, core } of sight) {
    if (coreOnly && !core) continue;
    let t0 = 0, t1 = len;
    for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
      if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) t0 = Infinity; continue; }
      const ta = (a - oo) / dd, tb = (b - oo) / dd;
      t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
    }
    if (t0 <= t1) return true;
  }
  return false;
};

// ---------------- cartoon vegetation (MAT pass) ----------------
// Kenney's faceted low-poly trees and box hedges -> rounded storybook shapes: clustered smooth spheres for canopies
// (the two-tone sun term gives each lobe a lit cap and a cool belly), tapered trunks, rounded-box hedges. Smooth
// normals mean the world ink draws clean silhouettes and lobe-to-lobe folds instead of a crease on every facet.
type VegKind = "round" | "fat" | "tall" | "cone" | "bush" | "hedge";
const VEG: Record<string, VegKind> = {
  tree_oak: "round", tree_default: "round", tree_detailed: "round", tree_fat: "fat", "tree-high-round": "tall", tree: "tall",
  tree_cone: "cone", plant_bushLarge: "bush", plant_bushDetailed: "bush", plant_bush: "bush", hedge: "hedge",
};
const LEAF = ["#5aa83c", "#4c9a37", "#69b545", "#55a243", "#3f8f3c"];
/** canopy paint (equal px per metre on a unit sphere: 256 around x 128 pole to pole): light crown, darker belly,
 *  soft leaf-clump dabs (kept low contrast: the two-tone sun term does the main modelling) */
const leafTex = (i: number) => ctex("leafHD" + i, 256, 128, (g, r) => {
  const base = new THREE.Color(LEAF[i]), top = base.clone().offsetHSL(0.012, 0.03, 0.08), bot = base.clone().offsetHSL(-0.015, 0.0, -0.08);
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#" + top.getHexString()); gr.addColorStop(0.42, "#" + base.getHexString()); gr.addColorStop(1, "#" + bot.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  for (let k = 0; k < 46; k++) {
    const x = r() * 256, y = 10 + r() * 108, rad = 5 + r() * 9, light = y < 64 ? r() < 0.7 : r() < 0.25;
    for (const ox of [-256, 0, 256]) {
      g.strokeStyle = light ? "rgba(225,255,170,0.22)" : "rgba(20,70,30,0.2)"; g.lineWidth = 2.5; g.lineCap = "round";
      g.beginPath(); g.arc(x + ox, y + rad * 0.6, rad, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    }
  }
});
const leafMat = (i: number) => lam("leafHD" + i, () => ({ map: leafTex(i) }));
const barkMat = () => lam("barkHD", () => ({ color: "#8f5d3b" }));
const vegGeo = new Map<string, THREE.BufferGeometry>();
const lobeGeo = (q: number) => {
  const k = "lobe" + q;
  let g = vegGeo.get(k);
  if (!g) { g = new THREE.SphereGeometry(1, [20, 14, 10][q], [14, 10, 7][q]); vegGeo.set(k, g); }
  return g;
};
const trunkGeo = () => {
  let g = vegGeo.get("trunk");
  if (!g) { g = new THREE.CylinderGeometry(0.6, 1, 1, 10, 1, true).translate(0, 0.5, 0); vegGeo.set("trunk", g); }
  return g;
};
/** rounded box (exact: inner box + radius), unit size along x, smooth normals; used for hedges */
const hedgeGeo = () => {
  let g = vegGeo.get("hedge");
  if (!g) {
    g = new THREE.BoxGeometry(1, 1, 1, 18, 10, 10);
    const p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
    // per-axis rounding radii in unit space (~0.35 m at the ends, ~0.45 m on top / sides at 3.3 x 1.56 x 1.17 m);
    // flat bottom (it sits on the lawn)
    const R = [0.106, 0.29, 0.385], v = new THREE.Vector3(), e = new THREE.Vector3(), q = [0, 0, 0];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      for (let a = 0; a < 3; a++) {
        const c = v.getComponent(a), lim = a === 1 && c < 0 ? 0.5 : 0.5 - R[a];
        q[a] = THREE.MathUtils.clamp(c, -lim, lim); e.setComponent(a, (c - q[a]) / R[a]);
      }
      const L = e.length();
      if (L < 1e-6) continue;
      e.divideScalar(L);
      p.setXYZ(i, q[0] + e.x * R[0], q[1] + e.y * R[1], q[2] + e.z * R[2]);
      const nn = new THREE.Vector3(e.x / R[0], e.y / R[1], e.z / R[2]).normalize();
      n.setXYZ(i, nn.x, nn.y, nn.z);
    }
    g.translate(0, 0.5, 0);
    vegGeo.set("hedge", g);
  }
  return g;
};
const yawQ = (a: number) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);
/** half-width of a cartoon plant of kind k and height h (for the sight-line test) */
const vegRad = (k: VegKind, h: number) => (k === "hedge" ? 1.7 : k === "bush" ? 0.85 * h : k === "tall" ? 0.2 * h : k === "cone" ? 0.27 * h : k === "fat" ? 0.44 * h : 0.39 * h);
/** add one cartoon plant to a batch: base at (x, y, z), height h, q = lobe detail (0 near .. 2 far) */
const addVeg = (b: Batch, k: VegKind, x: number, y: number, z: number, h: number, seed: number, q = 0) => {
  const r = rng(Math.abs(Math.floor(seed)) % 200000 + 7), U = (a: number, c: number) => a + (c - a) * r();
  const leaf = leafMat(k === "cone" ? 4 : k === "hedge" ? 1 : Math.floor(r() * 4)), lobe = lobeGeo(q), yaw = r() * 6.28;
  const put = (px: number, py: number, pz: number, rad: number, sy = 0.9) =>
    b.add(lobe, leaf, new THREE.Matrix4().compose(V(x + px, y + py, z + pz), yawQ(r() * 6.28), V(rad, rad * sy, rad)));
  const trunk = (th: number, tr: number) =>
    b.add(trunkGeo(), barkMat(), new THREE.Matrix4().compose(V(x, y - 0.15, z), yawQ(yaw), V(tr, th + 0.15, tr)));
  const ring = (n: number, dist: number, r0: number, r1: number, cy: number, dy: number) => {
    const a0 = r() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i * 6.28) / n + U(-0.35, 0.35), dd = dist * U(0.85, 1.12);
      put(Math.cos(a) * dd, cy + U(-dy, dy), Math.sin(a) * dd, U(r0, r1));
    }
  };
  if (k === "round" || k === "fat") {
    const f = k === "fat";
    trunk((f ? 0.4 : 0.48) * h, 0.055 * h);
    const cy = (f ? 0.58 : 0.64) * h;
    put(0, cy, 0, (f ? 0.29 : 0.26) * h);
    ring(f ? 5 : 4, (f ? 0.22 : 0.18) * h, (f ? 0.19 : 0.17) * h, (f ? 0.23 : 0.21) * h, cy - 0.05 * h, 0.04 * h);
    put(U(-0.05, 0.05) * h, cy + (f ? 0.15 : 0.17) * h, U(-0.05, 0.05) * h, (f ? 0.19 : 0.17) * h);
  } else if (k === "tall") {
    trunk(0.34 * h, 0.045 * h);
    put(0, 0.47 * h, 0, 0.17 * h, 1.3);
    put(U(-0.03, 0.03) * h, 0.65 * h, U(-0.03, 0.03) * h, 0.15 * h, 1.3);
    put(0, 0.82 * h, 0, 0.11 * h, 1.25);
    ring(3, 0.1 * h, 0.1 * h, 0.12 * h, 0.55 * h, 0.06 * h);
  } else if (k === "cone") {
    trunk(0.2 * h, 0.05 * h);
    put(0, 0.3 * h, 0, 0.26 * h, 0.62);
    put(0, 0.5 * h, 0, 0.2 * h, 0.66);
    put(0, 0.68 * h, 0, 0.14 * h, 0.75);
    put(0, 0.84 * h, 0, 0.08 * h, 1.0);
  } else if (k === "bush") {
    put(0, 0.46 * h, 0, 0.5 * h);
    ring(3, 0.42 * h, 0.32 * h, 0.38 * h, 0.32 * h, 0.04 * h);
  } else { // hedge segment, 3.3 m along local x
    b.add(hedgeGeo(), leaf, new THREE.Matrix4().compose(V(x, y - 0.06, z), new THREE.Quaternion(), V(3.3, h + 0.06, Math.max(0.9, h * 0.78))));
  }
};

// ---------------- painted cloth banner (MAT round 3) ----------------
// The Kenney banner is one flat face of the saturated colour atlas: in golden light it kept a uniform, hot red and
// read as pasted on. Ours is a hanging cloth with real folds (smooth normals, so the two-tone light rolls across
// them), a swallow-tail hem, a muted crimson (sat ~-25 %) with an ochre border and a diamond like the tower flags.
const BANNER_COL: Record<string, string> = { "banner-red": "#b8553a", "banner-green": "#4f8a5a" }; // warm red: no purple in shade
const FOLD = 0.27, CLOTH_W = 1.1, CLOTH_H = 2.6; // fold period across the cloth, cloth size (m)
const bannerTex = (col: string) => ctex("bannerHD" + col, 256, 700, (g) => {
  const W = 256, H = 700, base = new THREE.Color(col);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#" + base.clone().offsetHSL(0, 0, 0.04).getHexString()); gr.addColorStop(1, "#" + base.clone().offsetHSL(0, 0, -0.06).getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x++) { // painted fold shading, in phase with the geometry folds
    const s = Math.sin((x / W) * (CLOTH_W / FOLD) * Math.PI * 2);
    g.fillStyle = s > 0 ? `rgba(255,235,215,${0.1 * s})` : `rgba(60,15,15,${-0.12 * s})`; g.fillRect(x, 0, 1, H);
  }
  g.fillStyle = "#" + base.clone().offsetHSL(0, -0.05, -0.12).getHexString(); g.fillRect(0, 0, W, 54); // top hem
  g.strokeStyle = "#d1aa5c"; g.lineWidth = 9; g.strokeRect(20, 66, W - 40, H - 86);                 // ochre border
  g.strokeStyle = "rgba(60,30,20,0.45)"; g.lineWidth = 2; g.strokeRect(14, 60, W - 28, H - 74); g.strokeRect(26, 72, W - 52, H - 98);
  g.fillStyle = "#d1aa5c"; g.fillRect(0, 46, W, 8);
  const cx = W / 2, cy = 250; // emblem: diamond (the tower flags' motif) on a light disc
  g.fillStyle = "#efe2c2"; g.beginPath(); g.arc(cx, cy, 62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(60,30,20,0.55)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#d1aa5c"; g.beginPath(); g.moveTo(cx, cy - 46); g.lineTo(cx + 34, cy); g.lineTo(cx, cy + 46); g.lineTo(cx - 34, cy); g.closePath(); g.fill();
  g.strokeStyle = "rgba(60,30,20,0.6)"; g.lineWidth = 2.5; g.stroke();
});
const bannerGeo = () => {
  let geo = vegGeo.get("banner");
  if (!geo) {
    const w = CLOTH_W, hh = CLOTH_H, notch = 0.42;
    geo = new THREE.PlaneGeometry(w, hh, 16, 20).translate(0, -hh / 2, 0); // top edge at y = 0
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), t = -y / hh; // 0 top .. 1 bottom
      p.setY(i, y + notch * (1 - Math.abs(x) / (w / 2)) * t * t);                              // swallow-tail hem
      p.setZ(i, (0.025 + 0.055 * t) * Math.sin((x / FOLD) * Math.PI * 2 + 0.6) + 0.04 * t * t); // folds deepen downwards
    }
    geo.computeVertexNormals();
    vegGeo.set("banner", geo);
  }
  return geo;
};
/** gonfalon on a pole where the Kenney banner plate stood: its plate hung 0.4 x scale beside the placement point,
 *  facing local +-x, so the pole goes there (same framing) and the cloth faces that way */
const bannerProp = (b: Batch, name: string, x0: number, y: number, z0: number, h: number, yaw0: number) => {
  const off = 0.4 * (h / 0.84), x = x0 + Math.cos(yaw0) * off, z = z0 - Math.sin(yaw0) * off, yaw = yaw0 + Math.PI / 2;
  if (inTheWay(x - 0.7, x + 0.7, y, y + h, z - 0.7, z + 0.7, true)) return;
  const col = BANNER_COL[name] ?? "#b4524b";
  const M = (px: number, py: number, pz: number) => new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z).multiply(new THREE.Matrix4().makeTranslation(px, py, pz));
  const pole = lam("bannerPole", () => ({ color: "#6e4b33" })), gold = lam("bannerGold", () => ({ color: "#c9a24e" }));
  b.add(new THREE.CylinderGeometry(0.045, 0.06, h, 10).translate(0, h / 2, 0), pole, M(0, 0, 0));
  b.add(new THREE.SphereGeometry(0.1, 14, 10), gold, M(0, h + 0.06, 0));
  b.add(new THREE.CylinderGeometry(0.03, 0.03, CLOTH_W + 0.2, 8).rotateZ(Math.PI / 2), pole, M(0, h - 0.18, 0.06));
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.045, 10, 8), gold, M(s * (CLOTH_W / 2 + 0.12), h - 0.18, 0.06));
  b.add(bannerGeo(), lam("bannerHD" + col, () => ({ map: bannerTex(col), side: THREE.DoubleSide })), M(0, h - 0.2, 0.1));
};

// ---------------- Kenney props ----------------
const boxes = new Map<THREE.Object3D, THREE.Box3>();
/** place a Kenney model with its base on y, scaled to height h (left out when it would stand in front of the lens).
 *  Trees, bushes and hedges are drawn as cartoon vegetation, banners as painted cloth instead (MAT pass). */
export const prop = (b: Batch, kit: Kit, name: string, x: number, y: number, z: number, h: number, yaw = 0) => {
  if (name.startsWith("banner")) { bannerProp(b, name, x, y, z, h, yaw); return; }
  const vk = VEG[name];
  if (vk) {
    const rad = vegRad(vk, h);
    if (inTheWay(x - rad, x + rad, y, y + h, z - rad, z + rad, true)) return;
    const d = Math.hypot(x, z);
    addVeg(b, vk, x, y, z, h, x * 92.7 + z * 31.3 + yaw * 1000, d > 200 ? 2 : Math.abs(z) > 45 && d > 60 ? 1 : 0);
    return;
  }
  const o = kit[name];
  if (!o) return;
  let box = boxes.get(o);
  if (!box) { box = new THREE.Box3().setFromObject(o); boxes.set(o, box); }
  const s = h / Math.max(0.01, box.max.y - box.min.y), r = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * s * 0.5;
  if (inTheWay(x - r, x + r, y, y + h, z - r, z + r, true)) return;
  b.addObject(o, new THREE.Matrix4().compose(V(x, y - box.min.y * s, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(s, s, s)));
};

/** a Kenney model as its own object (two-tone materials), base at y = 0, scaled to height h (no sight-line test:
 *  used for the CAM agent's FOREGROUND framing objects, which are meant to stand in front of the lens) */
export const kitClone = (kit: Kit, name: string, h: number): THREE.Object3D | null => {
  const vk = VEG[name];
  if (vk) { // cartoon plant as its own object (MAT pass), base at y = 0
    const vb = new Batch(), grp = new THREE.Group();
    addVeg(vb, vk, 0, 0, 0, h, name.length * 977 + h * 131, 0);
    vb.build(grp, false);
    grp.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = true; } });
    return grp;
  }
  const o = kit[name];
  if (!o) return null;
  let box = boxes.get(o);
  if (!box) { box = new THREE.Box3().setFromObject(o); boxes.set(o, box); }
  const c = o.clone(true), s = h / Math.max(0.01, box.max.y - box.min.y);
  c.traverse((x) => {
    const m = x as THREE.Mesh;
    if (m.isMesh) { m.material = toLambert(Array.isArray(m.material) ? m.material[0] : m.material); m.castShadow = false; m.receiveShadow = true; }
  });
  const g = new THREE.Group();
  c.position.y = -box.min.y * s; c.scale.setScalar(s);
  g.add(c);
  return g;
};

// ---------------- houses ----------------
type Style = { wall: string; shutter: string; roof: string; timber?: boolean; brick?: boolean };
// MAT pass: warm ochre / cream / sandstone / salmon walls + one blue-grey (the old pinks, whites and grey-blues read
// lavender: the two-tone shade multiplies by a blue-violet, so a near-neutral albedo turns lilac on every shaded face)
// round 3: saturation -35 % on every wall (neutral warm grey / beige; the salmon became a warm greige)
// round 4: the pale greiges still read lavender-grey in shade -> a muted brick / cream / ochre / terracotta spread
const STYLES: Style[] = [
  { wall: "#ecdab2", shutter: "#3f6fb5", roof: "#d27a62" },              // cream
  { wall: "#d8a95f", shutter: "#2f6a43", roof: "#b8644f" },              // ochre
  { wall: "#c47a5c", shutter: "#2f5f6a", roof: "#8f97a8" },              // muted brick-red plaster
  { wall: "#efdcb8", shutter: "#2f5f6a", roof: "#c9775a", timber: true }, // cream timber frame
  { wall: "#ddbd78", shutter: "#5a3b2a", roof: "#d27a62" },              // straw ochre
  { wall: "#cc9a6c", shutter: "#3f6fb5", roof: "#8e7aa0" },              // terracotta sand
  { wall: "#e2c49a", shutter: "#8c3b4a", roof: "#c9775a" },              // warm sandstone
  { wall: "#e3d2b8", shutter: "#2f6a43", roof: "#8f97a8", brick: true },
];
const roofMat = (col: string) => lam("roof" + col, () => ({ map: roofHD(col, col === "#8f97a8"), side: THREE.DoubleSide }));

/** gabled house: front facade (local +z) at width w, depth d, wall height h, ridge along local x (left out if it blocks a shot) */
export const house = (b: Batch, x: number, z: number, yaw: number, w: number, d: number, h: number, si: number, y = D0) => {
  const across = Math.abs(Math.sin(yaw)) > 0.5, hx = (across ? d : w) / 2 + 0.6, hz = (across ? w : d) / 2 + 0.6;
  if (inTheWay(x - hx, x + hx, y, y + h + d * 0.42 + 1.2, z - hz, z + hz)) return;
  const st = STYLES[si % STYLES.length];
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
  const front = lam(`hf${si}_${w}_${h}`, () => ({ map: facadeHD(`hf${si}_${w}_${h}`, w, h, { ...st, door: true }) }));
  const side = lam(`hs${si}_${h}`, () => ({ map: facadeHD(`hs${si}_${h}`, 8, h, st) }));
  const wall = lam("wall" + st.wall, () => ({ color: st.brick ? "#c8643f" : st.wall }));
  const hw = w / 2, hd = d / 2, rh = d * 0.42, o = 0.35;
  b.add(quad(V(-hw, 0, hd), V(hw, 0, hd), V(hw, h, hd), V(-hw, h, hd)), front, m);
  b.add(quad(V(hw, 0, -hd), V(-hw, 0, -hd), V(-hw, h, -hd), V(hw, h, -hd)), side, m);
  b.add(quad(V(-hw, 0, -hd), V(-hw, 0, hd), V(-hw, h, hd), V(-hw, h, -hd)), side, m);
  b.add(quad(V(hw, 0, hd), V(hw, 0, -hd), V(hw, h, -hd), V(hw, h, hd)), side, m);
  b.add(tri(V(-hw, h, -hd), V(-hw, h, hd), V(-hw, h + rh, 0)), wall, m);
  b.add(tri(V(hw, h, hd), V(hw, h, -hd), V(hw, h + rh, 0)), wall, m);
  const ru = (w + 2 * o) / 4, rv = Math.hypot(hd + o, rh) / 4, rm = roofMat(st.roof);
  b.add(quad(V(-hw - o, h - 0.25, hd + o), V(hw + o, h - 0.25, hd + o), V(hw + o, h + rh, 0), V(-hw - o, h + rh, 0), ru, rv), rm, m);
  b.add(quad(V(hw + o, h - 0.25, -hd - o), V(-hw - o, h - 0.25, -hd - o), V(-hw - o, h + rh, 0), V(hw + o, h + rh, 0), ru, rv), rm, m);
  const cx = hw * 0.45 * (si % 2 ? 1 : -1);
  b.add(boxGeo(V(cx - 0.4, h + rh * 0.3, -hd * 0.35 - 0.4), V(cx + 0.4, h + rh + 1.1, -hd * 0.35 + 0.4), 2), lam("chim", () => ({ map: rep(brick(), 1, 1) })), m);
  houseDetail(b, m, w, d, h, rh, cx);
};

// round 4: real 3D relief on every house (was a flat window-textured box): stone plinth, cornice under the eaves,
// window sills + lintel hoods matching facadeHD's window layout, front door step + door hood, chimney cap and pot
const UB = new THREE.BoxGeometry(1, 1, 1);
const trimM = () => lam("trimStone", () => ({ color: "#efe3c8" }));
const capM = () => lam("chimCap", () => ({ color: "#9a8778" }));
const plinthM = () => lam("plinthHD", () => ({ map: stoneHD("copeHD") }));
const ub = (b: Batch, mat: THREE.Material, m: THREE.Matrix4, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
  b.add(UB, mat, m.clone().multiply(new THREE.Matrix4().compose(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new THREE.Quaternion(), V(x1 - x0, y1 - y0, z1 - z0))));
const houseDetail = (b: Batch, m: THREE.Matrix4, w: number, d: number, h: number, rh: number, chx: number) => {
  const hw = w / 2, hd = d / 2, tm = trimM(), floors = Math.max(1, Math.floor(h / 2.8));
  b.add(boxGeo(V(-hw - 0.07, -0.05, -hd - 0.07), V(hw + 0.07, 0.45, hd + 0.07), 2), plinthM(), m);          // plinth
  ub(b, tm, m, -hw - 0.12, hw + 0.12, h - 0.52, h - 0.25, hd, hd + 0.17);                                   // cornice front
  ub(b, tm, m, -hw - 0.12, hw + 0.12, h - 0.52, h - 0.25, -hd - 0.17, -hd);                                 // cornice back
  for (const s of [-1, 1]) ub(b, tm, m, s < 0 ? -hw - 0.17 : hw, s < 0 ? -hw : hw + 0.17, h - 0.52, h - 0.25, -hd - 0.12, hd + 0.12);
  // windows: facadeHD puts nWin = floor(width / 2.2) per floor at (i + 0.5) / nWin, sill line fl * 2.8 + 0.9 m
  const wins = (len: number, door: boolean, at: (u: number) => [number, number], out: [number, number]) => {
    const n = Math.max(1, Math.floor(len / 2.2));
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < n; i++) {
      const [px, pz] = at((i + 0.5) / n), yb = fl * 2.8 + 0.9;
      if (door && fl === 0 && i === Math.floor(n / 2)) {
        const along = (k: number) => [px + out[1] * k, pz - out[0] * k] as const; // along the wall (perpendicular to out)
        const [ax, az] = along(-0.82), [bx, bz] = along(0.82), [cx2, cz2] = along(-0.78), [dx2, dz2] = along(0.78);
        ub(b, plinthM(), m, Math.min(ax, bx, ax + out[0] * 0.5), Math.max(ax, bx, ax + out[0] * 0.5), 0, 0.2, Math.min(az, bz, az + out[1] * 0.5), Math.max(az, bz, az + out[1] * 0.5)); // step
        ub(b, tm, m, Math.min(cx2, dx2, cx2 + out[0] * 0.34), Math.max(cx2, dx2, cx2 + out[0] * 0.34), 2.3, 2.44, Math.min(cz2, dz2, cz2 + out[1] * 0.34), Math.max(cz2, dz2, cz2 + out[1] * 0.34)); // hood
        continue;
      }
      for (const [y0, y1, dep, half] of [[yb - 0.2, yb - 0.08, 0.14, 0.6], [yb + 1.33, yb + 1.43, 0.08, 0.55]] as const) {
        const ax = px - out[1] * half, az = pz + out[0] * half, bx = px + out[1] * half, bz = pz - out[0] * half;
        ub(b, tm, m, Math.min(ax, bx, ax + out[0] * dep), Math.max(ax, bx, ax + out[0] * dep), y0, y1, Math.min(az, bz, az + out[1] * dep), Math.max(az, bz, az + out[1] * dep));
      }
    }
  };
  wins(w, true, (u) => [-hw + u * w, hd], [0, 1]);            // front (+z), u from -x to +x
  wins(8, false, (u) => [hw - u * w, -hd], [0, -1]);          // back: side texture (8 m layout) stretched over w
  wins(8, false, (u) => [-hw, -hd + u * d], [-1, 0]);         // left side (-x): side texture is always the 8 m layout
  wins(8, false, (u) => [hw, hd - u * d], [1, 0]);            // right side (+x)
  // chimney cap + pot
  const cz = -hd * 0.35, top = h + rh + 1.1;
  ub(b, capM(), m, chx - 0.52, chx + 0.52, top, top + 0.16, cz - 0.52, cz + 0.52);
  b.add(new THREE.CylinderGeometry(0.13, 0.16, 0.42, 10).translate(0, 0.21, 0), lam("chimPot", () => ({ color: "#b8684a" })), m.clone().multiply(new THREE.Matrix4().makeTranslation(chx, top + 0.16, cz)));
};

// ---------------- painted extras ----------------
const chapelTex = () => ctex("chapel", 512, 512, (g) => {
  g.fillStyle = "#e9e0cc"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(0,0,0,.06)"; for (let y = 0; y < 512; y += 32) g.fillRect(0, y, 512, 2);
  for (const cx of [128, 384]) {
    g.fillStyle = "#33406b"; g.strokeStyle = "rgba(40,30,40,.85)"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(cx - 40, 430); g.lineTo(cx - 40, 190); g.arc(cx, 190, 40, Math.PI, 0); g.lineTo(cx + 40, 430); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "rgba(160,200,255,.35)"; g.fillRect(cx - 30, 200, 16, 220);
    g.strokeStyle = "#d9c9a0"; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, 160); g.lineTo(cx, 430); g.moveTo(cx - 40, 300); g.lineTo(cx + 40, 300); g.stroke();
  }
});
const clockTex = () => ctex("clock", 256, 256, (g) => {
  g.fillStyle = "#f7f1e1"; g.strokeStyle = "#221f2e"; g.lineWidth = 12;
  g.beginPath(); g.arc(128, 128, 112, 0, 7); g.fill(); g.stroke();
  g.lineCap = "round";
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.lineWidth = 8; g.beginPath(); g.moveTo(128 + 80 * Math.cos(a), 128 + 80 * Math.sin(a)); g.lineTo(128 + 96 * Math.cos(a), 128 + 96 * Math.sin(a)); g.stroke(); }
  g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 62); g.stroke();
  g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(178, 150); g.stroke();
});
/** round 4: St George's cross (England, 1831): white field, red cross (the old red + yellow diamond read as Vietnam's flag) */
export const flagTex = () => ctex("flagStGeorge", 256, 160, (g) => {
  g.fillStyle = "#f4f0e6"; g.fillRect(0, 0, 256, 160);
  g.fillStyle = "#c8323a"; g.fillRect(0, 62, 256, 36); g.fillRect(110, 0, 36, 160);
  g.fillStyle = "rgba(120,100,90,0.10)"; g.fillRect(0, 150, 256, 10); // soft hem shade
});

// ---------------- town ----------------
const inPark = (x: number, z: number) => z < 0 && x > 46 && x < 96 && z > -100 && z < -49;
const inMill = (x: number, z: number) => z < 0 && x > -66 && x < -14 && z > -90 && z < -54;
const inChurch = (x: number, z: number) => (z > 0 && x > 10 && x < 38 && z > 46 && z < 84) || (z > 0 && x > 86 && x < 110 && z > 60 && z < 84);

export const buildTown = (root: THREE.Object3D, kit: Kit, rays: Ray[] = []) => {
  const b = new Batch(), r = rng(11);
  sight = rays;
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length) % a.length];
  for (const bank of [-1, 1]) {
    const away = bank > 0 ? Math.PI : 0; // fronts face the river
    // riverfront rows, fronts on the quay at |z| = 36.5
    for (const sx of [-1, 1]) {
      let x = 8.5;
      while (x < 134) {
        const w = pick([7, 9]), h = pick([7, 8.4, 9.8]), cx = sx * (x + w / 2), cz = bank * 40.5;
        house(b, cx, cz, away, w, 8, h, Math.floor(r() * 8));
        x += w + (r() < 0.25 ? 2.5 : 0.25);
      }
    }
    // main street, fronts on |x| = 6
    for (const sx of [-1, 1]) {
      let z = 46;
      while (z < 150) {
        const w = pick([7, 9]), h = pick([7, 8.4, 9.8]);
        if (!inChurch(sx * 10, bank * (z + w / 2))) house(b, sx * 10, bank * (z + w / 2), sx < 0 ? Math.PI / 2 : -Math.PI / 2, w, 8, h, Math.floor(r() * 8));
        z += w + (r() < 0.2 ? 3 : 0.3);
      }
    }
    // back rows
    for (const zf of [52, 66, 80, 96]) for (const sx of [-1, 1]) {
      let x = 17 + r() * 4;
      while (x < 124) {
        const w = pick([7, 9]), h = pick([7, 8.4, 9.8]), cx = sx * (x + w / 2), cz = bank * (zf + 4 + r() * 2);
        if (r() > 0.22 && !inPark(cx, cz) && !inMill(cx, cz) && !inChurch(cx, cz)) house(b, cx, cz, away, w, 8, h, Math.floor(r() * 8));
        x += w + 1 + r() * 4;
      }
    }
  }
  // church on the far bank: nave, tower, spire, clock
  const ch = lam("chapel", () => ({ map: chapelTex() })), st = lam("towerstone", () => ({ map: stoneHD("tstoneHD") })); // 2048 canvas at its own repeat 0.5 (paint.ts)
  b.add(boxGeo(V(18.5, D0, 57), V(29.5, D0 + 9, 80), 6), ch);
  const sl = roofMat("#8f97a8");
  b.add(quad(V(18.1, D0 + 8.8, 57), V(18.1, D0 + 8.8, 80.4), V(24, D0 + 13.5, 80.4), V(24, D0 + 13.5, 57), 6, 2), sl);
  b.add(quad(V(29.9, D0 + 8.8, 80.4), V(29.9, D0 + 8.8, 57), V(24, D0 + 13.5, 57), V(24, D0 + 13.5, 80.4), 6, 2), sl);
  b.add(tri(V(18.5, D0 + 9, 80), V(29.5, D0 + 9, 80), V(24, D0 + 13.5, 80)), st);
  b.add(boxGeo(V(21.4, D0, 51.6), V(26.6, D0 + 19, 57), 4), st);
  b.add(boxGeo(V(21.1, D0 + 18.6, 51.3), V(26.9, D0 + 19.4, 57.3), 4), st);
  const spire = new THREE.ConeGeometry(4.0, 13, 4, 1);
  spire.rotateY(Math.PI / 4);
  b.add(spire, sl, new THREE.Matrix4().makeTranslation(24, D0 + 19.4 + 6.5, 54.3));
  b.add(tri(V(29.5, D0 + 9, 57), V(18.5, D0 + 9, 57), V(24, D0 + 13.5, 57)), st);
  b.add(quad(V(25.1, D0 + 12.4, 51.55), V(22.9, D0 + 12.4, 51.55), V(22.9, D0 + 14.6, 51.55), V(25.1, D0 + 14.6, 51.55)), lam("clock", () => ({ map: clockTex(), alphaTest: 0.5 })));
  // mill (near bank) + chimneys with smoke handled in the world
  const mill = lam("mill", () => ({ map: facadeHD("mill", 30, 13, { wall: "#b5543c", shutter: "#3b3f52", brick: true }) }));
  const millS = lam("mills", () => ({ map: facadeHD("mills", 12, 13, { wall: "#b5543c", shutter: "#3b3f52", brick: true }) }));
  b.add(quad(V(-58, D0, -70), V(-28, D0, -70), V(-28, D0 + 13, -70), V(-58, D0 + 13, -70)), mill);
  b.add(quad(V(-28, D0, -82), V(-58, D0, -82), V(-58, D0 + 13, -82), V(-28, D0 + 13, -82)), mill);
  b.add(quad(V(-58, D0, -82), V(-58, D0, -70), V(-58, D0 + 13, -70), V(-58, D0 + 13, -82)), millS);
  b.add(quad(V(-28, D0, -70), V(-28, D0, -82), V(-28, D0 + 13, -82), V(-28, D0 + 13, -70)), millS);
  b.add(quad(V(-58.4, D0 + 12.8, -69.6), V(-27.6, D0 + 12.8, -69.6), V(-27.6, D0 + 16.5, -76), V(-58.4, D0 + 16.5, -76), 8, 2), sl);
  b.add(quad(V(-27.6, D0 + 12.8, -82.4), V(-58.4, D0 + 12.8, -82.4), V(-58.4, D0 + 16.5, -76), V(-27.6, D0 + 16.5, -76), 8, 2), sl);
  b.add(tri(V(-58, D0 + 13, -82), V(-58, D0 + 13, -70), V(-58, D0 + 16.5, -76)), millS);
  b.add(tri(V(-28, D0 + 13, -70), V(-28, D0 + 13, -82), V(-28, D0 + 16.5, -76)), millS);
  const chim = lam("chimney", () => ({ map: rep(brick(), 2, 8) })), soot = lam("soot", () => ({ color: "#4a3442" }));
  for (const [x, z, hh] of [[-22, -77, 30], [-80, 93, 24]] as const) {
    b.add(new THREE.CylinderGeometry(0.95, 1.35, hh, 14, 1, true), chim, new THREE.Matrix4().makeTranslation(x, D0 + hh / 2, z));
    b.add(new THREE.CylinderGeometry(1.15, 1.1, 1.3, 14), soot, new THREE.Matrix4().makeTranslation(x, D0 + hh + 0.3, z));
  }
  house(b, -80, 100, Math.PI, 16, 10, 9.8, 7);
  // hills around the valley
  const hill = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const hm = [lam("hillA", () => ({ color: "#78b257" })), lam("hillB", () => ({ color: "#6aa24e" })), lam("hillC", () => ({ color: "#8bbf63" }))];
  ([[-360, 250, 190, 52, 120], [140, 380, 240, 64, 140], [430, 150, 170, 48, 130], [-440, -130, 190, 44, 150], [-90, -390, 250, 58, 140],
    [320, -330, 210, 54, 130], [520, -60, 160, 40, 120], [-560, 60, 200, 46, 140]] as const).forEach(([x, z, sx, sy, sz], i) =>
    b.add(hill, hm[i % 3], new THREE.Matrix4().compose(V(x, D0 - 2, z), new THREE.Quaternion(), V(sx, sy, sz))));
  // trees: quays, gardens, valley, hilltops
  const trees = ["tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree-high-round", "tree"];
  for (const bank of [-1, 1]) for (let x = -130; x <= 130; x += 22) if (Math.abs(x) > 12) prop(b, kit, pick(trees), x + r() * 4, D0, bank * 33.6, 7 + r() * 2.5, r() * 6);
  for (let i = 0; i < 140; i++) {
    const x = (r() - 0.5) * 520, z = (r() < 0.5 ? -1 : 1) * (48 + r() * 220);
    if (inPark(x, z) || inMill(x, z) || inChurch(x, z) || Math.abs(x) < 16) continue;
    prop(b, kit, pick(trees), x, D0, z, 7 + r() * 4, r() * 6);
  }
  for (let i = 0; i < 60; i++) {
    const a = r() * Math.PI * 2, d = 230 + r() * 160;
    prop(b, kit, pick(["tree_cone", "tree_default", "tree_oak"]), Math.cos(a) * d * 1.3, D0, Math.sin(a) * d, 12 + r() * 6, r() * 6);
  }
  // quay furniture
  for (const bank of [-1, 1]) {
    for (let x = -126; x <= 126; x += 12) if (Math.abs(x) > 5) prop(b, kit, "lantern", x, D0, bank * 31.0, 2.8);
    prop(b, kit, "banner-red", 5.4, D0, bank * 31.6, 3.6, bank > 0 ? Math.PI : 0);
  }
  prop(b, kit, "stall-red", -14, D0, -34, 3.2);
  prop(b, kit, "stall-green", -21.5, D0, -34.4, 3.2, 0.1);
  // round 4: this cart sat blurred in shot 11's bottom-left corner (lens at 14, 10.5, -47) as a grey "mushroom"
  // (bed + handle + wheel); moved 3.5 m along the quay, out of that frame, still dressing the market
  prop(b, kit, "cart", 17.0, D0, -34.0, 2.2, 1.2);
  prop(b, kit, "stall-bench", 20, D0, -32.2, 1.0);
  prop(b, kit, "stall-green", 16, D0, 34, 3.2, Math.PI);
  prop(b, kit, "stall-red", 23.5, D0, 34.3, 3.2, Math.PI);
  prop(b, kit, "cart", -15, D0, 33.6, 2.2, 2.4);
  prop(b, kit, "windmill", 98, D0, 72, 16, -0.6);
  prop(b, kit, "canoe", -19, 0.02, 27.6, 0.7, 1.5);
  prop(b, kit, "canoe", 31, 0.02, -28.2, 0.7, -1.4);
  for (let i = 0; i < 14; i++) prop(b, kit, "lily_large", (r() - 0.5) * 120, 0.03, (r() < 0.5 ? -1 : 1) * (27.2 + r() * 2.2), 0.08, r() * 6);
  // park around the swing (near bank, x 50..92, z -96..-56)
  for (const [n, x, z, h] of [["tree_oak", 58, -66, 9.5], ["tree_fat", 84, -64, 8], ["tree_detailed", 54, -84, 9], ["tree_default", 88, -86, 9],
    ["tree_oak", 79, -95, 10], ["tree-high-round", 61, -94, 9], ["tree_default", 92, -73, 8.5]] as const) prop(b, kit, n, x, D0, z, h, x);
  for (let x = 50; x < 92; x += 3.2) prop(b, kit, "hedge", x, D0, -57, 1.5);
  for (const [x, z] of [[62, -76], [77, -71], [66, -82], [75, -80], [57, -73]]) prop(b, kit, pick(["plant_bushLarge", "plant_bushDetailed", "plant_bush"]), x, D0, z, 1.3);
  // flowers only (inked grass tufts read as green boxes), and none inside the swing's 4 m circle
  for (let i = 0; i < 26; i++) {
    const f = pick(["flower_redA", "flower_yellowA", "flower_purpleA"]), x = 56 + r() * 30, z = -60 - r() * 32;
    if (Math.hypot(x - 70, z + 75) > 4) prop(b, kit, f, x, D0, z, 0.5);
  }
  prop(b, kit, "stall-bench", 76.5, D0, -79.5, 1.0, Math.PI);
  prop(b, kit, "lantern", 64.5, D0, -71, 2.8);
  b.build(root);
  sight = [];
};

// ================= night market (the film's main set) =================
// Layout pins (CONTRACT): street x in [-4.5, 4.5], z from -8 (entrance) to -66 (back alley), ground y = 0. The
// inherited canal (the old river, z in [-30, 30], water surface y = 0) cuts the street at z -30..-8: the flagstone
// crosses it as a causeway and the glowing rail pairs run ALONG the water (the "water subway"), with the moored
// lantern boats near z = +10. The old bridge stands intact through the market (architecture makes no sense).
export const MARKET_Z: [number, number] = [-66, -8]; // street z range (entrance -> back alley)
export const STALL_X = 3.2; // stall row centres (two rows at +-STALL_X)
export const STALL_PITCH = 4; // stall pitch along z
export const ROOF_Y = 9.8; // rooftop plane over the houses near x = 0, z = -38 (S12-13 dead end)
export const CAGE: V3 = [1.5, 0, -58]; // cage of rusted keys (sister inside; cast.ts poses her there)
export const BED: V3 = [30, 0, 0]; // bedroom interior zone; brother BED+[-1.25,0,0], sister BED+[1.25,0,0]
export const FLOWER_SHOP: V3 = [-8, 0, -40]; // upside-down: roof at street level, base up
export const CLOCKWORK_SHOP: V3 = [8, 0, -52]; // gear motifs painted, unlit
export const LAMP_TREES: V3[] = [[-4.6, 0, -18], [4.6, 0, -30], [-4.6, 0, -44]]; // L04: street lights grow like trees
export const RAIL_Z = 10; // water-subway track centre: glowing rails at RAIL_Z +- 0.9, y = 0.3, along x
/** practical glow centres filled by buildNightMarket (string bulbs, lamp-tree globes, boat lanterns): the bloom
 *  sources (luminance >= 1.4) and anchors other agents can hang effects / sight lines on */
export const LANTERNS: V3[] = [];

// emissive practicals are raw MeshBasicMaterial colours above 1 (bloom threshold 1.0); base kept for the flicker
const glowMat = (key: string, r: number, g: number, bl: number) => {
  let m = mats.get(key) as THREE.MeshBasicMaterial | undefined;
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, bl) });
    m.userData.base = [r, g, bl];
    mats.set(key, m);
  }
  return m;
};

// warm striped canopy fabric (muted: the night light does the colour work)
const canopyTex = () => ctex("canopy", 256, 256, (g, r) => {
  const cols = ["#9e4a38", "#c98a4a", "#e0d2ae", "#7c5a38"];
  for (let x = 0; x < 256; x += 32) { g.fillStyle = cols[(x >> 5) & 3]; g.fillRect(x, 0, 32, 256); }
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + 0.06 * r()})`; g.fillRect(r() * 256, r() * 256, 2, 4 + r() * 8); }
  g.fillStyle = "rgba(255,240,220,0.1)"; g.fillRect(0, 0, 256, 10);
  g.fillStyle = "rgba(40,10,10,0.22)"; g.fillRect(0, 246, 256, 10);
});
// hanging sign boards: UNLIT faces, symbols only (hard rule: no readable words anywhere)
const glyphBoard = (key: string, draw: (g: CanvasRenderingContext2D, cx: number, cy: number) => void) =>
  ctex(key, 256, 256, (g) => {
    g.fillStyle = "#221d28"; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#5a4a3a"; g.lineWidth = 10; g.strokeRect(10, 10, 236, 236);
    draw(g, 128, 128);
  });
const flowerGlyphTex = () => glyphBoard("flowerGlyph", (g, cx, cy) => {
  g.fillStyle = "#b48a92";
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.ellipse(cx + 38 * Math.cos(a), cy - 22 + 38 * Math.sin(a), 30, 20, a, 0, 7); g.fill(); }
  g.fillStyle = "#d1aa5c"; g.beginPath(); g.arc(cx, cy - 22, 18, 0, 7); g.fill();
  g.strokeStyle = "#7a9a5c"; g.lineWidth = 10; g.beginPath(); g.moveTo(cx, cy + 12); g.quadraticCurveTo(cx - 14, cy + 52, cx - 26, cy + 88); g.stroke();
});
const gearGlyphTex = () => glyphBoard("gearGlyph", (g, cx, cy) => {
  const gear = (r: number, x: number, y: number, n: number) => {
    g.fillStyle = "#8a6f42";
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.save(); g.translate(x, y); g.rotate(a); g.fillRect(r - 2, -6, 14, 12); g.restore(); }
    g.fillStyle = "#221d28"; g.beginPath(); g.arc(x, y, r * 0.4, 0, 7); g.fill();
  };
  gear(52, cx - 24, cy - 10, 10);
  gear(34, cx + 46, cy + 40, 8);
});

// market stall: 4 posts, table, sloped warm canopy, a few crates and a bale (core sight-line test only: stalls
// are small framing props and may sit at the frame edge)
const stall = (b: Batch, x: number, z: number, yaw: number, seed: number) => {
  const M = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);
  const c = new THREE.Vector3(0, 1.3, 0).applyMatrix4(M);
  if (inTheWay(c.x - 1.5, c.x + 1.5, 0, 2.7, c.z - 1.5, c.z + 1.5, true)) return;
  const wood = lam("stallWood", () => ({ map: beamHD() }));
  const canopy = lam("canopy", () => ({ map: canopyTex(), side: THREE.DoubleSide }));
  for (const px of [-1.1, 1.1]) for (const pz of [-0.8, 0.85])
    b.add(boxGeo(V(px - 0.045, 0, pz - 0.045), V(px + 0.045, 2.35, pz + 0.045)), wood, M);
  b.add(boxGeo(V(-1.15, 0.72, -0.85), V(1.15, 0.86, 0.85)), wood, M);
  b.add(quad(V(-1.35, 2.5, 1.0), V(1.35, 2.5, 1.0), V(1.2, 2.0, -1.05), V(-1.2, 2.0, -1.05), 2, 1.4), canopy, M);
  const r = rng(seed);
  for (let i = 0; i < 3; i++) {
    const gx = (r() - 0.5) * 1.6, gz = (r() - 0.5) * 1.2, s = 0.3 + r() * 0.18;
    b.add(boxGeo(V(gx - s / 2, 0.86, gz - s / 2), V(gx + s / 2, 0.86 + s, gz + s / 2)), wood, M);
  }
  b.add(new THREE.CylinderGeometry(0.18, 0.2, 0.5, 10).translate(0, 0.25, 0), lam("bale", () => ({ color: "#b09a5c" })),
    M.clone().multiply(new THREE.Matrix4().setPosition(0.6 - r() * 1.2, 0.86, 0.3 - r() * 0.5)));
};

// lamp tree (L04 "street lights grow like trees"): iron trunk, two branch forks, glowing globes at the tips
const lampTree = (b: Batch, root: THREE.Object3D, x: number, z: number, globes: THREE.MeshBasicMaterial) => {
  const iron = lam("lampIron", () => ({ color: "#26262e" }));
  const h = 4.7;
  b.add(new THREE.CylinderGeometry(0.3, 0.42, 0.25, 10).translate(0, 0.12, 0), iron, new THREE.Matrix4().setPosition(x, 0, z)); // root flare
  b.add(new THREE.CylinderGeometry(0.09, 0.17, h, 10).translate(0, h / 2, 0), iron, new THREE.Matrix4().setPosition(x, 0, z));
  for (const s of [-1, 1]) {
    const fork = new THREE.CylinderGeometry(0.05, 0.07, 1.5, 8).translate(0, 0.75, 0);
    b.add(fork, iron, new THREE.Matrix4().makeRotationZ(s * 0.75).setPosition(x + s * 0.55, h - 0.15, z));
    const gx = x + s * 1.57, gy = h + 0.95;
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), globes);
    g.position.set(gx, gy, z);
    root.add(g);
    LANTERNS.push([gx, gy, z]);
  }
};

// string of bulbs sagging across the street (wire in the lit batch, bulbs as emissive meshes)
const lanternString = (b: Batch, root: THREE.Object3D, z: number, bulbs: THREE.MeshBasicMaterial) => {
  const a = V(-4.2, 4.4, z), c = V(4.2, 4.4, z), mid = V(0, 3.7, z);
  const ctrl = mid.clone().multiplyScalar(2).sub(a.clone().add(c).multiplyScalar(0.5));
  const curve = new THREE.QuadraticBezierCurve3(a, ctrl, c);
  b.add(new THREE.TubeGeometry(curve, 10, 0.018, 5), lam("stringWire", () => ({ color: "#141418" })));
  for (let i = 1; i <= 7; i++) {
    const p = curve.getPoint(i / 8);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), bulbs);
    bulb.position.copy(p);
    root.add(bulb);
    LANTERNS.push([p.x, p.y, p.z]);
  }
};

// gabled market house + warm emissive windows on the street-facing facade (subset lit; y = 0 ground)
const marketHouse = (b: Batch, x: number, z: number, yaw: number, w: number, d: number, h: number, si: number) => {
  house(b, x, z, yaw, w, d, h, si, 0);
  const across = Math.abs(Math.sin(yaw)) > 0.5;
  const hx = (across ? d : w) / 2 + 0.6, hz = (across ? w : d) / 2 + 0.6;
  if (inTheWay(x - hx, x + hx, 0, h + d * 0.42 + 1.2, z - hz, z + hz)) return;
  const floors = Math.max(1, Math.floor(h / 2.8)), n = Math.max(1, Math.floor(w / 2.2));
  const M = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);
  const win = glowMat("glowWin", 1.7, 1.05, 0.45);
  win.userData.base = [1.7, 1.05, 0.45];
  for (let fl = 0; fl < floors; fl++) for (let i = 0; i < n; i++) {
    if ((i + fl + Math.round(w)) % 3 === 0) continue; // some windows dark
    const lx = -w / 2 + ((i + 0.5) / n) * w, ly = fl * 2.8 + 1.52;
    b.add(quad(V(lx - 0.4, ly - 0.55, d / 2 + 0.05), V(lx + 0.4, ly - 0.55, d / 2 + 0.05),
      V(lx + 0.4, ly + 0.55, d / 2 + 0.05), V(lx - 0.4, ly + 0.55, d / 2 + 0.05)), win, M);
  }
};

// upside-down flower shop: the gable roof sits at STREET level (apex down), the flat base up at 4.7 m
const flowerShop = (b: Batch) => {
  const [x, y, z] = FLOWER_SHOP, yaw = Math.PI / 2; // front (the old ground floor, now on top) faces the street
  const M = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
  const wall = lam("shopWall", () => ({ map: stoneHD("shopWallHD", ["#c5b6a4", "#b9a995", "#cfc1b0", "#b0a190"], "#8a7c6c") }));
  const hw = 2.6, hd = 2.1, apex = 0.35, eave = 1.5, top = 4.7;
  b.add(quad(V(-hw, eave, hd), V(hw, eave, hd), V(hw, top, hd), V(-hw, top, hd), 3, 2), wall, M);
  b.add(quad(V(hw, eave, -hd), V(-hw, eave, -hd), V(-hw, top, -hd), V(hw, top, -hd), 3, 2), wall, M);
  b.add(quad(V(-hw, eave, -hd), V(-hw, eave, hd), V(-hw, top, hd), V(-hw, top, -hd), 2, 2), wall, M);
  b.add(quad(V(hw, eave, hd), V(hw, eave, -hd), V(hw, top, -hd), V(hw, top, hd), 2, 2), wall, M);
  b.add(quad(V(-hw, top, hd), V(hw, top, hd), V(hw, top, -hd), V(-hw, top, -hd), 3, 2), wall, M); // base slab (was the roof)
  const rm = roofMat("#6a5a50");
  b.add(quad(V(-hw - 0.3, eave, hd + 0.25), V(hw + 0.3, eave, hd + 0.25), V(hw + 0.3, apex, 0), V(-hw - 0.3, apex, 0), 3, 1.4), rm, M);
  b.add(quad(V(hw + 0.3, eave, -hd - 0.25), V(-hw - 0.3, eave, -hd - 0.25), V(-hw - 0.3, apex, 0), V(hw + 0.3, apex, 0), 3, 1.4), rm, M);
  b.add(tri(V(-hw, eave, -hd), V(-hw, eave, hd), V(-hw, apex, 0)), wall, M);
  b.add(tri(V(hw, eave, hd), V(hw, eave, -hd), V(hw, apex, 0)), wall, M);
  const winD = lam("shopWinDark", () => ({ color: "#10131f" })); // unlit windows: nobody home
  for (const wx of [-1.5, 0, 1.5])
    b.add(quad(V(wx - 0.45, 2.4, hd + 0.04), V(wx + 0.45, 2.4, hd + 0.04), V(wx + 0.45, 3.5, hd + 0.04), V(wx - 0.45, 3.5, hd + 0.04)), winD, M);
  // hanging sign under the eave overhang: unlit board, flower glyph only
  b.add(boxGeo(V(-0.5, -0.5, -0.03), V(0.5, 0.5, 0.03)), lam("signBack", () => ({ color: "#2c2420" })),
    M.clone().multiply(new THREE.Matrix4().setPosition(1.1, 1.2, hd + 0.38)));
  b.add(new THREE.PlaneGeometry(0.95, 0.95), lam("flowerSign", () => ({ map: flowerGlyphTex() })),
    M.clone().multiply(new THREE.Matrix4().setPosition(1.1, 1.2, hd + 0.42)));
  for (const s of [-1, 1])
    b.add(boxGeo(V(-0.02, 1.2, -0.02), V(0.02, 1.62, 0.02)), lam("signChain", () => ({ color: "#1c1c22" })),
      M.clone().multiply(new THREE.Matrix4().setPosition(1.1 + s * 0.32, 0, hd + 0.4)));
};

// clockwork shop: upright gabled shop, big gear-glyph board on the front (unlit)
const clockworkShop = (b: Batch) => {
  const [x, y, z] = CLOCKWORK_SHOP, yaw = -Math.PI / 2; // front faces the street (-x)
  const M = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
  const wall = lam("clockWall", () => ({ map: stoneHD("clockWallHD", ["#b3a68f", "#a89a82", "#bfb29c", "#9c8f78"], "#7c6f5c") }));
  const hw = 2.4, hd = 1.9, h = 4.4;
  b.add(quad(V(-hw, 0, hd), V(hw, 0, hd), V(hw, h, hd), V(-hw, h, hd), 3, 3), wall, M);
  b.add(quad(V(hw, 0, -hd), V(-hw, 0, -hd), V(-hw, h, -hd), V(hw, h, -hd), 3, 3), wall, M);
  b.add(quad(V(-hw, 0, -hd), V(-hw, 0, hd), V(-hw, h, hd), V(-hw, h, -hd), 2, 3), wall, M);
  b.add(quad(V(hw, 0, hd), V(hw, 0, -hd), V(hw, h, -hd), V(hw, h, hd), 2, 3), wall, M);
  const rm = roofMat("#5c5148");
  b.add(quad(V(-hw - 0.25, h, hd + 0.25), V(hw + 0.25, h, hd + 0.25), V(hw + 0.25, h + 1.3, 0), V(-hw - 0.25, h + 1.3, 0), 3, 1.4), rm, M);
  b.add(quad(V(hw + 0.25, h, -hd - 0.25), V(-hw - 0.25, h, -hd - 0.25), V(-hw - 0.25, h + 1.3, 0), V(hw + 0.25, h + 1.3, 0), 3, 1.4), rm, M);
  b.add(tri(V(-hw, h, -hd), V(-hw, h, hd), V(-hw, h + 1.3, 0)), wall, M);
  b.add(tri(V(hw, h, hd), V(hw, h, -hd), V(hw, h + 1.3, 0)), wall, M);
  const winD = lam("clockWinDark", () => ({ color: "#10131f" }));
  for (const wx of [-1.4, 1.4])
    b.add(quad(V(wx - 0.4, 1.6, hd + 0.04), V(wx + 0.4, 1.6, hd + 0.04), V(wx + 0.4, 2.6, hd + 0.04), V(wx - 0.4, 2.6, hd + 0.04)), winD, M);
  b.add(quad(V(-0.45, 0, hd + 0.04), V(0.45, 0, hd + 0.04), V(0.45, 2.1, hd + 0.04), V(-0.45, 2.1, hd + 0.04)), winD, M); // door
  b.add(new THREE.PlaneGeometry(1.5, 1.5), lam("gearSign", () => ({ map: gearGlyphTex() })),
    M.clone().multiply(new THREE.Matrix4().setPosition(0, 3.4, hd + 0.06)));
};

// cage of rusted keys (sister inside): barrel of leaning iron ribs + rings, key silhouettes stuck out radially
const keyCage = (b: Batch) => {
  const [x, y, z] = CAGE;
  const M = new THREE.Matrix4().setPosition(x, y, z);
  const rust = lam("rust", () => ({ color: "#5c4234" })), rust2 = lam("rust2", () => ({ color: "#6a4e3a" }));
  const R = 1.15, H = 2.7;
  b.add(new THREE.CylinderGeometry(R + 0.15, R + 0.3, 0.18, 16).translate(0, 0.09, 0), rust2, M);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    // ribs lean inward: rotate the vertical rib about the horizontal tangential axis at its base point
    const m = new THREE.Matrix4().makeRotationAxis(V(-Math.sin(a), 0, Math.cos(a)), 0.24)
      .setPosition(Math.cos(a) * R, 0, Math.sin(a) * R);
    b.add(new THREE.CylinderGeometry(0.035, 0.045, H, 7).translate(0, H / 2, 0), rust, M.clone().multiply(m));
  }
  for (const ry of [0.5, 1.4, 2.3])
    b.add(new THREE.TorusGeometry(R * (1 - 0.06 * ry), 0.04, 6, 24).rotateX(Math.PI / 2), rust2,
      M.clone().multiply(new THREE.Matrix4().setPosition(0, ry, 0)));
  const r = rng(4242);
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2, ky = 0.4 + r() * 2.0;
    // each key points radially outward: build it along local +x, then rotY(-a) aims +x along the radial direction
    const km = M.clone().multiply(new THREE.Matrix4().makeRotationY(-a).setPosition(Math.cos(a) * (R + 0.05), ky, Math.sin(a) * (R + 0.05)));
    b.add(boxGeo(V(-0.18, -0.02, -0.012), V(0.16, 0.02, 0.012)), rust, km);
    b.add(new THREE.TorusGeometry(0.06, 0.018, 6, 12), rust2, km.clone().multiply(new THREE.Matrix4().setPosition(-0.24, 0, 0)));
    for (const [tx, tl] of [[0.08, 0.05], [0.13, 0.04]] as const)
      b.add(boxGeo(V(tx, -0.055, -0.012), V(tx + tl, -0.008, 0.012)), rust, km);
  }
};

// water subway: glowing rail pairs ALONG the canal (old river geometry kept), float buoys under them, and a
// moored train of lantern boats beside the track near z = +10 (bobbed per frame by world.ts)
const waterSubway = (b: Batch, root: THREE.Object3D, kit: Kit, boats: THREE.Group[], railGlow: THREE.MeshBasicMaterial, boatGlow: THREE.MeshBasicMaterial) => {
  for (const s of [-1, 1])
    b.add(boxGeo(V(-150, 0.27, RAIL_Z + s * 0.9 - 0.05), V(150, 0.33, RAIL_Z + s * 0.9 + 0.05)), railGlow);
  const buoy = lam("buoy", () => ({ color: "#1e212c" }));
  for (let x = -148; x <= 148; x += 8) for (const s of [-1, 1])
    b.add(boxGeo(V(x - 0.14, 0.02, RAIL_Z + s * 0.9 - 0.14), V(x + 0.14, 0.26, RAIL_Z + s * 0.9 + 0.14)), buoy);
  for (const bx of [-16, -8, 0, 8, 16]) {
    const g = new THREE.Group();
    const hull = kitClone(kit, "canoe", 0.9);
    if (hull) { hull.rotation.y = Math.PI / 2; g.add(hull); }
    else g.add(new THREE.Mesh(boxGeo(V(-0.8, 0.05, -0.3), V(0.8, 0.3, 0.3)), lam("boatHull", () => ({ color: "#4a3a2c" }))));
    const post = new THREE.Mesh(boxGeo(V(-0.03, 0, -0.03), V(0.03, 1.15, 0.03)), lam("boatPost", () => ({ color: "#2a241e" })));
    post.position.y = 0.25;
    g.add(post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), boatGlow);
    lamp.position.y = 1.35;
    g.add(lamp);
    g.position.set(bx, 0.02, RAIL_Z + 2.6);
    g.rotation.y = 0.12 * (((bx / 8) % 3) - 1);
    root.add(g);
    boats.push(g);
    LANTERNS.push([bx, 1.4, RAIL_Z + 2.6]);
  }
};

// rooftop zone (S12-13): flat deck at ROOF_Y over the houses near x = 0, z = -38, parapet on three sides, open
// drop edge at z = -45, and pitch-black void planes below every edge (fog=false: the drop reads as nothing)
const buildRoofZone = (): THREE.Group => {
  const g = new THREE.Group(), b = new Batch();
  const y = ROOF_Y, x0 = -8.6, x1 = 8.6, z0 = -45, z1 = -31;
  b.add(quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), 5, 4), lam("roofDeck", () => ({ map: planksHD() })));
  const coping = lam("roofCoping", () => ({ map: stoneHD("roofCopingHD") }));
  for (const [bx0, bx1, bz0, bz1] of [[x0 - 0.25, x0, z0, z1], [x1, x1 + 0.25, z0, z1], [x0, x1, z1, z1 + 0.25]] as const)
    b.add(boxGeo(V(bx0, y, bz0), V(bx1, y + 0.45, bz1)), coping);
  b.add(boxGeo(V(-6.2, y, -40), V(-5.4, y + 1.5, -39.2)), coping); // chimney stubs on the dead end
  b.add(boxGeo(V(5.6, y, -36), V(6.4, y + 1.2, -35.2)), coping);
  b.build(g);
  const voidM = new THREE.MeshBasicMaterial({ color: "#000000", fog: false, side: THREE.DoubleSide });
  const voidG = new THREE.Group();
  const vy0 = -170, off = 0.3;
  const vwall = (a: V3, bb: V3, c: V3, d: V3) => voidG.add(new THREE.Mesh(quad(V(...a), V(...bb), V(...c), V(...d)), voidM));
  vwall([x0 - off, y - 0.05, z1 + off], [x1 + off, y - 0.05, z1 + off], [x1 + off, vy0, z1 + off], [x0 - off, vy0, z1 + off]);
  vwall([x0 - off, y - 0.05, z0 - off], [x0 - off, y - 0.05, z1 + off], [x0 - off, vy0, z1 + off], [x0 - off, vy0, z0 - off]);
  vwall([x1 + off, y - 0.05, z0 - off], [x1 + off, y - 0.05, z1 + off], [x1 + off, vy0, z1 + off], [x1 + off, vy0, z0 - off]);
  vwall([x0 - off, y - 0.05, z0 - off], [x1 + off, y - 0.05, z0 - off], [x1 + off, vy0, z0 - off], [x0 - off, vy0, z0 - off]);
  voidG.add(new THREE.Mesh(quad(V(-300, vy0, 300), V(300, vy0, 300), V(300, vy0, -300), V(-300, vy0, -300)), voidM));
  g.add(voidG);
  return g;
};

// bedroom interior (used by 5 shots): floor + two walls, night window, two beds 2.5 m apart, door across the
// hall. Simple painted planes/boxes; characters are billboards on top (cast.ts). Open set: no ceiling.
const buildBedroom = (): THREE.Group => {
  const g = new THREE.Group(), b = new Batch();
  const bx = BED[0], bz = BED[2];
  const floor = lam("bedroomFloor", () => ({ map: planksHD() }));
  const wall = lam("bedroomWall", () => ({ map: stoneHD("bedroomWallHD", ["#c9b8a6", "#bcae9c", "#d3c4b2", "#b2a492"], "#8f8272") }));
  b.add(quad(V(bx - 3.1, 0.02, bz + 3.5), V(bx + 3.1, 0.02, bz + 3.5), V(bx + 3.1, 0.02, bz - 2.8), V(bx - 3.1, 0.02, bz - 2.8), 4, 4), floor);
  b.add(quad(V(bx - 3.1, 0, bz - 2.8), V(bx + 3.1, 0, bz - 2.8), V(bx + 3.1, 3.0, bz - 2.8), V(bx - 3.1, 3.0, bz - 2.8), 4, 2), wall);
  b.add(quad(V(bx - 3.1, 0, bz - 2.8), V(bx - 3.1, 3.0, bz - 2.8), V(bx - 3.1, 3.0, bz + 3.5), V(bx - 3.1, 0, bz + 3.5), 4, 2), wall);
  // right wall (to close the room for S1a/S1b views)
  b.add(quad(V(bx + 3.1, 0, bz - 2.8), V(bx + 3.1, 3.0, bz - 2.8), V(bx + 3.1, 3.0, bz + 3.5), V(bx + 3.1, 0, bz + 3.5), 4, 2), wall);
  // door across the hall at BED + [0, 0, -2.2], painted shut (unlit)
  b.add(quad(V(bx - 0.5, 0, bz - 2.74), V(bx + 0.5, 0, bz - 2.74), V(bx + 0.5, 2.15, bz - 2.74), V(bx - 0.5, 2.15, bz - 2.74)), lam("bedroomDoor", () => ({ map: planksHD() })));
  for (const s of [-1, 1]) b.add(boxGeo(V(bx + s * 0.5 - (s < 0 ? 0.08 : -0.0), 0, bz - 2.8), V(bx + s * 0.5 + (s < 0 ? 0.0 : 0.08), 2.25, bz - 2.72)),
    lam("bedroomTrim", () => ({ color: "#e2d6c2" })));
  b.add(boxGeo(V(bx - 0.58, 2.15, bz - 2.8), V(bx + 0.58, 2.25, bz - 2.72)), lam("bedroomTrim", () => ({ color: "#e2d6c2" })));
  // night window in the left wall: frame + glowing night-blue pane (slight bloom through the frame)
  const pane = glowMat("glowPane", 0.75, 1.0, 1.9);
  pane.userData.base = [0.75, 1.0, 1.9];
  const wy = bz + 0.6;
  b.add(quad(V(bx - 3.08, 0.9, wy), V(bx - 3.08, 2.2, wy), V(bx - 3.08, 2.2, wy + 1.2), V(bx - 3.08, 0.9, wy + 1.2)), pane);
  for (const [y0, y1, z0, z1] of [[0.84, 0.96, wy - 0.08, wy + 1.28], [2.14, 2.26, wy - 0.08, wy + 1.28], [0.96, 2.14, wy - 0.08, wy + 0.04], [0.96, 2.14, wy + 1.16, wy + 1.28]] as const)
    b.add(boxGeo(V(bx - 3.12, y0, z0), V(bx - 3.04, y1, z1)), lam("bedroomTrim", () => ({ color: "#e2d6c2" })));
  b.add(boxGeo(V(bx - 3.1, 0.96, wy + 0.56), V(bx - 3.05, 2.14, wy + 0.64)), lam("bedroomTrim", () => ({ color: "#e2d6c2" }))); // mullion
  // two beds 2.5 m apart, heads at the door wall
  for (const s of [-1, 1]) {
    const cx = bx + s * 1.25;
    const blanket = lam(s < 0 ? "blanketB" : "blanketS", () => ({ color: s < 0 ? "#44626a" : "#9c6470" }));
    b.add(boxGeo(V(cx - 0.55, 0.18, bz - 2.62), V(cx + 0.55, 0.42, bz + 0.1)), lam("bedFrame", () => ({ map: planksHD() })));
    b.add(boxGeo(V(cx - 0.55, 0.42, bz - 2.62), V(cx + 0.55, 1.15, bz - 2.5)), lam("bedFrame", () => ({ map: planksHD() }))); // headboard
    b.add(boxGeo(V(cx - 0.5, 0.42, bz - 2.5), V(cx + 0.5, 0.62, bz + 0.05)), lam("mattress", () => ({ color: "#d9d2c0" })));
    b.add(boxGeo(V(cx - 0.35, 0.62, bz - 2.45), V(cx + 0.35, 0.78, bz - 1.95)), lam("pillow", () => ({ color: "#e6e0d2" })));
    b.add(boxGeo(V(cx - 0.5, 0.62, bz - 1.9), V(cx + 0.5, 0.72, bz + 0.05)), blanket);
  }
  b.add(quad(V(bx - 1.0, 0.035, bz - 1.0), V(bx + 1.0, 0.035, bz - 1.0), V(bx + 1.0, 0.035, bz + 0.8), V(bx - 1.0, 0.035, bz + 0.8), 2, 2), lam("rug", () => ({ color: "#7a4a44" })));
  b.build(g, false);
  return g;
};

/** builds the whole night market into `root` (market group) and returns the per-scene zone groups + the boat
 *  groups (world.ts bobs them) and the flicker materials (lantern breathing). Keeps the sight-line culling. */
export type NightMarket = { market: THREE.Group; roof: THREE.Group; bedroom: THREE.Group; boats: THREE.Group[]; flicker: THREE.MeshBasicMaterial[] };
export const buildNightMarket = (root: THREE.Object3D, kit: Kit, rays: Ray[] = []): NightMarket => {
  sight = rays;
  LANTERNS.length = 0;
  const market = new THREE.Group();
  const roof = buildRoofZone();
  const bedroom = buildBedroom();
  const boats: THREE.Group[] = [];
  const b = new Batch();
  // ---- ground (flagstone): main market floor, street causeway across the canal, canal-side quays, bedroom island
  const flag = lam("flagstone", () => ({ map: cobbleHD() }));
  const patch = (x0: number, x1: number, z0: number, z1: number, y: number) =>
    b.add(quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), (x1 - x0) / 4, (z1 - z0) / 4), flag);
  patch(-34, 34, -70, -30.05, 0);
  patch(-4.5, 4.5, -30.05, 6, 0.02);
  patch(4.55, 20, -30.05, -4, 0.02);
  patch(-20, -4.55, -30.05, -4, 0.02);
  patch(26, 34, -4, 4, 0.02);
  // roof support columns (the deck they carry is in the roof zone group, shown only in the roof scenes)
  const ironCol = lam("marketIron", () => ({ color: "#26262e" }));
  for (const sx of [-1, 1]) for (const sz of [-32, -44])
    b.add(boxGeo(V(sx * 8.2 - 0.13, 0, sz - 0.13), V(sx * 8.2 + 0.13, ROOF_Y, sz + 0.13)), ironCol);
  // ---- stalls: two rows at x = +-STALL_X, z -12 .. -52, skipping the inherited tower slots at z ~ -27
  for (const sx of [-1, 1]) for (let k = 0; k < 11; k++) {
    const z = -12 - k * STALL_PITCH;
    if (Math.abs(z + 27) < 3) continue;
    stall(b, sx * STALL_X, z, sx < 0 ? Math.PI / 2 : -Math.PI / 2, 91 + k * 7 + (sx + 1) * 3);
  }
  // ---- lantern strings across the street every ~8 m (emissive bulbs: luminance ~1.5, bloom feeds off these)
  const bulbs = glowMat("glowBulb", 2.3, 1.4, 0.6);
  for (const z of [-10, -18, -26, -34, -42, -50, -58]) lanternString(b, market, z, bulbs);
  // ---- lamp trees (L04) + warm emissive windows on the flanking houses (x = +-8)
  const globes = glowMat("glowGlobe", 2.8, 1.9, 0.9);
  for (const [lx, , lz] of LAMP_TREES) lampTree(b, market, lx, lz, globes);
  const r2 = rng(77);
  for (const z of [-14, -23, -32, -41, -50, -59]) {
    if (z !== -41) marketHouse(b, -8, z, Math.PI / 2, 8, 8, [6, 6.5, 7, 8.4][Math.floor(r2() * 4)], Math.floor(r2() * 8));
    if (z !== -50) marketHouse(b, 8, z, -Math.PI / 2, 8, 8, [6, 6.5, 7, 8.4][Math.floor(r2() * 4)], Math.floor(r2() * 8));
  }
  flowerShop(b);
  clockworkShop(b);
  keyCage(b);
  const railGlow = glowMat("glowRail", 2.2, 1.4, 0.6);
  const boatGlow = glowMat("glowBoat", 2.6, 1.7, 0.75);
  waterSubway(b, market, kit, boats, railGlow, boatGlow);
  b.build(market);
  sight = [];
  return { market, roof, bedroom, boats, flicker: [bulbs, globes, railGlow, boatGlow] };
};
