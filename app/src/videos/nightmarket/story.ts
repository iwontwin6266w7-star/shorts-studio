// Timeline of "The Night Market": 17 shots timed to the voice words (timings.ts, faster-whisper word frames).
// Camera grammar is the one proven in the bridge study, reused verbatim: continuous slow push-ins (pushK), symmetric
// smootherstep glides 18-40 f centred on their key frame (run/mix/glide), big reframes are hard cuts, 7-frame kicks
// (flip sign every frame) on the impacts, no static hold >= 4 f (every hold creeps 0.15-0.35 %/f, ~0.6 %/f punch on
// the punch words), 4-5 deg rolls layered on emphasis beats.
//
// CROWD semantics for the world/cast agents (per shot, modes only, no per-frame posing from here):
//   "market"  = townsfolk in pajamas + socks wandering the stalls (S2, S4)
//   "empty"   = the market dressed but with zero crowd (S15, S16: "completely empty now, except for me")
//   "bedroom" = the two beds + billboards only (S1, S5, S8, S14, S17)
//   "roof"    = rooftop plane + the two twins, no crowd (S12, S13)
//   "alley"   = back-alley zone, cast actors only, no townsfolk (S6, S7)
//   "none"    = no crowd dressing at all (S3 canal, S9-S11: brother goes in alone)
// SCENE tags drive world dressing: "bedroom" | "market" | "alley" | "roof".
//
// Layout pins: CONTRACT.md pins are defined HERE as local constants (build.ts/world.ts were being rewritten in
// parallel, so story.ts is the single source the camera maths relies on; values match the contract exactly). If the
// world/build agents export the same names they can re-export or import these. Actor pins the cameras aim at are
// included (BUTCHER, COLL_*, LEVIT): cast.ts should pose those roles at (or walk through) these points.
export const FPS = 30;
export const TOTAL = 2040;
export const D0 = 0; // compat with build.ts (houses/props base on y = D0): the night-market ground is y = 0
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- layout pins (CONTRACT.md "World layout pins", metres, ground y = 0) ----------------
export const BED: V3 = [30, 0, 0]; // bedroom zone centre (simple interior at x = 30, off the street)
export const BED_B: V3 = [BED[0] - 1.25, 0, 0]; // brother's bed
export const BED_S: V3 = [BED[0] + 1.25, 0, 0]; // sister's bed (2.5 m apart)
export const DOOR: V3 = [BED[0], 0, BED[2] - 2.2]; // sister's door across the hall
export const WINDOW: V3 = [BED[0] - 3.08, 1.5, BED[2] + 1.2]; // night-blue window (left wall, center pane)
export const WATCH: V3 = [28.78, 0.30, 0.50]; // pocket watch at the foot of the brother's bed (S17 close-up)
export const STREET_X = 4.5; // market street: x in [-4.5, 4.5], z from ENTRANCE to ALLEY_END
export const ENTRANCE = -8;
export const ALLEY_END = -66;
export const FLOWER: V3 = [-8, 0, -40]; // upside-down flower shop
export const CLOCK: V3 = [8, 0, -52]; // clockwork shop
export const CAGE: V3 = [1.5, 0, -58]; // cage of rusted keys (sister inside)
export const ROOF_Y = 9.8;
export const ROOF: V3 = [0, ROOF_Y, -38]; // rooftop plane centre over the market houses
export const LEDGE: V3 = [0, ROOF_Y, -44]; // dead-end edge; past it the fog runs to pure black (no ground)
export const LEVIT: V3 = [-2, 0, 0]; // the man levitating over the canal (water surface y = 0, bridge river geometry)
export const BUTCHER: V3 = [0, 0, -24.5]; // deadpan MS pin (apron over nightgown, cleaver)
export const COLL_ALLEY: V3 = [1.2, 0, -50]; // the collector's reveal spot in the alley (8 feet tall)
export const COLL_BACK: V3 = [2.6, 0, -60]; // where he stands behind us at the ticks (S10)
export const COLL_ENTR: V3 = [0, 0, -9]; // him at the market entrance (S16); LEDGE_M = the broken entrance edge
export const LEDGE_M: V3 = [0, 0, -5]; // "the ledge" he walks to and steps off (S16)

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type Crowd = "market" | "alley" | "roof" | "bedroom" | "empty" | "none";
export type Scene = "bedroom" | "market" | "alley" | "roof";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd; scene: Scene; tau: (t: number) => number };
/** tau kept for API compatibility with the bridge world/cast (story time in seconds); the night market has no
 *  global physics, so it is the identity — world/cast can use it for wander/loop phases if useful. */
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 89, light: "night", crowd: "bedroom", scene: "bedroom", tau: (t) => t }, // hook: window -> sleeper
  { id: 2, a: 89, b: 208, light: "night", crowd: "market", scene: "market", tau: (t) => t }, // aerial -> socks -> lamp trees
  { id: 3, a: 208, b: 305, light: "night", crowd: "none", scene: "market", tau: (t) => t }, // water subway, levitating man
  { id: 4, a: 305, b: 387, light: "night", crowd: "market", scene: "market", tau: (t) => t }, // butcher deadpan
  { id: 5, a: 387, b: 486, light: "night", crowd: "bedroom", scene: "bedroom", tau: (t) => t }, // rule; sleeper jolts
  { id: 6, a: 486, b: 585, light: "night", crowd: "none", scene: "alley", tau: (t) => t }, // the collector, flower shop
  { id: 7, a: 585, b: 698, light: "night", crowd: "none", scene: "alley", tau: (t) => t }, // collector reveal, clock-face coat
  { id: 8, a: 698, b: 850, light: "night", crowd: "bedroom", scene: "bedroom", tau: (t) => t }, // breathing forever; the eight
  { id: 9, a: 850, b: 1028, light: "night", crowd: "none", scene: "alley", tau: (t) => t }, // going in: canal, clockwork, cage
  { id: 10, a: 1028, b: 1143, light: "night", crowd: "none", scene: "alley", tau: (t) => t }, // lockpick, wrist, ticks, rule spoken
  { id: 11, a: 1143, b: 1264, light: "night", crowd: "none", scene: "alley", tau: (t) => t }, // chase; that's him
  { id: 12, a: 1264, b: 1471, light: "night", crowd: "roof", scene: "roof", tau: (t) => t }, // dead end, hand hold
  { id: 13, a: 1471, b: 1513, light: "night", crowd: "roof", scene: "roof", tau: (t) => t }, // jump -> falling -> JOLT
  { id: 14, a: 1513, b: 1618, light: "night", crowd: "bedroom", scene: "bedroom", tau: (t) => t }, // sat up; door bursts
  { id: 15, a: 1618, b: 1814, light: "night", crowd: "empty", scene: "market", tau: (t) => t }, // the trick; empty market; him
  { id: 16, a: 1814, b: 1958, light: "night", crowd: "empty", scene: "market", tau: (t) => t }, // entrance, whisper, steps off
  { id: 17, a: 1958, b: TOTAL, light: "night", crowd: "bedroom", scene: "bedroom", tau: (t) => t }, // jolt; pocket watch
];
/** crossfades (frames) at place changes (bedroom/market/alley/roof); everything else cuts */
export const XFADE: Record<number, number> = { 2: 6, 5: 6, 6: 8, 8: 8, 9: 8, 12: 8, 14: 8, 15: 8, 17: 6 };
export const FLASH_AT = 88; // white 4-frame flash after the hook (Bridge->NightMarket.tsx DOM overlay)

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
/** layers to draw at frame f: base shot, plus the next shot fading in during a crossfade */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
// Grammar (motion.md, proven in the bridge study): every move is a symmetric smootherstep glide of 18-40 f (peak
// speed = 1.875 x distance / dur); a reframe bigger than about half a frame width or 40 % zoom is a hard cut on its
// key frame. Glides are centred on the old key frame, so a glide key starts dur/2 earlier. Holds push in (dolly
// toward the look point, or a fov zoom when the lens sits against scenery): 0.15-0.35 %/f, ~0.6 %/f for ~35 f on the
// punch words. Rolls of 4-5 deg layered over >= 18 f on emphasis beats. Impacts are 7-frame kicks.
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
/** reference camera ease: symmetric smootherstep (attack = release) */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
/** push-in factor since f0: the subject grows ~rate per frame; `punch` raises it (with 8 f soft edges) for the first n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
/** dolly push: camera slides toward the look point by factor k */
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** zoom push (camera stays put, for lenses next to houses / stall canopies): tan(fov/2) shrinks by k */
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
/** a roll-only move on top of an existing framing */
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });

// ---- framings (f -> camera); each pushes in from the frame its key starts ----
// shot 1 (hook): window insert with the night-blue glow -> window CU on "unlocked" -> down at the sleeper on "wake";
// punch through "night market" (75-86) into the 4-frame white flash at 88
const S1a = (f: number) => dolly([31.1, 1.45, -0.4], WINDOW, pushK(f, 0, 0.0025), { fov: 40 });
const S1b = (f: number) => dolly([30.65, 1.55, 0.95], WINDOW, pushK(f, 30, 0.002), { fov: 36, roll: -0.03 });
const S1c = (f: number) => dolly([29.55, 1.55, -1.05], [BED_B[0], 0.75, 0.1], pushK(f, 61, 0.002, 0.006, 24), { fov: 38, roll: 0.04 });
// shot 2: market aerial under the flash -> crowd-in-socks MS ("socks", cut) -> up-tilt on the impossible architecture
// -> low angle up the lamp tree at z = -18 ("street lights grow like trees", punch on "trees.")
const S2a = (f: number) => zoom([5.5, 11, 1.5], [0, 0.5, -22], 44, pushK(f, 89, 0.002)); // zoom: canopy strings below the lens
const S2b = (f: number) => dolly([1.7, 1.25, -10.5], [0, 1.05, -18], pushK(f, 117, 0.002), { fov: 40 });
const S2c = (f: number) => dolly([-2.6, 1.7, -13.5], [0.5, 2.7, -24], pushK(f, 134, 0.0018), { fov: 42, roll: 0.05 });
const S2d = (f: number) => zoom([1.8, 0.75, -14.6], [-4.6, 4.4, -18], 40, pushK(f, 171, 0.0018, 0.006, 30), { roll: -0.04 });
// shot 3: low over the canal water along the glowing rails -> the levitating man MS ("feet", cut) ->
// over his shoulder down into the black water ("don't look down")
const S3a = (f: number) => dolly([-13.5, 0.85, 5.5], [-3, 0.55, 4.5], pushK(f, 208, 0.002), { fov: 44 });
const S3b = (f: number) => dolly([-5.6, 3.0, -2.6], [LEVIT[0], 3.15, LEVIT[2]], pushK(f, 245, 0.002), { fov: 38 });
const S3c = (f: number) => dolly([LEVIT[0] - 0.3, 6.0, 2.0], [LEVIT[0], 2.9, -0.6], pushK(f, 285, 0.0025), { fov: 44, roll: 0.06 });
// shot 4: butcher MS (apron over nightgown, cleaver) -> deadpan CU ("doesn't care"), punch into "bathroom."
const S4a = (f: number) => dolly([0.9, 1.5, -21.8], [BUTCHER[0], 1.35, BUTCHER[2]], pushK(f, 305, 0.002), { fov: 38 });
const S4b = (f: number) => dolly([0.35, 1.5, -22.6], [0, 1.4, BUTCHER[2] - 0.1], pushK(f, 344, 0.0015, 0.006, 26), { fov: 34, roll: -0.05 });
// shot 5: bedroom rule insert (both beds + the door) -> the sleeper on "hurt", punch through "jolt awake"
const S5a = (f: number) => dolly([BED[0], 1.25, 2.9], [BED[0], 0.9, -1.2], pushK(f, 387, 0.0018), { fov: 42 });
const S5b = (f: number) => dolly([30.1, 1.35, 2.5], [28.8, 0.9, -0.1], pushK(f, 434, 0.0018, 0.006, 28), { fov: 36 });
// shot 6: deep alley perspective (stalls both sides) -> the upside-down flower shop, off-kilter roll
const S6a = (f: number) => dolly([0.6, 1.65, -31], [0, 1.45, -52], pushK(f, 486, 0.0018), { fov: 44 });
const S6b = (f: number) => dolly([-4.3, 1.8, -36.3], [FLOWER[0], 2.3, FLOWER[2]], pushK(f, 554, 0.0015, 0.005, 25), { fov: 40, roll: 0.06 });
// shot 7: full body from boot level (he is 8 feet) -> trench-coat CU ("stitched out of old clock faces", punch) ->
// MS on "if he catches you"
const S7a = (f: number) => dolly([0.1, 0.5, -46.3], [COLL_ALLEY[0], 1.7, COLL_ALLEY[2]], pushK(f, 585, 0.0025), { fov: 42 });
const S7b = (f: number) => dolly([0.55, 1.55, -47.7], [1.1, 1.35, -49.6], pushK(f, 604, 0.002), { fov: 34 });
const S7b2 = (f: number) => dolly([0.5, 1.5, -48.1], [1.05, 1.3, -49.7], pushK(f, 640, 0.002, 0.006, 26), { fov: 33 });
const S7c = (f: number) => dolly([-0.5, 1.65, -47.1], [COLL_ALLEY[0] - 0.1, 1.8, COLL_ALLEY[2]], pushK(f, 661, 0.002), { fov: 36, roll: 0.05 });
// shot 8: overhead-ish of the sleeper (breathing forever creep) -> the beds-row drift ("Seven people", cut) ->
// back to the brother on "my sister", punch on "eight."
const S8a = (f: number) => dolly([27.3, 2.4, -1.9], [28.75, 1.0, 0.0], pushK(f, 698, 0.0015), { fov: 40 });
const S8b = (f: number) => dolly([26.9, 1.75, 1.5], [30.8, 0.8, -0.5], pushK(f, 766, 0.0015), { fov: 42, roll: -0.03 });
const S8c = (f: number) => dolly([29.6, 1.35, 2.3], [28.8, 0.9, -0.05], pushK(f, 824, 0.002, 0.006, 28), { fov: 34, roll: 0.04 });
// shot 9 (going in, alone): down the empty street -> along the water subways ("Pass", cut) -> the clockwork shop ->
// the cage of rusted keys (long 87 f creep) -> sister's face inside, punch on "trapped"
const S9a = (f: number) => dolly([0.8, 1.55, -14], [0, 1.35, -24], pushK(f, 850, 0.0018), { fov: 40 });
const S9b = (f: number) => dolly([-10.5, 1.0, 4], [3, 0.5, 3.5], pushK(f, 884, 0.0018), { fov: 42, roll: -0.03 });
const S9c = (f: number) => dolly([3.4, 1.75, -47.8], [CLOCK[0], 2.1, CLOCK[2]], pushK(f, 916, 0.002), { fov: 40 });
const S9d = (f: number) => dolly([1.15, 1.25, -53.4], [CAGE[0], 1.05, CAGE[2]], pushK(f, 940, 0.0015), { fov: 38 });
const S9e = (f: number) => dolly([1.35, 1.1, -56.1], [CAGE[0], 0.95, CAGE[2]], pushK(f, 1005, 0.002, 0.006, 24), { fov: 34 });
// shot 10: picking the lock CU -> grabbing her wrist (punch) -> behind us on the third tick: the collector ->
// looming CU on "Nobody leaves my market." (punch on "leaves")
const S10a = (f: number) => dolly([1.0, 0.9, -56.3], [1.42, 0.85, -57.7], pushK(f, 1028, 0.002), { fov: 34 });
const S10b = (f: number) => dolly([0.65, 1.0, -55.5], [1.45, 0.95, -57.5], pushK(f, 1044, 0.002, 0.006, 22), { fov: 36 });
const S10c = (f: number) => dolly([0.55, 1.3, -55.9], [COLL_BACK[0], 2.0, COLL_BACK[2]], pushK(f, 1074, 0.002), { fov: 40, roll: 0.04 });
const S10d = (f: number) => dolly([1.35, 1.15, -56.4], [2.75, 3.05, -59.0], pushK(f, 1099, 0.002, 0.006, 26), { fov: 36, roll: -0.05 });
// shot 11 (chase): sticking-feet CU -> the sprint MS with a 4 deg panic roll layered through it ("try to sprint") ->
// "that's him": over the sister's shoulder, the figure far down the alley (punch on "him.")
const S11a = (f: number) => dolly([1.3, 0.38, -50], [-0.5, 0.22, -46], pushK(f, 1143, 0.002), { fov: 36 });
const S11b = (f: number) => dolly([1.9, 1.05, -42.5], [0.3, 0.85, -47.5], pushK(f, 1179, 0.002), { fov: 40 });
const S11c = (f: number) => dolly([-0.6, 1.6, -42.0], [2.4, 2.05, -52], pushK(f, 1252, 0.002, 0.006, 20), { fov: 44 });
// shot 12 (roof dead end): arrival wide -> over the edge into pitch black ("thousand", cut; punch on "black.") ->
// the two-shot at the ledge ("we're trapped", cut) -> closer on the hand hold ("no, we're not")
const S12a = (f: number) => dolly([2.6, 11.2, -33.8], [0, 10.45, -39.5], pushK(f, 1264, 0.0018), { fov: 44 });
const S12b = (f: number) => dolly([0, 10.5, -40.8], [0, 7.6, -47.5], pushK(f, 1314, 0.0015, 0.005, 30), { fov: 46, roll: -0.06 });
const S12c = (f: number) => dolly([-2.4, 11.1, -41.6], [0, 10.6, -38.7], pushK(f, 1410, 0.0018), { fov: 40 });
const S12d = (f: number) => dolly([-1.9, 11.0, -41.0], [0, 10.6, -38.7], pushK(f, 1454, 0.002, 0.006, 20), { fov: 36, roll: 0.05 });
// shot 13: the leap off the ledge -> top-down vertigo ("Falling.", cut) into the JOLT (kick at 1504)
const S13a = (f: number) => dolly([-1.3, 11.3, -41.0], [0, 10.35, -38.2], pushK(f, 1471, 0.002), { fov: 44 });
const S13b = (f: number) => dolly([0.15, 13.8, -36.8], [0, 3.5, -38.2], pushK(f, 1491, 0.004), { fov: 50, roll: 0.08 });
// shot 14: sat up gasping -> the door across the hall bursts open (punch on "burst")
const S14a = (f: number) => dolly([30.0, 1.6, 2.3], [28.8, 1.05, -0.1], pushK(f, 1513, 0.002), { fov: 36 });
const S14b = (f: number) => dolly([30.05, 1.5, 0.2], [30, 1.2, -2.2], pushK(f, 1579, 0.002, 0.006, 20), { fov: 40, roll: -0.04 });
// shot 15: the trick (jumpers off the roofs) -> "you jump off the nearest roof" (cut) -> the empty market from the
// entrance (high wide zoom) -> down the long street to the figure at the end ("except for him.", punch)
const S15a = (f: number) => dolly([2.7, 11.45, -34.8], [0.2, ROOF_Y + 0.75, LEDGE[2] + 3], pushK(f, 1618, 0.0015), { fov: 44 });
const S15b = (f: number) => dolly([-1.6, 11.05, -37.8], [1.2, ROOF_Y + 0.7, LEDGE[2] + 3], pushK(f, 1687, 0.0018), { fov: 42 });
const S15c = (f: number) => zoom([5.2, 6.5, 0.5], [0, 1.2, -26], 44, pushK(f, 1716, 0.0015));
const S15d = (f: number) => dolly([0.5, 1.45, -15.5], [0.8, 1.7, -56], pushK(f, 1792, 0.0015, 0.005, 20), { fov: 38 });
// shot 16: him at the entrance MS -> "looked right at me" CU (punch on "me.") -> whisper CU -> side track as he
// walks to the entrance ledge -> the step off into the dark (4.5 deg roll layered)
const S16a = (f: number) => dolly([-2.5, 1.55, -4.6], [COLL_ENTR[0], 2.05, COLL_ENTR[2]], pushK(f, 1814, 0.002), { fov: 40 });
const S16b = (f: number) => dolly([-1.05, 2.7, -6.9], [0, 3.2, -9.3], pushK(f, 1854, 0.0015, 0.006, 24), { fov: 34, roll: 0.04 });
const S16c = (f: number) => dolly([-0.85, 2.75, -7.3], [0, 3.25, -9.4], pushK(f, 1876, 0.002), { fov: 32 });
const S16d = (f: number) => dolly([0.9, 1.7, -11.8], [0, 2.0, -6.5], pushK(f, 1917, 0.0018), { fov: 42 });
const S16e = (f: number) => dolly([-2.5, 1.15, -2.9], [LEDGE_M[0], 0.9, LEDGE_M[2]], pushK(f, 1941, 0.002), { fov: 40 });
// shot 17: bolt upright (JOLT 2, kick at 1958) -> tilt down to the foot of the bed -> the pocket watch CU,
// punch peaks on "pocket watch" (2023-2029)
const S17a = (f: number) => dolly([30.0, 1.5, 2.0], [28.8, 1.1, -0.1], pushK(f, 1958, 0.002), { fov: 36 });
const S17b = (f: number) => dolly([29.8, 1.2, 1.6], [28.85, 0.5, 0.45], pushK(f, 1976, 0.0018), { fov: 34 });
const S17c = (f: number) => dolly([29.65, 0.68, 1.6], [WATCH[0], WATCH[1], WATCH[2]], pushK(f, 1996, 0.002, 0.006, 34), { fov: 30 });

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: S1a },
    { f: 30, dur: 31, s: S1b }, // centred on 46 ("unlocked")
    { f: 61, cut: true, s: S1c }, // cut on "wake" (63); punch into the flash at 88
  ],
  2: [
    { f: 89, s: S2a }, // under the flash: aerial of the whole market
    { f: 117, cut: true, s: S2b }, // cut 3 f before "socks" (120)
    { f: 134, dur: 20, s: S2c }, // centred on 144 ("architecture")
    { f: 171, cut: true, s: S2d }, // cut on "Street lights" (172); punch on "trees." (193-200)
  ],
  3: [
    { f: 208, s: S3a },
    { f: 245, cut: true, s: S3b }, // cut 3 f before "feet" (248): he hangs ten feet up
    { f: 285, dur: 16, s: S3c }, // centred on 293 ("look down")
  ],
  4: [
    { f: 305, s: S4a },
    { f: 344, cut: true, s: S4b }, // cut on "in his" (344): punch covers "bathroom." (347) and "doesn't care" (362)
  ],
  5: [
    { f: 387, s: S5a },
    { f: 434, cut: true, s: S5b }, // cut 2 f before "hurt" (436); punch through "jolt awake" (457-464)
  ],
  6: [
    { f: 486, s: S6a },
    { f: 554, cut: true, s: S6b }, // cut 2 f before "upside" (556)
  ],
  7: [
    { f: 585, s: S7a }, // cut: full body from boot level
    { f: 604, cut: true, s: S7b }, // cut on "wearing" (604)
    { f: 640, dur: 15, s: S7b2 }, // centred on 647 ("clock faces"); punch peaks there
    { f: 661, cut: true, s: S7c }, // cut on "If" (661)
  ],
  8: [
    { f: 698, s: S8a },
    { f: 766, cut: true, s: S8b }, // cut on "Seven" (768)
    { f: 824, cut: true, s: S8c }, // cut on "my sister" (826); punch on "eight." (843-848)
  ],
  9: [
    { f: 850, s: S9a },
    { f: 884, cut: true, s: S9b }, // cut on "Pass" (886): the water subways
    { f: 916, cut: true, s: S9c }, // cut on "Pass the clockwork shop"
    { f: 940, cut: true, s: S9d }, // cut on "All the way to a cage" (940): long 87 f creep
    { f: 1005, dur: 16, s: S9e }, // centred on 1013 ("trapped inside")
  ],
  10: [
    { f: 1028, s: S10a },
    { f: 1044, cut: true, s: S10b }, // cut on "grabbed" (1046); punch on "wrist" (1054)
    { f: 1074, cut: true, s: S10c }, // cut on the third tick (1074): he is behind us
    { f: 1099, cut: true, s: S10d }, // cut 2 f before "Nobody" (1101); punch on "leaves" (1105)
  ],
  11: [
    { f: 1143, s: S11a },
    { f: 1179, cut: true, s: S11b }, // cut on "try" (1173 side); the sprint MS
    { f: 1179, dur: 22, s: rolled(S11b, 0.07) }, // 4 deg panic roll layered through "sprint" (1181-1186)
    { f: 1252, cut: true, s: S11c }, // cut 2 f before "him." (1254)
  ],
  12: [
    { f: 1264, s: S12a },
    { f: 1314, cut: true, s: S12b }, // cut on "thousand" (1316); punch on "black." (1364-1371)
    { f: 1410, cut: true, s: S12c }, // cut 2 f before "we're" (1412)
    { f: 1454, dur: 14, s: S12d }, // centred on 1461 ("we're not.")
  ],
  13: [
    { f: 1471, s: S13a },
    { f: 1491, cut: true, s: S13b }, // cut on "Falling." (1493); JOLT kick at 1504
  ],
  14: [
    { f: 1513, s: S14a },
    { f: 1579, cut: true, s: S14b }, // cut 2 f before "burst" (1581); door-burst kick at 1545
  ],
  15: [
    { f: 1618, s: S15a },
    { f: 1687, cut: true, s: S15b }, // cut 2 f before "you jump" (1689)
    { f: 1716, cut: true, s: S15c }, // cut 2 f before "The market is completely empty" (1718)
    { f: 1792, cut: true, s: S15d }, // cut 2 f before "And except for him." (1794); punch on "him." (1805)
  ],
  16: [
    { f: 1814, s: S16a },
    { f: 1854, cut: true, s: S16b }, // cut 2 f before "Looked" (1856); punch on "me." (1869-1873)
    { f: 1876, dur: 12, s: S16c }, // centred on 1882 ("whispered.")
    { f: 1917, cut: true, s: S16d }, // cut 2 f before "walking" (1919)
    { f: 1941, cut: true, s: S16e }, // cut on "stepping" (1943)
    { f: 1941, dur: 12, s: rolled(S16e, -0.06) }, // 3.4 deg roll as he steps off
  ],
  17: [
    { f: 1958, s: S17a }, // JOLT 2 (kick at 1958)
    { f: 1976, dur: 20, s: S17b }, // centred on 1986 ("sitting")
    { f: 1996, dur: 30, s: S17c }, // punch peaks on "pocket watch" (2023-2029)
  ],
};

// impact kicks (reference v14): the image offset flips sign every frame (~3 px at 720p per unit), decays to 0 in
// 7 f, roll +-0.23 deg per unit; they start on the first frame at/after the event. Contract events: JOLT 1504,
// door burst 1545, tick hits 1050/1062/1074, JOLT 2 at 1958. The hook flash (88) is the DOM overlay, not a kick.
const KICKS: [number, number][] = [
  [1504 / FPS, 1.0], [1545 / FPS, 0.7], [1050 / FPS, 0.6], [1062 / FPS, 0.6], [1074 / FPS, 0.8], [1958 / FPS, 1.0],
];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a; // metres at the look distance for 3 px x a
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** frame at which the current key's move has finished (for picking billboard views per key, not per frame) */
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field + foreground framing ----------------
/** Lens blur per shot (thin lens). cInf = blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp.
 *  Contract table: hook/inserts 15-16, close-ups 12-14, MS 10-12, wides/aerials 0. Focus is the acting eyes (the
 *  layout pins above), falling back to the camera look point. Entries switch on cuts (no dur) or ramp with the
 *  camera glide they share f/dur with. */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 15, focus: () => WINDOW }, // hook: window insert
  { f: 30, dur: 31, cInf: 15, focus: () => WINDOW },
  { f: 61, cInf: 14, focus: () => [BED_B[0], 0.75, 0] }, // the sleeper
  { f: 89, cInf: 0 }, // market aerial (establishing, under the flash)
  { f: 117, cInf: 11, focus: () => [0, 1.05, -18] }, // crowd MS in socks
  { f: 134, dur: 20, cInf: 11, focus: () => [0.5, 1.6, -20] },
  { f: 171, cInf: 15, focus: () => [-4.6, 4.4, -18] }, // lamp-tree insert
  { f: 208, cInf: 0 }, // canal wide
  { f: 245, cInf: 11, focus: () => [LEVIT[0], 3.15, LEVIT[2]] }, // levitating man MS
  { f: 285, dur: 16, cInf: 12, focus: () => [LEVIT[0], 3.0, -0.5] },
  { f: 305, cInf: 11, focus: () => [BUTCHER[0], 1.35, BUTCHER[2]] }, // butcher MS
  { f: 344, cInf: 13, focus: () => [0, 1.4, BUTCHER[2] - 0.1] }, // deadpan CU
  { f: 387, cInf: 12, focus: () => [BED[0], 0.9, -1.2] }, // rule insert
  { f: 434, cInf: 12, focus: () => [28.8, 0.9, -0.1] },
  { f: 486, cInf: 0 }, // alley deep wide
  { f: 554, cInf: 10, focus: () => [FLOWER[0], 2.3, FLOWER[2]] },
  { f: 585, cInf: 12, focus: () => [1.05, 2.0, -51] }, // the collector's eyes (8 ft)
  { f: 604, cInf: 14, focus: () => [1.1, 1.35, -49.6] }, // coat clock faces
  { f: 640, dur: 15, cInf: 14, focus: () => [1.05, 1.3, -49.7] },
  { f: 661, cInf: 11, focus: () => [COLL_ALLEY[0] - 0.1, 1.8, COLL_ALLEY[2]] },
  { f: 698, cInf: 12, focus: () => [28.75, 1.0, 0] },
  { f: 766, cInf: 12, focus: () => [30, 0.8, -0.4] },
  { f: 824, cInf: 13, focus: () => [28.8, 0.9, -0.05] },
  { f: 850, cInf: 0 }, // going in (wides)
  { f: 884, cInf: 0 },
  { f: 916, cInf: 10, focus: () => [CLOCK[0], 2.1, CLOCK[2]] },
  { f: 940, cInf: 12, focus: () => [CAGE[0], 1.05, CAGE[2]] },
  { f: 1005, dur: 16, cInf: 14, focus: () => [CAGE[0], 0.95, CAGE[2]] },
  { f: 1028, cInf: 14, focus: () => [1.42, 0.85, -57.7] }, // picking the lock
  { f: 1044, cInf: 13, focus: () => [1.45, 0.95, -57.5] },
  { f: 1074, cInf: 12, focus: () => [COLL_BACK[0], 2.0, COLL_BACK[2]] },
  { f: 1099, cInf: 14, focus: () => [2.75, 3.05, -59] },
  { f: 1143, cInf: 14, focus: () => [-0.5, 0.22, -46] }, // the sticking feet
  { f: 1179, dur: 22, cInf: 11, focus: () => [0.35, 0.85, -47.5] },
  { f: 1252, cInf: 0 }, // "that's him": wide POV down the alley
  { f: 1264, cInf: 0 }, // roof wides / drop POV: kept readable
  { f: 1410, cInf: 10, focus: () => [0, 10.6, -38.7] },
  { f: 1454, dur: 14, cInf: 12, focus: () => [0, 10.6, -38.7] },
  { f: 1471, cInf: 0 }, // the jump, falling
  { f: 1513, cInf: 12, focus: () => [28.8, 1.05, -0.1] }, // sat up gasping
  { f: 1579, cInf: 12, focus: () => [30, 1.2, -2.2] },
  { f: 1618, cInf: 0 }, // the trick (roof wides)
  { f: 1716, cInf: 0 }, // the empty market
  { f: 1814, cInf: 10, focus: () => [COLL_ENTR[0], 2.05, COLL_ENTR[2]] },
  { f: 1854, cInf: 13, focus: () => [0, 3.2, -9.3] },
  { f: 1876, dur: 12, cInf: 14, focus: () => [0, 3.25, -9.4] },
  { f: 1917, cInf: 0 }, // the walk to the ledge
  { f: 1958, cInf: 12, focus: () => [BED_B[0], 1.12, -0.1] },
  { f: 1976, dur: 20, cInf: 14, focus: () => WATCH },
  { f: 1996, dur: 30, cInf: 16, focus: () => WATCH }, // final insert: softest
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
/** what the lens focuses on (DOF): the DOF table's focus point, else the camera look point */
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

/** near framing objects: visible while a <= f < b; kit = a GLB name accepted by build.ts prop() (names verified
 *  against world.ts KENNEY list: cart, canoe, stall-bench, flower_redA, lantern, plant_bushDetailed).
 *  pos = base point (prop()'s x, y, z: the model's base sits on y), s = height in metres (prop()'s h), yaw in radians.
 *  They sit at 0.3-0.5 x the focus distance and cover 10-25 % of one frame edge, never a face; they are meant to be
 *  in front of the lens, so build them outside prop()'s sight-line test. Ranges stay inside one shot and clear of
 *  its crossfade edges (world.ts shows an entry only inside its own shot, so crossfade layers never see it). */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  // S2b crowd MS (focus ~8 m): a cart in the bottom-right corner, ~3 m from the lens
  { a: 117, b: 171, kit: "cart", pos: [3.6, 0, -12.0], s: 0.9, yaw: -0.5 },
  // S3b levitating man (focus ~4.5 m): a moored canoe in the bottom-left, low in frame over the water
  { a: 245, b: 304, kit: "canoe", pos: [-4.6, 0, -1.4], s: 1.0, yaw: 0.3 },
  // S4a/b butcher MS (focus ~3 m): a stall-bench in the bottom-left, ~2.7 m
  { a: 310, b: 386, kit: "stall-bench", pos: [-2.3, 0, -20.1], s: 0.8, yaw: 0.5 },
  // S6b flower shop (focus ~4.7 m): a planter bush in the bottom-right, below the hanging sign
  { a: 556, b: 584, kit: "flower_redA", pos: [-5.1, 0, -37.4], s: 0.7, yaw: 0.2 },
  // S9d/e cage (focus ~5 m): an abandoned cart in the bottom-left, ~2.5 m
  { a: 942, b: 1027, kit: "cart", pos: [-0.7, 0, -55.7], s: 0.8, yaw: 0.7 },
  // S16a/b collector at the entrance (focus ~5-6 m): a lantern post in the bottom-left, ~2.2-3.4 m
  { a: 1820, b: 1875, kit: "lantern", pos: [-1.6, 0, -7.9], s: 1.1, yaw: -0.3 },
];
