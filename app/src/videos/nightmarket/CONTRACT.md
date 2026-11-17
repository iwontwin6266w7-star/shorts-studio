# NightMarket short — build contract (all agents read this first)

Video: "The Night Market" — 68 s dream-market horror story. 1080x1920 @ 30 fps, TOTAL = 2040 frames.
Voice is ALREADY recorded (`public/voice.wav`); everything is timed to `timings.ts` (word frames from faster-whisper).
Visual reactions land 0-3 frames BEFORE their word. NO captions/labels anywhere. English only. One steady tone already in the VO.
Look: bridge-template look values, but NIGHT (new light preset). Never copy reference content; everything here is our own story.

## Script beat map (word frames from timings.ts; T() = frame)
- L01 f0-86   hook: unlocked window -> wake at the night market        [FLASH_AT = 88, white 4f flash]
- L02 f89-128 everyone in town, in their socks
- L03 f134-168 architecture makes no sense
- L04 f172-200 street lights grow like trees
- L05 f208-301 subway runs on water; levitate ten feet if you don't look down
- L06 f305-355 butcher shows up in his bathroom nightly
- L07 f360-383 he doesn't care anymore (deadpan)
- L08 f387-422 one rule everyone knows
- L09 f428-482 hurt at the market -> jolt awake in your bed
- L10 f486-505 the collector
- L11 f510-545 lives at the back of the alley
- L12 f548-581 past the upside-down flower shop
- L13 f585-655 eight feet tall, trench coat of old clock faces
- L14 f661-696 if he catches you, you don't wake up
- L15 f698-740 you just lie in bed, breathing
- L16 f747-759 asleep forever
- L17 f768-807 seven people never woke up
- L18 f807-848 my sister was the eight
- L19 f850-883 that night I went in looking for her
- L20 f886-910 past the water subways
- L21 f916-937 past the clockwork shop
- L22 f940-1022 cage of rusted keys, sister trapped inside
- L23 f1028-1097 picked the lock, grabbed her wrist; behind us: tick, tick, tick
- L24 f1101-1125 "Nobody leaves my market." (the collector speaks)
- L25 f1129-1137 we ran
- L26 f1143-1234 nightmare feet stick like wet concrete
- L27 f1240-1249 that's real
- L28 f1254-1262 that's him
- L29 f1265-1371 roof dead end, thousand-foot drop into pitch black
- L30 f1375-1468 she: "we're trapped"; I hold her hand: "no, we're not"
- L31 f1471-1489 we jumped
- L32 f1493-1501 falling
- L33 f1504-1510 JOLT
- L34 f1513-1541 I sat up gasping (bedroom)
- L35 f1545-1616 across the hall sister's door bursts open
- L36 f1616-1654 now everyone knows the trick
- L37 f1657-1715 see the collector -> jump off the nearest roof
- L38 f1718-1765 market completely empty now, except for me
- L39 f1768-1790 because I go back to check
- L40 f1794-1810 and except for him
- L41 f1814-1850 last night he stood at the market entrance
- L42 f1856-1873 looked right at me
- L43 f1876-1888 and whispered
- L44 f1889-1955 "I watched all of you jump" -> walks to the ledge -> steps off
- L45 f1958-1963 JOLT
- L46 f1966-1976 I woke up
- L47 f1978-2036 a pocket watch sits at the foot of my bed

## Shot list (17 shots; a/b frames; XFADE at place changes; FLASH after hook)
S1  f0-88     bedroom night, window; crossfade into market at ~70   light: night, scene: bedroom
S2  f89-207   market aerial -> crowd in socks MS; lamp-trees        light: night, scene: market
S3  f208-304  water subway: canal with glowing rails; a man levitating   night, market
S4  f305-386  butcher deadpan MS (apron, nightgown under it)        night, market
S5  f387-485  rule: bedroom insert, sleeper jolts                   night, bedroom
S6  f486-584  alley: upside-down flower shop, deep perspective      night, alley
S7  f585-697  collector reveal: full body, clock-face coat CU       night, alley
S8  f698-849  bedroom: sleeper breathing forever; seven empty beds motif -> sister the eight   night, bedroom
S9  f850-1027 going in: canal, clockwork shop, cage of rusted keys with sister   night, alley
S10 f1028-1142 lockpick, grab wrist, collector behind: tick tick tick; "nobody leaves"   night, alley
S11 f1143-1263 chase: feet stick to pavement; "that's him"   night, alley
S12 f1264-1470 roof dead end, thousand-foot drop to black; hand hold   night, roof
S13 f1471-1512 jump -> falling -> JOLT (white snap)          night, roof
S14 f1513-1617 brother sits up gasping; sister's door bursts open   night, bedroom
S15 f1618-1813 trick (jump off roofs); empty market, brother alone; collector at far end   night, market
S16 f1814-1957 collector at entrance, whisper, steps off the ledge   night, market
S17 f1958-2040 jolt; pocket watch on the bed                 night, bedroom

## World layout pins (world/build coordinates, metres, ground y=0)
- MARKET STREET: x in [-4.5, 4.5], z from -8 (entrance) to -66 (back alley). Flagstone ground.
- STALLS: two rows at x = +-3.2, z = -12 .. -55 (pitch ~4 m), warm fabric canopies, emissive lantern strings across the street every ~8 m (bloom feeds off these; luminance > 1.0).
- LAMP TREES (L04): 3-4 street lamps modelled as trees (iron trunk + branch forks + glowing globes), z ~ -18, -30, -44 alternating sides.
- HOUSES: reuse bridge house builder, flanking at x = +-8; night albedos (muted, dark, warm windows: emissive window quads).
- FLOWER SHOP (L12): at [-8, 0, -40], upside-down (roof at street level, base up) with hanging sign; unlit sign face.
- CLOCKWORK SHOP (L21): at [8, 0, -52], gear motifs painted.
- COLLECTOR ALLEY: deep perspective to z=-66; CAGE OF KEYS at [1.5, 0, -58] (barrel of rusted key silhouettes, sister inside).
- CANAL (water subway): reuse the bridge river (keep its position/geometry); add glowing rail pairs floating ~0.3 m above water + a moored "train" of lantern boats near z=+10.
- ROOF (S12-13): rooftop plane at y = 9.8 over the market houses around x=0, z=-38; beyond the roof edge: fog to pure black below (no ground visible).
- BEDROOM (interior, used 5x): simple interior zone at BED = [30, 0, 0]: floor + two walls, window (night-blue glow), two beds side by side 2.5 m apart (brother at BED+[-1.25,0,0], sister at BED+[1.25,0,0]), door across the hall at BED+[0,0,-2.2]. Keep it simple painted planes; characters are billboards on top.

## Cast (cast.ts roles; toon.ts bean heads, plum ink, NOINK layer)
- brother: 3.5 HH, pajamas (muted stripe), the POV twin; walk/run cycles exist (walk bob 5%, planted stride).
- sister: 3.2 HH (younger), nightgown, hair tuft.
- collector: 8 feet tall (~2.3x adult HH), trench coat stitched from clock faces (paint: coat card + drawn clock faces, hands = ink dots), long fingers, hat brim; glides, never bobs.
- butcher: apron over nightgown, deadpan face, carries a cleaver (prop).
- crowd: townsfolk in pajamas + socks (no shoes!) — market wander mode; empty mode for S15-16.

## File ownership (nightmarket = copy of bridge template; same export contracts as bridge)
- story.ts + timings.ts + NightMarket.tsx: shots/cams/dof/kicks/foreground; entry component; FLASH_AT=88; kickAt events (jolts at f1504, f1958; door burst f1545; tick hits f1050/1062/1074).
- lights.ts: add "night" preset + LOOK.night (dark blue-violet sky, warm fog glow near lanterns, fog to deep indigo; sun = moon: az ~-30 el ~55, cool key; lantern emissives warm).
- world.ts + build.ts: night dressing per the layout pins; sight-line culling kept; Kenney recolour by material name; emissive lantern quads luminance >= 1.4 for bloom.
- toon.ts + cast.ts + cardshade.ts: new cast roles above; crowd modes "market" (wander), "empty"; collector glide; bedroom billboards (beds as painted cards).
- grade.ts: add GRADES.night (cool shadows, warm practical highlights) + gradeFor accepts "night".
- Types: Light = "day" | "golden" | "night" everywhere; SHOTS[].light drives everything.
- Bridge.tsx logic is copied to NightMarket.tsx (rename component NightMarketShort, BRIDGE_FRAMES -> NM_FRAMES); keep composer order ink -> lens pre -> main -> bloom -> NEUTRAL -> grade; MSAA 4; keep the dpr override + post toggles for stills.

## Hard rules from the skill (all agents)
- Every pixel-sized parameter scales with output height / 1920.
- No static hold >= 4 frames: every hold creeps 0.15-0.35%/f.
- Props closer than ~2 m to lens = huge blobs; check foreground props per camera.
- Characters/props: recognisable or gone at frame edges.
- No captions/labels/signs with readable words in frame (unlit sign faces, symbols only).
- tsc must pass: `cd ~/shorts-studio/app && npx tsc --noEmit` (filter to src/videos/nightmarket).
