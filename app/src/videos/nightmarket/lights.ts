// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Field names follow lighting.md 9.1 exactly (the CHAR and POST agents read them); values are tuned on renders.
type C3 = [number, number, number];
/** every light name the whole pipeline switches on (story SHOTS[].light, GRADES, LOOK) */
export type LightName = "day" | "golden" | "night";
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
};
export const LIGHTS: Record<LightName, LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  // NIGHT (the whole short): moon key, practicals do the colour work. Kept in the day/golden conventions so
  // shade.ts / cast.ts / grade.ts can switch presets without touching their code.
  //   az -30 el 55: a high camera-relative moon -> short crisp shadows off to screen-left, streets lit down their length
  //   lit ~0.72-0.8 of day's: night reads dark but still two-tone readable after the NEUTRAL tone map
  night: {
    az: -30, el: 55,
    lit: [0.78, 0.86, 1.18], shade: [0.1, 0.11, 0.24], lift: [0.02, 0.03, 0.09], lambert: 0.35, sideK: 0.86, term: 0.14,
    charTint: [0.88, 0.93, 1.1], charShade: 0.9, charGrad: 0.09, bodyGrad: 0.24, sideTint: [0.8, 0.82, 1.0],
    blob: [0.3, 0.3, 0.5], actorShadow: true, // moon casts real card shadows (low practical fill makes them read)
    top: "#101733", hor: "#2a2f55", skyCurve: [0.0, 0.5, 0.6], fog: "#0e0e22", fogNear: 18, fogFar: 220, sunDisc: "#c3d2ff",
    sunCol: "#bcd2ff", sunI: 2.2, sky: "#1a2340", ground: "#2a2438", hemiI: 0.4, // ground colour warm: hemi fakes lantern bounce
    bias: -0.0004, normalBias: 0.02,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<LightName, WorldLook> = {
  day: {
    // depth.md 2.2: horizon #9fb6e6 just above the skyline, upper sky #5e93d9 at ~20 deg (grade: frame top #5997e2)
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
  night: {
    // moonlit indigo: c0 is a WARM band right at street level (lantern glow bleeds into the horizon haze, ~0-2 deg),
    // then dim indigo, dark blue-violet top. Fog is #0e0e22 (fogFar 220), so distant roofs melt into it.
    sky: { c: ["#4a3a2e", "#2c2c4a", "#1d2242", "#141834", "#0c1028"], e: [0, 2, 8, 18, 40] },
    // canal at night: near-black indigo, crest = moon sheen, glint = warm lantern reflections on the water subway
    water: { near: "#141a30", mid: "#10162a", far: "#0c1124", crest: "#3a4668", trough: "#080c1a", glint: "#e8b46a", shade: [0.35, 0.38, 0.6] },
    cloud: { lit: "#2e3352", mid: "#20244a", shade: "#12142c" }, // barely-there clouds, edges picked out by the moon
    bounce: [0.12, 0.06, 0.0], // warm practical bounce on shaded faces turned to the lens (L04 lamp trees, strings)
    sat: 1.05,
  },
};
