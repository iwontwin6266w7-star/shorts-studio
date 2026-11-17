// The night-market cast as lit flat sprites in the 3D world (same machinery as the bridge template: one canvas per
// distinct drawing, yaw-only billboards shaded by cardShade(), NOINK layer, contact blobs). Roles per the contract:
// brother (POV twin, pajama stripes), sister (nightgown, hair tuft), the collector (gliding, clock-face coat),
// the butcher (deadpan, cleaver), townsfolk in pajamas + SOCKS ONLY, bedroom billboards (beds as painted cards,
// sit-up jolts, the pocket-watch insert). Crowd modes: "market" (wander) and "empty" (nobody).
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, collectorBody, bedCard, fxPocketWatch, fxCreak, fxContact, shade,
  Outfit, Expr, FrontOpts, SideOpts, BedOpts, SKINS,
} from "./toon";
import { FPS, SHOTS, V3 } from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows, drawOrder 1. */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;

// ---------------- story access (loose on purpose: story.ts is being rewritten in parallel) ----------------
type ShotLike = { id?: number; a?: number; b?: number; crowd?: string; scene?: string; light?: string; tau?: (t: number) => number };
const shotOf = (id: number): ShotLike => (SHOTS as unknown as readonly ShotLike[])[id - 1] ?? {};

// layout pins, duplicated from the contract (world/build export their own; kept local so cast.ts never depends on
// files that are themselves in flux). BED = bedroom origin, CAGE = cage of keys in the collector alley.
export const BED: V3 = [30, 0, 0];
export const CAGE: V3 = [1.5, 0, -58];
const BRO_BED: V3 = [BED[0] - 1.25, 0, BED[2]]; // brother's bed 2.5 m from the sister's, per the contract
const SIS_BED: V3 = [BED[0] + 1.25, 0, BED[2]];
const DOOR: V3 = [BED[0], 0, BED[2] - 2.2];     // the hall door (sister's door bursts open at f1545)
const LEVIT: V3 = [-2, 0, 0];                   // the levitating man over the canal water (S3)
const BUTCHER_PIN: V3 = [0, 0, -24.5];          // the butcher's deadpan MS spot (S4)

// ---------------- outfits ----------------
// SOCKS ONLY on every townsfolk foot (story beat): the "boots" field carries the sock colour.
const SOCK = "#cfc7b8", SOCK2 = "#d8d2c4";
/** the POV twin: muted striped pajamas, 3.5 head-heights (adult build) */
export const BROTHER: Outfit = { jacket: "#6a7a94", pants: "#5a5464", boots: SOCK, stripes: "#55637e", skin: SKINS[0] };
/** the younger sister: 3.2 head-heights -> drawn on the adult card at scale 0.91, nightgown + hair tuft */
export const SISTER: Outfit = { jacket: "#c9cede", pants: "#c9cede", boots: SOCK2, dress: "#c9cede", hat: "hair", hair: "#8a5a34", tuft: true, skin: SKINS[1], blanket: "#8a5a7a" };
/** the butcher: apron over the nightgown, deadpan, cleaver */
export const BUTCHER: Outfit = { jacket: "#9a92a0", pants: "#9a92a0", boots: SOCK, dress: "#9a92a0", apron: "#e2ddd0", moustache: "#4a3426", skin: SKINS[2], blanket: "#7a7488" };
/** townsfolk in pajamas + socks for the market wander */
export const pajamas = (v = 0): Outfit => {
  const coats = ["#6a7a94", "#7a6a8a", "#5f7a6a", "#8a6a5f", "#6a6a7a", "#75758a"];
  const o: Outfit = { jacket: coats[v % 6], pants: ["#5a5464", "#4a4a58", "#6a5a4a"][v % 3], boots: v % 2 ? SOCK : SOCK2, skin: SKINS[v % 4] };
  if (v % 3 === 0) o.hat = "hair", o.hair = ["#5a3b2a", "#2a201a", "#8a7a5a"][v % 3];
  if (v % 3 === 1) o.stripes = shade(coats[v % 6], 0.82);
  return o;
};
BROTHER.blanket = "#5a6a8a";

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" | "night" = "night";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the light comes FROM on an upright card, 45-degree steps. Night: the moon key (cool, from up-left of
 *  the card) so the painted crescents read on the plum ink. */
const light2D = (cam: CamInfo, mirror: boolean) => {
  if (LNAME === "night") return Math.round((Math.PI * -0.75) / (Math.PI / 4)) * (Math.PI / 4) * (mirror ? -1 : 1);
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz) */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks ----------------
/** reactions land 0-3 f BEFORE their word (contract beat map): expression switches below use word - 2 f */
const LEAD = 2 / FPS;
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit for the scene */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2 * scale, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design] */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- contact blobs (night palette: cool, dimmer than day) ----------------
const CONTACT: Record<"day" | "golden" | "night", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], night: [0.13, 0.14, 0.24] };
const toSrgb = (v: number) => { const c = Math.max(0, Math.min(1, v)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + 0.022, z,
    w: 0.52 * sc, h: 0.4 * sc, flat: true });
};

// ---------------- beat windows (frames, from the CONTRACT beat map; already carry the 0-3 f lead) ----------------
const F = {
  wake: 84,            // brother sits up gasping just before the flash (L01 ends f86, FLASH_AT 88)
  levitate: [206, 304],// S3: someone levitating 3 m up over the water subway
  butcher: [305, 386], // S4: butcher deadpan MS
  joltRule: [413, 470],// S5: sleeper jolts mid-"one rule everyone knows"
  reveal: [585, 697],  // S7: collector reveal
  sevenBeds: 766,      // S8: the seven empty beds
  sisterEight: 805,    // S8: sister is the eighth
  cage: [938, 1022],   // S9: sister trapped in the cage of keys
  rescue: [1026, 1127],// S10: lockpick, grab wrist, collector behind, "Nobody leaves my market"
  ticks: [1050, 1062, 1074],
  chase: [1141, 1263], // S11: run, feet sticking
  roof: [1263, 1470],  // S12
  handHold: [1373, 1440], // L30: "we're trapped" / "no, we're not"
  hope: 1438,          // sister flips to hopeful 2 f before "no, we're not" lands
  jump: [1469, 1489],  // S13a: the leap
  falling: [1491, 1503], // S13b: falling (jolt at 1504 is story.ts's white snap)
  gaspAwake: 1511,     // S14: I sat up gasping
  doorBurst: 1543,     // S14: sister's door bursts open
  alone: [1716, 1813], // S15: empty market, brother alone
  himFar: 1792,        // S15: "and except for him"
  entrance: [1814, 1957], // S16
  whisper: [1874, 1888],  // L43
  stepsOff: 1930,      // L44 tail: walks to the ledge, steps off
  watch: 1976,         // S17: the pocket watch
};

// ---------------- roles ----------------
const brother = (i: number): Who => ({ i, o: BROTHER, okey: "bro" });
const sister = (i: number): Who => ({ i, o: SISTER, okey: "sis" });
const SIS_SCALE = 0.91; // 3.2 / 3.5 head-heights
const COLLECTOR_SCALE = 1.85; // he fills his own 600x1000 card already: 962 u drawn ~ 2.08 m x 1.85 = 2.3x the brother card

/** the collector as one card: glides (no bob), slow sway only; face shadow + faint pale eyes */
const collector = (cam: CamInfo, t: number, out: Stage, x: number, y: number, z: number, blinkOn = true) => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2 * COLLECTOR_SCALE, z)) / COLLECTOR_SCALE;
  const [w, h, k] = tier(d);
  const light = light2D(cam, false);
  const sway = q(0.7 * Math.sin(t * 0.45), 12); // deg: a slow glide sway, quantised so the pool holds
  const lid = blinkOn ? lidAt(t, 60) : 0;
  out.places.push({
    key: `col|${sway}|${light}|${lid}|${w}`, x, y, z, scale: COLLECTOR_SCALE,
    draw: (p) => collectorBody(p, { light, seed: 11, sway, blink: lid }), size: [w, h, k],
  });
  blob(out, x, y, z, COLLECTOR_SCALE, 0.9);
};

/** a painted bed card (BODY geometry, base line at the design floor) */
const bed = (out: Stage, x: number, z: number, key: string, o: BedOpts, sc = 1.5) => {
  out.places.push({ key: `${key}|${q(o.lump ?? 0, 12)}`, x, y: 0, z, scale: sc, draw: (p) => bedCard(p, o), size: [900, 1500, 1.5] });
  blob(out, x, 0, z, 1.3 * sc, 0.8);
};

// ---------------- shots ----------------
/** S1 f0-88: bedroom night, two sleepers breathing; brother sits up gasping 2 f before the wake word ends */
const bedroom1 = (t: number, out: Stage) => {
  const br = 0.5 + 0.5 * Math.sin(t * 1.5); // breath: ~4 s cycle
  bed(out, BRO_BED[0], BRO_BED[2], "bedB", { lump: br, head: BROTHER.skin ?? "#ffe2c2", blanket: BROTHER.blanket });
  bed(out, SIS_BED[0], SIS_BED[2], "bedS", { lump: 0.5 + 0.5 * Math.sin(t * 1.5 + 1.1), head: SISTER.skin ?? "#f5c9a0", blanket: "#8a5a7a", hair: SISTER.hair });
};

/** S2/S3: townsfolk in pajamas + socks wander the street (stroll), some chat in pairs */
const market = (t: number, cam: Info, out: Stage) => {
  for (let i = 0; i < 16; i++) {
    const chat = i % 5 >= 3; // pairs stand and talk
    let x: number, z: number, facing: -1 | 0 | 1 = 0, dx = 0, dz = 0, phase = 0, mode: FrontOpts["mode"] = "stroll";
    if (chat) {
      const pair = i % 5 === 3 ? i : i - 1, side = i % 5 === 3 ? -1 : 1;
      x = (hh(pair, 4) - 0.5) * 3.6 + side * 0.45;
      z = -14 - (pair % 6) * 6.5 - hh(pair, 6) * 2;
      facing = side as -1 | 1;
      mode = "stand";
    } else {
      const dir = i % 2 ? 1 : -1, sp = 0.35 + hh(i) * 0.35;
      z = -10 - (((hh(i, 2) * 44 + sp * t) % 44) + 44) % 44;
      x = (hh(i, 3) - 0.5) * 4.2;
      dz = dir; phase = (t * sp / 0.75) % 1;
    }
    const v = vOf(i), who: Who = { i: i + 100, o: pajamas(v), okey: `pj${v}` };
    const expr: Expr = chat ? (i % 2 ? "smile_closed" : "smile") : i % 4 === 3 ? "smile" : "neutral";
    const fo: FrontOpts = { mode, phase, expr, facing, blink: lidAt(t, i + 100), look: chat ? -facing * 0.6 : Math.round(Math.sin(t * 0.7 + i) ) };
    const view = viewOf(cam, x, z, dx, dz);
    out.places.push(person(cam, who, x, 0, z, view, fo, { mode: "march", phase, expr, stomp: 0.55, stride: view.fs * 0.55 }));
    blob(out, x, 0, z);
  }
};

/** S3 extra: levitate ten feet if you don't look down - cross-legged, 3 m up, slow bob, serene */
const levitator = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS);
  if (f < F.levitate[0] || f > F.levitate[1]) return;
  const y = 3 + 0.06 * Math.sin(t * 0.9);
  const v = 2, who: Who = { i: 300, o: pajamas(v), okey: `pj${v}` };
  const fo: FrontOpts = { mode: "levitate", expr: "relief", blink: lidAt(t, 300) };
  out.places.push(person(cam, who, LEVIT[0], y, LEVIT[2], { side: false, mirror: false }, fo, {}));
};
const vOf = (i: number) => (i * 7 + (i >> 2)) % 6;

/** S4 f305-386: the butcher shows up in his bathroom nightly, does not care anymore: deadpan, cleaver, no reaction */
const butcher = (t: number, cam: CamInfo, out: Stage) => {
  const fo: FrontOpts = { mode: "stand", expr: "deadpan", prop: "cleaver", blink: lidAt(t, 40), headTilt: 2 * Math.sin(t * 0.5) };
  out.places.push(person(cam, { i: 40, o: BUTCHER, okey: "but" }, BUTCHER_PIN[0], 0, BUTCHER_PIN[2], { side: false, mirror: false }, fo, {}));
  blob(out, BUTCHER_PIN[0], 0, BUTCHER_PIN[2], 1.05);
};

/** S5 f387-485: bedroom insert - a sleeper jolts up mid-rule */
const bedroom5 = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS);
  const up = f >= F.joltRule[0];
  bed(out, BRO_BED[0], BRO_BED[2], "bedB", { lump: up ? 0 : 0.5 + 0.5 * Math.sin(t * 1.6), head: up ? null : BROTHER.skin, blanket: BROTHER.blanket });
  if (up) sitUp(cam, t, out, BRO_BED[0], BRO_BED[2], "gasp", 1.5);
};

/** sit-up-in-bed card (brother or sister), same scale as the bed cards so they share proportions */
const sitUp = (cam: Info, t: number, out: Stage, x: number, z: number, expr: Expr, sc = 1.5, who: Who = brother(7)) => {
  const fo: FrontOpts = { mode: "bedsit", expr, blink: lidAt(t, who.i), look: 0 };
  out.places.push(person(cam, who, x, 0.42 * (sc / 1.5), z, { side: false, mirror: false }, fo, {}, sc));
};

/** S7 f585-697: collector reveal - full body at the back of the alley (COLL_ALLEY 1.2, -50), gliding slowly forward */
const reveal = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS);
  const z = -52.5 + Math.min(2.8, Math.max(0, f - F.reveal[0]) * 0.051);
  collector(cam, t, out, 1.05, 0, z);
};

/** S8 f698-849: brother breathing forever; the seven empty beds; sister is the eighth */
const bedroom8 = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS);
  bed(out, BRO_BED[0], BRO_BED[2], "bedB", { lump: 0.5 + 0.5 * Math.sin(t * 1.15), head: BROTHER.skin, blanket: BROTHER.blanket });
  if (f >= F.sevenBeds) for (let i = 0; i < 7; i++) {
    const sc = 1.15 - i * 0.06;
    bed(out, BRO_BED[0] - 3.4 + i * 1.15, BRO_BED[2] - 1.4 - i * 0.12, `empty${i}`, { lump: 0 }, sc);
  }
  if (f >= F.sisterEight) bed(out, SIS_BED[0], SIS_BED[2], "bedS", { lump: 0.5 + 0.5 * Math.sin(t * 1.15 + 0.8), head: SISTER.skin, blanket: "#8a5a7a", hair: SISTER.hair });
};

/** S9 f940-1022: sister trapped in the cage of keys, terrified, hands up at the bars */
const cageSister = (t: number, cam: Info, out: Stage) => {
  const fo: FrontOpts = { mode: "cage", expr: "terrified", facing: 0, blink: lidAt(t, 50) };
  out.places.push(person(cam, sister(50), CAGE[0] - 0.05, 0, CAGE[2] + 0.42, { side: false, mirror: false }, fo, {}, SIS_SCALE));
  blob(out, CAGE[0] - 0.05, 0, CAGE[2] + 0.42, SIS_SCALE);
};

/** S10 f1028-1127: lockpick, grab her wrist; behind us: tick, tick, tick; "Nobody leaves my market" */
const cageRescue = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS), inRescue = f >= F.rescue[0];
  // brother: reaching for her wrist (grab 1), determined
  const fb: FrontOpts = { mode: "stand", expr: "determined", facing: 1, grab: inRescue ? 1 : 0.45, blink: lidAt(t, 51) };
  out.places.push(person(cam, brother(51), CAGE[0] - 0.62, 0, CAGE[2] + 0.34, { side: false, mirror: false }, fb, {}));
  blob(out, CAGE[0] - 0.62, 0, CAGE[2] + 0.34);
  // sister: terrified at the bars, hopeful once her wrist is held (0-3 f before "grabbed her wrist")
  const fs: FrontOpts = { mode: "cage", expr: inRescue && f >= 1026 ? "hopeful" : "terrified", facing: -1, blink: lidAt(t, 50) };
  out.places.push(person(cam, sister(50), CAGE[0] - 0.05, 0, CAGE[2] + 0.42, { side: false, mirror: false }, fs, {}, SIS_SCALE));
  blob(out, CAGE[0] - 0.05, 0, CAGE[2] + 0.42, SIS_SCALE);
  // the collector glides in behind: closer at every tick
  const u = Math.min(1, Math.max(0, (f - F.rescue[0]) / (F.rescue[1] - F.rescue[0])));
  collector(cam, t, out, CAGE[0] + 1.3, 0, CAGE[2] - 2.4 + 1.5 * u);
  for (const th of F.ticks) if (f >= th && f < th + 5) {
    const uu = (f - th) / 5;
    out.fx.push({ key: `tick${q(uu, 30)}`, cw: 300, ch: 300, draw: (p) => fxCreak(p, q(uu, 30)), x: CAGE[0] + 1.1, y: 3.1, z: CAGE[2] - 1.2, w: 0.5, h: 0.5, rot: 0.4 });
  }
};

/** S11 f1143-1263: the chase - run cycles (fast phase, 6 deg lean), brother determined, sister terrified */
const chase = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS), u = Math.min(1, Math.max(0, (f - F.chase[0]) / (F.chase[1] - F.chase[0])));
  // nightmare feet stick like wet concrete: ground speed sags in the middle third, the lean does not
  const stick = 1 - 0.45 * Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.3) / 0.5)));
  const z = -50 + 4.5 * u * stick;
  const ph = (t * 2.7) % 1;
  const fb: FrontOpts = { mode: "run", phase: ph, expr: "determined", facing: 1, tilt: 6, lift: 92, blink: lidAt(t, 51) };
  out.places.push(person(cam, brother(51), 0.4, 0, z, viewOf(cam, 0.4, z, 0, 1), fb, { mode: "march", phase: ph, stomp: 1.2, stride: 1.3 }));
  blob(out, 0.4, 0, z);
  const fs: FrontOpts = { mode: "run", phase: (ph + 0.35) % 1, expr: "terrified", facing: 1, tilt: 6.5, lift: 88, blink: lidAt(t, 50) };
  out.places.push(person(cam, sister(50), 0.95, 0, z + 0.5, viewOf(cam, 0.95, z + 0.5, 0, 1), fs, { mode: "march", phase: (ph + 0.35) % 1, stomp: 1.2, stride: 1.3 }, SIS_SCALE));
  blob(out, 0.95, 0, z + 0.5, SIS_SCALE);
  // "that's him" (S11c, f>=1250): the collector looms far down the alley behind the runners
  if (f >= 1250) collector(cam, t, out, 2.7, 0, -53.5);
};

/** S12 f1265-1470: roof dead end at y = 9.8; from f1373 they hold hands; she flips hopeful before "no, we're not" */
const roof = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS), y = 9.8, z = -38.6, hold = f >= F.handHold[0];
  const fb: FrontOpts = { mode: "stand", expr: "determined", facing: 1, grab: hold ? 1 : 0, blink: lidAt(t, 51) };
  out.places.push(person(cam, brother(51), -0.38, y, z, { side: false, mirror: false }, fb, {}));
  const fs: FrontOpts = { mode: "stand", expr: f >= F.hope ? "hopeful" : "terrified", facing: -1, grab: hold ? 1 : 0, blink: lidAt(t, 50) };
  out.places.push(person(cam, sister(50), 0.38, y, z, { side: false, mirror: false }, fs, {}, SIS_SCALE));
  blob(out, -0.38, y, z); blob(out, 0.38, y, z, SIS_SCALE);
};

/** S13 f1471-1503: we jumped -> falling; gone after the jolt (white snap is story.ts's) */
const fallingShot = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS);
  if (f < F.jump[0] || f > F.falling[1]) return;
  let y: number;
  if (f < F.falling[0]) y = 9.8 + 0.45 * Math.sin((Math.min(1, (f - F.jump[0]) / 18)) * Math.PI); // the leap
  else y = 9.8 - 8.5 * ((f - F.falling[0]) / (F.falling[1] - F.falling[0])) ** 2;
  if (y < -2) return;
  const fb: FrontOpts = { mode: "fall", expr: "gasp", blink: 0 };
  out.places.push(person(cam, brother(51), -0.3, y, -38.2, { side: false, mirror: false }, fb, {}));
  const fs: FrontOpts = { mode: "fall", expr: "terrified", blink: 0 };
  out.places.push(person(cam, sister(50), 0.42, y - 0.12, -38.2, { side: false, mirror: false }, fs, {}, SIS_SCALE));
};

/** S14 f1513-1617: brother sits up gasping; sister's door bursts open -> she stands in the hall, hopeful */
const bedroom14 = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS);
  if (f >= F.gaspAwake) {
    bed(out, BRO_BED[0], BRO_BED[2], "bedB", { lump: 0, blanket: BROTHER.blanket });
    sitUp(cam, t, out, BRO_BED[0], BRO_BED[2], "gasp", 1.5);
  }
  if (f >= F.doorBurst) {
    const fo: FrontOpts = { mode: "stand", expr: "hopeful", blink: lidAt(t, 50) };
    out.places.push(person(cam, sister(50), DOOR[0], 0, DOOR[2], { side: false, mirror: false }, fo, {}, SIS_SCALE));
    blob(out, DOOR[0], 0, DOOR[2], SIS_SCALE);
  }
};

/** S15 f1718-1813: market completely empty (crowd "empty" - nobody else), brother alone, the collector far off */
const alone = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS);
  const u = Math.min(1, Math.max(0, (f - F.alone[0]) / (F.alone[1] - F.alone[0])));
  const z = -16 - 17 * u, ph = (t * 1.9) % 1;
  const fb: FrontOpts = { mode: "march", phase: ph, expr: "determined", facing: 0, blink: lidAt(t, 51), lift: 55 };
  out.places.push(person(cam, brother(51), 0.4, 0, z, viewOf(cam, 0.4, z, 0, -1), fb, { mode: "march", phase: ph, stomp: 0.9, stride: 0.9 }));
  blob(out, 0.4, 0, z);
  if (f >= F.himFar) collector(cam, t, out, 0.8, 0, -56);
};

/** S15 f1618-1715: "the trick" - pajama-clad townsfolk keep jumping off the roofs, one after another */
const trick = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS);
  if (f < 1618 || f > 1715) return;
  for (let i = 0; i < 3; i++) {
    const p = (((f - 1618 - i * 16) / 42) % 1 + 1) % 1;
    const y = 10.0 - 8.5 * p * p;
    if (y < 0.3) continue;
    const v = 5 + (i % 2);
    const who: Who = { i: 400 + i, o: pajamas(v), okey: `pj${v}` };
    const fo: FrontOpts = { mode: "fall", expr: i % 2 ? "terrified" : "gasp", blink: 0 };
    const x = -0.8 + i * 0.9, z = -44.8 - i * 0.7;
    out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, fo, {}));
  }
};

/** S16 f1814-1957: collector at the market entrance, whispers, then walks to the ledge and steps off (glides down) */
const entrance = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS);
  // glide up the street to the entrance (z ~ -8.3), then walk on to the ledge LEDGE_M (z -5) by f1929
  const z0 = -10.5 + Math.min(3.5, Math.max(0, f - F.entrance[0]) * 0.022);
  const z = Math.min(f >= 1914 ? z0 + Math.min(3.3, (f - 1914) * 0.22) : z0, -5);
  let y = 0;
  if (f >= F.stepsOff) { y = -9 * ((f - F.stepsOff) / 27) ** 2; if (y < -8) return; }
  collector(cam, t, out, 0, y, z);
};

/** S17 f1958-2036: bolt upright (jolt 2), then the pocket-watch insert at the foot of the bed */
const watch = (t: number, cam: Info, out: Stage) => {
  const f = Math.round(t * FPS);
  bed(out, BRO_BED[0], BRO_BED[2], "bedB", { lump: 0, blanket: BROTHER.blanket });
  sitUp(cam, t, out, BRO_BED[0], BRO_BED[2], "gasp", 1.5);
  if (f < F.watch) return;
  out.fx.push({ key: "pwatch", cw: 900, ch: 1500, draw: (p) => fxPocketWatch(p), x: 28.78, y: 0.30, z: 0.50, w: 0.45, h: 0.75, soft: true });
};

type Info = CamInfo; // short alias used above

/** everything with a face in shot `id` at global time t (seconds). `b` is whatever state world.ts keeps - the
 *  nightmarket cast does not read bridge physics, accepted loose so story/world can keep changing. */
export const stage = (id: number, t: number, _b: unknown, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = shotOf(id);
  LNAME = (s.light as "day" | "golden" | "night") ?? "night";
  findSun(cam, SUN);
  if (s.crowd === "market") market(t, cam, out);
  // "empty" = no crowd at all (the brother walks alone; the collector is placed by the shot logic)
  switch (id) {
    case 1: bedroom1(t, out); break;
    case 3: levitator(t, cam, out); break;
    case 4: butcher(t, cam, out); break;
    case 5: bedroom5(t, cam, out); break;
    case 7: reveal(t, cam, out); break;
    case 8: bedroom8(t, cam, out); break;
    case 9: cageSister(t, cam, out); break;
    case 10: cageRescue(t, cam, out); break;
    case 11: chase(t, cam, out); break;
    case 12: roof(t, cam, out); break;
    case 13: fallingShot(t, cam, out); break;
    case 14: bedroom14(t, cam, out); break;
    case 15: trick(t, cam, out); alone(t, cam, out); break;
    case 16: entrance(t, cam, out); break;
    case 17: watch(t, cam, out); break;
  }
  return out;
};

/** generic jittering tick marks (kept from the template for world.ts convenience) */
export const creakFx = (t: number, pts: V3[], out: Stage, size = 0.8) =>
  pts.forEach(([x, y, z], i) => {
    const u = q((t * 1.3 + i * 0.37) % 1, 30);
    out.fx.push({ key: `creak${u}`, cw: 300, ch: 300, draw: (p) => fxCreak(p, u), x, y, z, w: size, h: size, rot: i * 0.6 - 0.6 });
  });

export { FPS };
