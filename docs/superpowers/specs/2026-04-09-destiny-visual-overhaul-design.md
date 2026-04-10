# Destiny 1 Visual Overhaul — Design Spec

Glasswake's rendering pipeline gets a Destiny 1-inspired visual upgrade paired with a performance overhaul to maintain 60fps on wide vistas at the 1500x1500 world scale.

## Scope

| Pillar | Cost | Phase |
|--------|------|-------|
| Terrain chunking | Moderate | 1 — Pipeline |
| Grass distance culling | Cheap | 1 — Pipeline |
| Vegetation LOD + spatial grid | Moderate | 1 — Pipeline |
| Depth-normal pre-pass | Moderate | 2 — Pre-pass |
| Rim / back lighting upgrade | Cheap | 3 — Shaders |
| Atmospheric haze | Cheap | 3 — Shaders |
| Cinematic color grading | Cheap | 3 — Shaders |
| SSAO + contact shadows | Expensive (tiered) | 3 — Shaders |
| Depth of field | Cheap | 3 — Shaders |
| Chromatic aberration | Negligible | 3 — Shaders |
| Tree rendering upgrades | Cheap | 3 — Shaders |
| Quality tier wiring | Cheap | 4 — Polish |

## Phase 1: Render Pipeline Foundation

Performance improvements that create headroom for the shader upgrades.

### 1A: Terrain Chunking

Split the single 350x350 PlaneGeometry into a 7x7 grid of chunks (~50x50 segments each).

**Why:** Per-chunk frustum culling. On a directional vista, roughly half the chunks are behind the camera — ~60k fewer vertices.

**Implementation:**
- At construction, slice vertex/index buffers into chunk geometries
- Each chunk is its own `Mesh` added to a `Group`
- **All chunks share a single material instance** (not cloned). The `onBeforeCompile` patch compiles once and Three.js caches it. Cloning per-chunk would cause 49 redundant shader compilations.
- `heightAtXZ`, `biomeAtXZ`, `slopeAtXZ` stay on the unified `heightField`/`biomeField` arrays — query API unchanged
- Each chunk computes a tight bounding box from actual vertex heights — Three.js frustum culling works automatically

**LOD (stretch):**
- Two geometry levels per chunk: full (50x50) and reduced (25x25)
- Chunks beyond ~400 units from camera swap to reduced
- Optional — frustum culling alone may be sufficient

**External API:** No change. `Terrain` still exposes `heightAtXZ()`, `biomeAtXZ()`, `slopeAtXZ()`, `findFlatSpawn()`, `carveRiverChannels()`.

### 1B: Grass Distance Culling

The single biggest FPS win. Grass beyond ~120 units is invisible (too small on screen).

**Implementation:**
- Split grass into the same 8x8 spatial grid used for vegetation — each cell gets its own `InstancedMesh`
- Per-cell frustum culling works automatically via tight bounding boxes (same approach as vegetation)
- Each frame: cells beyond the distance threshold set `visible = false`. Cells at the edge fade by reducing `mesh.count` proportionally
- Quality-tiered radius: high=120, medium=80, low=50
- Fade: cells at the outer edge of the range have their instance count reduced so grass doesn't pop in/out

**Why spatial grid over pre-sort:** Pre-sorting from world center only works if the camera is near center. If the player is at the world edge, nearby grass would be culled while distant center-grass renders. The per-cell approach is correct regardless of camera position and is consistent with the vegetation system.

**Cost of per-frame update:** 64 distance checks + visibility toggles — under 0.01ms.

### 1C: Vegetation LOD + Spatial Grid

#### Spatial Grid

World divided into 8x8 grid of cells (~187x187 units each). Each cell gets its own `InstancedMesh` for deciduous and pine trees.

**Why:** Three.js frustum-culls entire `InstancedMesh` objects, not individual instances. The current global InstancedMesh spans the full 1500x1500 world — its bounding sphere always passes frustum check. Per-cell meshes have tight bounding boxes that cull properly.

**Construction:**
1. Scatter trees as before (same RNG, same biome density — deterministic, identical results)
2. Bucket each tree into a cell based on `(x, z)` position
3. Create per-cell InstancedMesh instances with exact counts
4. Create per-cell billboard InstancedMesh (same positions, billboard geometry)

**Per-frame update:**
1. For each cell, compute distance from camera to cell center
2. Assign LOD band, set mesh visibility
3. Cells outside frustum: invisible (Three.js handles via bounding box)
4. Cost: 64 distance checks + visibility toggles — under 0.01ms

#### Three LOD Bands

| Band | Distance | Geometry | Wind Sway | Verts/tree |
|------|----------|----------|-----------|------------|
| Full detail | 0–150 units | Displaced icosphere canopy + cylinder trunk | Full | ~60 |
| Reduced | 150–350 units | Same geometry | Disabled (uniform flag) | ~60 |
| Billboard | 350–600 units | Camera-facing quad, flat-colored silhouette | None | 4 |
| Culled | 600+ units | Not rendered | — | 0 |

**Billboard color:** Each billboard's color is the average of its corresponding full-detail tree's canopy color (`uLeafA` lerped with `uLeafB` at 0.5). At 350+ units and through atmospheric haze, a flat colored quad is indistinguishable from the 3D model. Billboard meshes are lazily created per-cell only when the cell enters billboard range (avoids allocating 384 InstancedMesh objects upfront — only ~20-30 billboard meshes exist at any time).

**Draw call impact:** Before: 2 draw calls, all 3600 instances. After: ~12-16 draw calls (visible cells), ~800-1200 instances in frustum. ~65-70% fewer vertices processed.

#### Tree Rendering Upgrades

Three must-have shader improvements to transform trees from geometric primitives to Destiny-quality stylized vegetation:

**Leaf Translucency (subsurface scatter approximation):**
When the sun is behind a tree relative to the camera, the canopy glows warm — Destiny 1's signature vegetation look.

```glsl
// In fragment main(), after col is computed. V already exists (line 268 of current shader).
vec3 sunDir = normalize(uSunDir); // new uniform
float scatter = pow(max(0.0, dot(-V, sunDir)), 3.0) * vIsLeaf;
vec3 scatterColor = col * vec3(1.2, 1.1, 0.6); // warm tint of the leaf's own color
col += scatterColor * scatter * 0.35;
```

Requires: add `uSunDir: { value: new THREE.Vector3() }` to `makeTreeWindMaterial()` uniforms. Update each frame in `Vegetation.update()` from `SkySystem.sunDirection`.

**Displaced Icosphere Canopy:**
Replace `DodecahedronGeometry(0.85, 0)` with `IcosahedronGeometry(0.85, 1)` whose vertex positions are displaced by noise based on vertex normal direction. Creates organic, lumpy silhouettes.

- Noise displacement at construction time (not per-frame)
- Per-tree variation via a seed attribute that offsets the noise sample
- Pine trees: keep ConeGeometry but add slight noise displacement to break the perfect cone

**Canopy Color Depth:**
Vertical gradient + self-AO within the canopy:

```glsl
float canopyHeight = (vLocalPos.y - trunkTop) / canopyRadius;
float selfAO = smoothstep(0.0, 0.4, canopyHeight);
col *= 0.7 + 0.3 * selfAO; // dark at base, light at top
```

Plus bark variation on trunks:
```glsl
float barkNoise = hash(vWorldPos.xz * 2.0 + vWorldPos.y * 0.5);
trunkColor *= 0.85 + 0.15 * barkNoise;
```

**Stretch goal — Alpha Fringe:**
Ring of alpha-tested leaf particles around canopy edge. Adds a second draw call per tree. Only if the displaced icosphere silhouette isn't sufficient.

### 1D: Frustum Culling for Walkers/POIs

Walker mechs and POI markers are few enough (~30 objects) for brute-force frustum checks.

- Each frame, check which objects are inside camera frustum
- Set `visible = false` on objects outside
- Cost: < 0.1ms

## Phase 2: Depth-Normal Pre-Pass

The `postprocessing` library's `EffectComposer` already renders the scene via `RenderPass` and produces a depth buffer. We reuse that depth buffer for atmospheric haze, DOF, and contact shadows — no extra geometry pass needed for depth.

We only need an additional **normals-only pass** for SSAO (which requires world normals that the standard depth buffer doesn't provide).

**Implementation:**
- **Depth:** Reuse the depth buffer from `EffectComposer`'s existing `RenderPass` (exposed via `composer.inputBuffer`). No extra scene render.
- **Normals:** Single extra render with scene override material that writes world normals to an RGB target. This is the only new geometry pass.
- Render normals to half-res on medium tier, full-res on high, skip on low (SSAO disabled on low anyway)
- Store on `PostFX` as `normalTarget`

**Consumers:**
- Atmospheric haze → reads depth from composer's depth buffer
- SSAO → reads both depth + normals
- Contact shadows → reads depth only
- DOF → reads depth only

**Why this is cheaper than the naive approach:** One extra geometry pass (normals only, simple override material) instead of a full MRT re-render. The depth buffer is free — already produced by the existing `RenderPass`. On low tier, the normals pass is skipped entirely since SSAO is disabled.

**Upscale strategy for half-res normals:** When SSAO runs at half-res on medium tier, the AO result is bilateral-upscaled before compositing. Bilateral upscale uses the full-res depth buffer to preserve edges, avoiding the haloing artifacts that naive bilinear upscale produces.

## Phase 3: Shader Upgrades

### 3A: Rim / Back Lighting

Upgrade `RimLight.ts` from basic fresnel to Destiny-style directional rim.

**Sky-Sampled Rim Color:**
Rim color derived from sky system each frame — warm at dusk, cool at night, bright at day.

New uniforms:
- `uRimSkyColor` (vec3) — set from `SkySystem` ambient color
- `uRimSunDir` (vec3) — already exists
- `uRimSunColor` (vec3) — warm gold day, deep amber dusk, cool blue night

**Directional Rim (Backlit Glow):**
Objects between the camera and sun glow strongest:
```glsl
float backlitFactor = saturate(dot(-viewDir, sunDir));
float rim = fresnel * (0.3 + 0.7 * backlitFactor) * uRimIntensity;
gl_FragColor.rgb += rim * uRimSkyColor;
```

**Terrain Rim:**
Extend rim into `Terrain.ts`'s existing `onBeforeCompile` callback. **Important:** `Terrain.material` already has an `onBeforeCompile` that adds triplanar rock blending and shore fading. Rim lighting must be merged into this same callback — Three.js only supports one `onBeforeCompile` per material. The `applyRimLightToScene` traversal in `Game.ts` must skip the terrain mesh (it would overwrite the terrain's custom compile). Instead, the terrain's own `onBeforeCompile` includes the rim uniforms and GLSL directly. Terrain rim intensity: 0.3 (vs 1.0 for player/mechs).

**Per-Material Intensity:**
`applyRimLightToStandardMaterial` gains optional `intensityScale`. Check `userData.rimScale` during scene traversal. The terrain mesh is excluded from the scene traversal and handles its own rim internally.

| Target | Rim Scale |
|--------|-----------|
| Player / mechs | 1.0 |
| Vegetation | 0.6 |
| Terrain | 0.3 |

### 3B: Atmospheric Haze

Replaces `FogVeilEffect` and `FogExp2` with depth-aware atmospheric scattering.

**Core formula:**
```glsl
float depth = texture2D(tDepth, uv).r;
float worldDist = linearizeDepth(depth) * uFarPlane;
float hazeAmount = 1.0 - exp(-worldDist * uDensity);
vec3 hazeColor = mix(uHazeHorizon, uHazeZenith, uv.y);
outputColor = vec4(mix(col, hazeColor, hazeAmount), 1.0);
```

**Time-of-day variation:**
- Day: cool blue-grey haze (`uHazeHorizon = vec3(0.65, 0.72, 0.82)`)
- Dusk: golden-amber haze (`uHazeHorizon = vec3(0.85, 0.68, 0.45)`)
- Night: deep blue-violet, reduced density (`uHazeHorizon = vec3(0.15, 0.18, 0.30)`)
- Colors interpolated from `SkySystem.dayAmount` and `SkySystem.duskAmount`

**Biome tinting:** Forest biomes shift haze greener, mountain biomes shift cooler. Reads biome texture (existing).

**Replaces:** `FogVeilEffect` removed. `scene.fog` (FogExp2) removed — this requires updating `SkySystem.ts` to remove its fog creation (line 32-33) and fog color/density updates in `update()` (lines 72-79). New `AtmosphericHazeEffect` takes their place.

**Note:** The current `FogVeilEffect` declares a `tDepth` uniform that was never connected — depth-based fog was clearly planned. This fulfills that original intent.

**Performance:** Cheaper than current FogVeil — one depth sample + math vs. multi-layer fbm noise.

### 3C: Cinematic Color Grading

Replaces `ToonRampEffect` + `BiomePaletteEffect` with unified `CinematicGradeEffect`.

**Lift / Gamma / Gain (3-zone color):**
- Shadows (lift): cool blue `vec3(0.92, 0.94, 1.05)` — Destiny's cool shadow signature
- Midtones (gamma): slight desaturation, neutral
- Highlights (gain): warm `vec3(1.06, 1.02, 0.95)` — sunlit surfaces glow warm

**Contrast S-Curve:**
Gentle luminance S-curve — crushes deep shadows, lifts highlights. Filmic feel without HDR bloom.

**Split-Toning:**
Warm highlights / cool shadows blended by luminance. The defining characteristic of Destiny 1's color science.

**Vignette:**
Subtle edge darkening (0.85 at corners). Cinematic framing.

**Biome influence:**
Biomes shift the split-tone balance rather than flat-tinting. Forest → shadows greener. Snow → highlights cooler. More natural than current hard palette swap.

**Time-of-day uniforms:** `uDayAmount`, `uDuskAmount` blend the grade — warmer at dusk, cooler at night, neutral at noon.

**Performance:** Same cost as the two effects it replaces. Net zero.

### 3D: SSAO + Contact Shadows

**Screen-Space Ambient Occlusion:**

Custom N8AO-style implementation:
- Samples depth buffer in hemisphere around each pixel to estimate occlusion
- Half-res on medium tier, full-res on high, disabled on low

What it darkens:
- Terrain creases and valleys
- Tree trunks meeting ground
- Mech feet / legs contact
- Rock formations against hillsides

**Quality tiers:**

| Tier | Resolution | Samples | Blur |
|------|-----------|---------|------|
| High | Full | 12 | Bilateral |
| Medium | Half | 8 | Box |
| Low | Disabled | — | — |

**Contact Shadow:**
Single raymarched shadow along sun direction per pixel. 4-8 steps. Catches tight shadow where objects meet surfaces.

- Blends with SSAO for unified darkening
- Quality tiered: high=8 steps, medium=4 steps, low=disabled

**Integration:** `SSAOEffect` runs before `CinematicGradeEffect` in the effect chain. Needs depth + normal buffers from Phase 2 pre-pass. AO result is a single-channel multiply on scene color.

### 3E: Depth of Field

Subtle Destiny-style DOF — soft falloff on distant mountains, never heavy.

**Implementation — Hexagonal Bokeh DOF:**
- Reads depth buffer from Phase 2 pre-pass
- Two zones: near (sharp) and far (soft blur)
- Focus distance auto-calculated from terrain height at screen center
- 6-tap hexagonal blur kernel

**Dynamic behavior:**
- Blur strength increases when player is standing still >1s — rewards pausing to admire
- While moving/sprinting, DOF reduces to near-zero — gameplay stays crisp
- Smooth 0.8s interpolation between states

**Uniforms:** `uFocusDist`, `uFarStart`, `uFarEnd`, `uBlurAmount` (driven by movement state)

**Quality tiers:** High: 6-tap. Medium: 4-tap. Low: disabled.

### 3F: Chromatic Aberration

Barely perceptible color fringing at screen edges. Filmic "real lens" quality.

**Implementation:**
- Runs last in the effect chain (after grading)
- Offsets R and B channels: `offset = 0.003 * length(uv - 0.5)^2`
- Quadratic falloff from center — 3 pixels of shift at corners on 1080p
- Scales with vignette mask to reinforce edge effect

**Quality tiers:** High/Medium: enabled. Low: disabled.

**Cost:** 2 extra texture samples. Can share pass with film grain.

## Phase 4: Polish

### 4A: Quality Tier Wiring

Wire all new effects into `PerformanceManager` tier system.

| Effect | High | Medium | Low |
|--------|------|--------|-----|
| SSAO | Full-res, 12 samples | Half-res, 8 samples | Disabled |
| Contact Shadow | 8 steps | 4 steps | Disabled |
| Atmospheric Haze | Depth + biome tint | Depth only | Simple exp fog |
| Cinematic Grade | Full | Full | Full |
| God Rays | 20 samples | 12 samples | 8 samples | *(changed from existing 20/14/10 — tighter budget to offset new effects)* |
| Film Grain | 0.012 | 0.010 | Disabled |
| DOF | 6-tap | 4-tap | Disabled |
| Chromatic Aberration | Enabled | Enabled | Disabled |
| Grass Range | 120 units | 80 units | 50 units |
| Vegetation LOD distances | 150/350/600 | 120/280/480 | 80/200/350 |
| Tree Wind Sway | Full | Reduced | Near-only |

### 4B: Parameter Tuning

- Per-biome atmosphere colors (forest, plains, mountains each get distinct haze palette)
- Time-of-day sweep: verify color grading, rim, and atmosphere look correct at dawn, noon, dusk, midnight
- SSAO radius and intensity per biome (forests darker, plains lighter)
- DOF focus distance curves

## Post-Processing Chain (final order)

```
1. RenderPass (scene → color buffer)
2. DepthNormalPass (scene → depth + normals MRT)
3. SSAOEffect (reads depth/normals → AO multiply)
4. AtmosphericHazeEffect (reads depth → distance blend)
5. CinematicGradeEffect (lift/gamma/gain, split-tone, vignette)
6. GodRaysEffect (sun position, depth occlusion)
7. DOFEffect (reads depth → hexagonal blur)
8. ChromaticAberrationEffect + FilmGrainEffect (final composite)
```

## Files Changed

| File | Change |
|------|--------|
| `src/world/Terrain.ts` | Split into chunk grid, add rim shader patch |
| `src/world/Vegetation.ts` | Spatial grid, 3 LOD bands, tree geometry/shader upgrades |
| `src/world/GrassField.ts` | Distance-based culling, pre-sorted instances |
| `src/render/PostFX.ts` | New effect chain, depth-normal pre-pass, remove old effects |
| `src/render/TerrainShader.ts` | Remove — dead code (`makeTerrainMaterial()` is unused; `Terrain.ts` builds its own material with `onBeforeCompile`) |
| `src/world/SkySystem.ts` | Remove `FogExp2` creation and fog update logic (replaced by AtmosphericHazeEffect) |
| `src/render/RimLight.ts` | Sky-sampled color, directional backlit, per-material intensity |
| `src/render/AtmosphericHaze.ts` | New file — replaces FogVeil |
| `src/render/CinematicGrade.ts` | New file — replaces ToonRamp + BiomePalette |
| `src/render/SSAOEffect.ts` | New file |
| `src/render/DOFEffect.ts` | New file |
| `src/render/ChromaticAberration.ts` | New file |
| `src/game/Game.ts` | Wire new systems, remove FogExp2, update PostFX calls |
| `src/game/PerformanceManager.ts` | Expanded tier definitions |
| `src/world/WalkerMechs.ts` | Add frustum culling |
| `src/world/PointsOfInterest.ts` | Add frustum culling |

## Integration Order

```
Phase 1: Render Pipeline Foundation
  ├── 1A: Terrain chunking
  ├── 1B: Grass distance culling
  ├── 1C: Vegetation LOD + spatial grid + tree upgrades
  └── 1D: Frustum culling for walkers/POIs
      → Playtest: confirm FPS improvement on vistas

Phase 2: Depth-Normal Pre-Pass
  └── Shared render target for SSAO + atmosphere + DOF
      → Verify no visual regression

Phase 3: Shader Upgrades
  ├── 3A: Rim lighting upgrade
  ├── 3B: Atmospheric haze (replaces FogVeil + FogExp2)
  ├── 3C: Cinematic grade (replaces ToonRamp + BiomePalette)
  ├── 3D: SSAO + contact shadows
  ├── 3E: Depth of field
  └── 3F: Chromatic aberration
      → Playtest: Destiny 1 feel check

Phase 4: Polish
  ├── 4A: Quality tier wiring
  └── 4B: Parameter tuning per biome + time of day
```

Performance first (Phase 1-2), then visual upgrades (Phase 3), then tuning (Phase 4).

## Success Criteria

- 60fps sustained on wide mountain vistas at high quality tier
- Vegetation renders at <30% of current draw cost on typical vista
- Rim lighting varies visibly with sun position and time of day
- Atmospheric haze gives each biome a distinct distance character
- Color grading reads as "filmic" not "cel-shaded" — cool shadows, warm highlights
- Trees glow with translucent warmth when backlit at golden hour
- SSAO grounds objects convincingly without visible banding
- DOF activates subtly when stationary, stays crisp during gameplay
