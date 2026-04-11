# Graphics Research: Destiny × Halo 4 × No Man's Sky

Research notes for Glasswake's target aesthetic. Sources: Bungie SIGGRAPH 2013, GDC 2017/2018 shader pipeline talks, Digital Foundry tech analyses, 343 Industries Polycount article, Hello Games GDC 2017.

---

## Destiny / Destiny 2 — What Makes It Look Like *That*

### Rendering Architecture

- **Deferred rendering** with a G-buffer pass. Geometry fills albedo, normals, roughness, metalness into screen-space buffers. A fullscreen shading pass then lights every pixel. This lets Destiny have dozens of dynamic lights in a scene without per-light geometry cost.
- **Physically Based Rendering (PBR)** with an energy-conserving BRDF (Cook-Torrance specular, Lambertian diffuse). Materials are defined by albedo, metalness, roughness — not ad-hoc diffuse/specular colors. This is why everything in Destiny "sits together" — the lighting model is consistent across every surface.
- **Image-Based Lighting (IBL)** — environment cubemaps (PMREM-filtered) provide ambient specular and diffuse. Every surface picks up sky color, bounce light from nearby geometry. This is a huge part of the "grounded" look — objects feel like they belong in the scene because they reflect it.

### What Sells the "Destiny Look"

1. **Warm highlights / cool shadows** — Destiny consistently uses warm direct light (golden sun, amber fire) against cool ambient fill (blue-purple shadows). This warm/cool contrast reads as cinematic and filmic.

2. **Atmospheric depth** — pronounced volumetrics (fog, mist, light shafts). Distant objects desaturate and shift toward the fog color. Bungie uses this for gameplay (obscuring enemies in mist) and beauty (every vista has layered depth planes: foreground warm → midground neutral → background cool/hazy).

3. **God rays / volumetric light** — light shafts appear from sun, fire, and interior light sources. Not just screen-space — they have genuine volume. Objects intersect volumetric light, producing crepuscular rays through geometry gaps.

4. **Depth of field** — always-on subtle DOF during gameplay (cinematic DOF with bokeh on highest settings). Even the gameplay DOF softens the far distance and extreme foreground slightly, adding a photographic quality.

5. **Bloom + lens effects** — warm bloom on specular highlights and bright surfaces. Subtle anamorphic lens flare near bright light sources. These "imperfections" make the image feel captured through a real lens.

6. **GPU particles (120k+)** — Destiny 2 moved from ~3k CPU particles to ~120k GPU particles. Sparks from gunfire, embers, rain, dust motes, pollen — these fill the air and make environments feel alive. The particle budget is so high they deliberately hold back artistically.

7. **Shadow cascades** — multiple cascaded shadow maps with variable softness. Close shadows are sharp; distant shadows soften. The cascade distances and sampling quality scale with settings.

8. **SSAO** — screen-space ambient occlusion darkens crevices, contact edges. Adds weight and grounding to everything.

9. **Color grading per destination** — each area has a distinct color palette. Earth EDZ is green/warm; Titan is teal/cold; Io is sulfuric yellow. Bungie uses the "screenshot test": can you distinguish each location from a thumbnail? Post-process color LUTs shift the entire mood per zone.

10. **Art direction over realism** — Bungie calls their approach "physically *inspired*" not "physically *based*." They start with PBR for correctness, then art-direct the final frame. Rim lights, fill lights, ambient tweaks — all placed for readability and beauty, not physical accuracy.

### Camera Feel (The "Destiny Smoothness")

From David Helsby's GDC 2015 talk "The Art of First Person Animation for Destiny":

- **Boxing-inspired camera motion** — every movement leads with the head, then over-corrects for balance. Not a GoPro strapped to a runner — deliberate, weighted, anticipatory motion.
- **Lowered aim point** — the crosshair sits below screen center, opening up peripheral vision at the top and sides. The world feels more expansive.
- **Wider weapon FOV** — the weapon model renders at a wider FOV than the world, giving more room for arm/weapon animations to flash through peripheral vision.
- **Camera bob is minimal but weighted** — the camera doesn't bounce with every step. Instead, there's a slow, heavy sway that communicates momentum without causing nausea. Bungie found that even 10% of players getting motion sick was unacceptable.
- **State transitions are smooth** — sprint starts with a lean, landing has a controlled dip and recover. Every transition has easing, not instant snaps.
- **No mouse acceleration in the final game** — raw 1:1 input (acceleration was a bug they let users disable). The "smoothness" comes from animation/camera, not from filtering the input.

### Tone Mapping & Exposure

- **ACES Filmic** or similar filmic curve — compresses highlights gently, rolls off blacks.
- **Per-scene exposure control** — interiors are darker with the camera "adapting." Walking from a bright exterior into a dark cave, the exposure adjusts over ~0.5s. This eye-adaptation effect is huge for immersion.
- **HDR output** on supported displays, with careful tone mapping for SDR.

---

## Halo 4 — What 343 Industries Did

### Lighting

- **Static lightmaps with global illumination** — the majority of Halo 4's lighting is baked. This allowed full GI (bounce light, color bleeding, soft shadows) at zero runtime cost.
- **GPU lightmapper** — 343 built a fast GPU-based lightmapper. Pros: fast iteration. Cons: driver bugs, inconsistent across GPU vendors.
- **Specular from spherical harmonics** — baked SH probes provide directional specular on surfaces, bringing out modeling detail. This is cheap and adds enormous depth.
- **Dynamic lights layered on top** — key lights, weapon flashes, explosions are all dynamic, composited over the baked base. The combination of baked GI + dynamic key lights is why Halo 4 looks so rich.
- **Image-based lighting** — IBL used to ground objects in their environment, especially for reflective surfaces.

### Art Direction

- **Color palette shifts per level** — UNSC interiors start cold (blue/grey "space submarine"), warming as damage increases. Forerunner areas use ambiguous, epic-scale geometry with emissive orange/blue accents.
- **"Functional aesthetic"** — every visual element communicates something. Lighting guides the player. Color temperature tells the story (cold = danger, warm = safety/goal).
- **High-poly modeling workflow** — artists sculpt/model high-poly, then bake to game-res. Surface detail reads at any distance.
- **Final color grading pass** — art director has control over a color grading LUT applied to the final frame. This unifies everything into a cohesive look.

### Effects

- **Volumetric god rays** — not fake geometry like Halo 3. Full-screen light shafts that cast regardless of sun position, with objects properly occluding them.
- **Heavy bloom** — more pronounced than predecessors. Gives an almost cinematic, slightly overexposed look to bright areas.
- **Accomplished atmospheric rendering** — distance haze communicates scale in large environments.
- **FXAA** — post-process anti-aliasing (fast, low cost).
- **Particle effects** — heavily used for weapon impacts, environmental dust, disintegration effects.

---

## No Man's Sky — Voxel Terrain Approach

### How It Works

- **Voxel-based terrain** — planets are defined as 3D density fields, not 2D heightmaps. Each region is a 32×32×32 meter volume filled with density values from layered noise functions.
- **Seed → noise → density → mesh** — a system seed drives deterministic noise. The noise fills the density field. The density field is converted to polygonal mesh for rendering.
- **Surface extraction: Dual Contouring** (original), replaced by **Dual Marching Cubes** in 2024 Worlds update. DMC reduces vertex count, improves generation speed, saves memory.
- **Not Minecraft blocks** — the voxels are converted to smooth, continuous surfaces. You see polygons on screen, not cubes. The voxel data is invisible to the player.
- **Terrain deformation** — because it's a density field, players can dig/add terrain by modifying voxel values and regenerating the local mesh.
- **LOD** — distant terrain uses coarser voxel resolution (larger voxels) → fewer polygons. Close terrain uses fine voxels → detailed mesh. Transition between LODs uses stitching (overlapping polygonization at lower isolevel).
- **Flora/fauna are polygon-based** — only terrain uses voxels. Trees, creatures, buildings are standard polygon meshes placed on the voxel surface.

### What It Gives You

1. **Caves, overhangs, arches** — impossible with a 2D heightmap. Voxel terrain is true 3D: tunnels through mountains, natural bridges, cliff faces with geometry underneath.
2. **Terrain editing** — dig, flatten, raise terrain at runtime. The density field is the source of truth; mesh regenerates on demand.
3. **Infinite variety** — noise-driven density fields can produce an enormous range of terrain shapes from a single algorithm.
4. **Seamless LOD** — voxel LOD is natural: sample the density field at lower resolution for distant chunks.

### What It Costs

1. **Memory** — 3D density fields are much larger than 2D heightmaps. A 256×256×256 chunk is 16M voxels vs a 256×256 heightmap at 65k values.
2. **Generation speed** — mesh extraction (marching cubes/dual contouring) is more expensive than just uploading a heightmap. Needs chunking, streaming, background threads.
3. **Pop-in** — LOD transitions and chunk generation cause visible pop-in when moving fast (especially flying). NMS struggles with this.
4. **Texture quality** — triplanar projection replaces UV mapping for voxel surfaces. Works well but can look blurry compared to hand-UV'd assets.
5. **No baked lighting** — terrain changes at runtime, so lightmaps don't work. All lighting must be dynamic or probe-based.

### Applicability to Glasswake (Three.js)

Three.js has a built-in `MarchingCubes` addon but it's designed for metaballs, not terrain. For actual voxel terrain in Three.js:

- **Chunked approach**: divide world into chunks (e.g., 32³ or 64³). Each chunk has a density array filled by noise. Run marching cubes per chunk to produce a `BufferGeometry`. Add to scene as a `Mesh`.
- **Performance concern**: marching cubes on the main thread will block. Needs Web Workers for background mesh generation.
- **LOD**: sample density at different resolutions per chunk. Near camera = fine. Far = coarse.
- **This is a major architectural change** from the current heightmap `Terrain.ts`. The current terrain is a single 350-segment plane displaced by noise. Moving to voxels means replacing this entirely with a chunked 3D system.

---

## Synthesis: What Glasswake Should Take From Each

### From Destiny (the primary target)

These are the techniques that actually define the "Destiny look" and are feasible in Three.js:

| Technique | Current State | Gap |
|-----------|--------------|-----|
| PBR materials | Three.js `MeshStandardMaterial` is PBR. IBL via PMREM exists. | Terrain + vegetation use custom ShaderMaterial, bypassing PBR. Could add PBR properties. |
| Warm/cool color split | **Done** — cool blue-violet shadows, warm golden highlights, ToD-driven | — |
| Atmospheric perspective | **Done** — depth-buffer desaturation + blue shift, ToD horizon color | — |
| God rays | Custom GodRaysEffect exists | Already decent; could improve with occlusion |
| Depth of field | Not implemented | Add via `postprocessing` library's DOF |
| Bloom | Exists, well-tuned | Good |
| GPU particles (ambient) | Not implemented | Add pollen/dust/snow/fireflies per biome |
| Shadow cascades | Single 2048 shadow map | Could add CSM via Three.js addon |
| SSAO | Exists | Good |
| Color grading per biome | BiomePaletteEffect exists | Push further with per-biome LUT-style grading |
| Eye adaptation | Not implemented | Add luminance feedback for auto-exposure |
| Camera feel | **Done** — boxing-style rig with lowered aim, momentum lean, weighted bob | — |
| Film grain | Exists | Good |
| Chromatic aberration | Exists | Good |
| Vignette | Exists | Good |

### From Halo 4

- **Baked GI concept** — not directly applicable (procedural world), but we can fake it with stronger ambient probes and SH-based fill lighting.
- **Color palette per zone** — already partially done with BiomePaletteEffect. Push harder on distinct biome identities.
- **Volumetric god rays** — already have these. Halo 4's were more aggressive; could increase intensity.
- **Final color grading pass** — add a more sophisticated LUT or filmic grade as the last post-process step.

### From No Man's Sky (voxel terrain freedom, NOT voxel visual style)

**Key decision: we want Destiny's visual quality with voxel geometry freedom.**

Voxels are a **data structure**, not a visual style. The "voxel look" (blocky, Minecraft) comes from rendering voxels directly as cubes. NMS converts voxels to smooth polygon meshes via surface extraction — the player never sees a voxel. The output mesh gets PBR materials, normal maps, triplanar texturing, the full lighting pipeline. It looks like sculpted terrain, not blocks.

For Glasswake, voxel terrain would pipe through the same Destiny-style rendering pipeline (PBR, warm/cool grading, atmospheric perspective, SSAO, bloom, etc.). The terrain would look *better* than the current heightmap — organic overhangs, cave mouths, natural arches — while keeping the Destiny lighting and atmosphere on top.

**Phased approach:**

1. **Now: nail the Destiny visual stack** — camera, grading, atmosphere, particles, DOF. This is the rendering pipeline that makes everything look good regardless of terrain data structure.
2. **Hybrid prototype**: keep the heightmap for the broad world. Add voxel volumes only in POI zones (cave entrances, ruin interiors, cliff faces with overhangs). This lets us prototype marching cubes + triplanar texturing in a contained scope without rewriting the whole terrain system.
3. **Full voxel (if hybrid proves out)**: replace `Terrain.ts` entirely with chunked 32³ density fields, marching cubes in Web Workers, LOD streaming. The rendering pipeline stays the same — only the geometry source changes.

**What voxels give us:**
- Caves, tunnels, overhangs, natural bridges (impossible with 2D heightmap)
- Terrain deformation (dig, flatten, raise)
- More organic, sculpted terrain shapes
- Better ruin integration (geometry that wraps around and through structures)

**What we keep from the current pipeline regardless:**
- PBR materials via MeshStandardMaterial / custom shaders
- The full PostFX chain (warm/cool grade, atmospheric perspective, SSAO, bloom, fog, god rays)
- IBL environment lighting
- Shadow maps
- Wind-driven vegetation and grass

---

## Recommended Priority for Glasswake

### Done (visual stack)
1. ~~**Camera feel**~~ — boxing-style weight, lowered aim point, momentum lean, weighted bob ✓
2. ~~**Warm/cool color grading**~~ — cool shadows / warm highlights, time-of-day driven ✓
3. ~~**Atmospheric perspective**~~ — depth-based desaturation + blue shift ✓
4. ~~**Depth of field**~~ — subtle gameplay DOF via DepthOfFieldEffect, quality-adaptive ✓
5. ~~**Eye adaptation**~~ — auto-exposure from scene luminance, smooth adaptation ✓
6. ~~**Tree shadows**~~ — castShadow + receiveShadow enabled ✓
7. ~~**Tree aesthetics**~~ — clustered canopy, 3-color palette, SSS, rim, leaf flutter ✓
8. ~~**HUD rework**~~ — Destiny-style curved arc bars, compass strip, clean prompts ✓

### Next up (visual + feel)
9. **Ambient particles** — pollen, dust motes, snow flurries, fireflies at dusk

### Next up (gameplay — MVP core loop)
10. **PilotingState + mounting** — the activation dead-end fix (MVP Step 5)
11. **Turret + projectiles** — fire from Walker (MVP Step 6)
12. **Enemies** — void creatures, basic AI, XP drops (MVP Step 7)
13. **Health + damage** — player/Walker HP, death/respawn/eject (MVP Step 9)
14. **XP + leveling** — kill→XP pipeline, camp level-up (MVP Step 8)
15. **Pause menu wired** — live stats, Restart button (MVP Step 10)

### Later
16. **Resource pickups + tier gates** — power cells for Assault activation (MVP Step 11)
17. **Voxel terrain hybrid** — marching cubes in POI zones (caves, overhangs)
18. **Full voxel terrain** — replace heightmap if hybrid proves out
