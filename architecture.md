# World_1 — Architecture

One-liner per file and exported function/class.

## Entry

| File | Purpose |
|------|---------|
| `index.html` | HTML shell, mounts `#app` div, loads `main.ts` |
| `src/main.ts` | Creates canvas, instantiates `Game`, calls `start()` |

## game/

| File | Exports | Purpose |
|------|---------|---------|
| `Game.ts` | `Game` | Main orchestrator. Owns renderer, scene, camera, clock. Instantiates all systems in `seedScene()`. Runs the game loop in `tick()`. Handles rest mechanic, compass, spawn intro, debug keys (F3). |
| `Game.ts` | `.start()` | Begins the render loop |
| `Game.ts` | `.stop()` | Cancels render loop, disposes input |
| `Game.ts` | `.seedScene()` | Instantiates terrain, water, vegetation, sky, clouds, wind, player, camera rig, POIs, campfires, landmarks, journal, HUD, audio, post-fx |
| `Player.ts` | `Player` | Player controller. WASD movement, sprint/stamina, slope gating, step events, optional knight GLTF model with cape flutter shader. |
| `Player.ts` | `.update(dt, input, cameraYaw)` | Per-frame movement: accel/decel, terrain clamping, slope rejection, facing, step phase |
| `Player.ts` | `.setWind(dirXZ)` | Updates cape flutter wind direction |
| `Player.ts` | `.tryLoadKnight()` | Async GLTF load of `/models/knight.glb`, falls back to capsule |
| `Input.ts` | `Input`, `InputState` | Keyboard + mouse input. WASD, Shift sprint, E interact, Tab journal, pointer lock orbit. `consume()` returns and resets deltas. |
| `CameraRig.ts` | `CameraRig` | Third-person orbit camera with critically damped spring, footstep shake, cinematic zoom. |
| `CameraRig.ts` | `.addOrbitDelta(dx, dy)` | Applies mouse orbit |
| `CameraRig.ts` | `.update(dt, targetPos)` | Springs camera toward desired offset from target |
| `CameraRig.ts` | `.impulseFootstep(intensity)` | Triggers camera shake on player step |
| `PerformanceManager.ts` | `PerformanceManager`, `QualityTier` | Adaptive quality tiers (high/medium/low) via EMA frame time with hysteresis and cooldown. |

## world/

| File | Exports | Purpose |
|------|---------|---------|
| `Terrain.ts` | `Terrain` | Procedural heightfield (700×700, 224 segments). FBM + ridge noise, mega-mountain with spiral carved passes. Biome assignment per vertex. |
| `Terrain.ts` | `.heightAtXZ(x, z)` | Bilinear interpolated height lookup |
| `Terrain.ts` | `.biomeAtXZ(x, z)` | Nearest-vertex biome lookup |
| `Terrain.ts` | `.slopeAtXZ(x, z)` | Finite-difference slope magnitude |
| `Terrain.ts` | `.findFlatSpawn(seed)` | Picks a flat, above-sea, non-mountain spawn point |
| `Terrain.ts` | `.carveRiverChannels(paths, width, depth)` | Carves geometry along a path for rivers/passes |
| `Biomes.ts` | `BiomeId`, `Biome`, `biomeIndex`, `biomeFromIndex` | Biome enum (`grassy_plains`, `autumn_forest`, `snowy_mountains`), color/density params, index helpers |
| `Water.ts` | `Water` | Ocean plane + river ribbons. Custom shader materials with wind-driven animation. Downhill path generation for rivers, carves terrain channels. |
| `Vegetation.ts` | `Vegetation` | Instanced deciduous + pine trees scattered by biome density. Wind sway shader. Quality-tier instance count scaling. |
| `SkySystem.ts` | `SkySystem` | Day/night cycle (~10min). Three.js Sky object, directional sun light, fog color/density, dusk detection. |
| `CloudDome.ts` | `CloudDome` | Backface sphere with FBM cloud shader. Day/dusk/night coloring, quality-adaptive detail. |
| `WindSystem.ts` | `WindSystem` | Slowly meandering wind direction + speed. Drives vegetation sway, water ripple, cape flutter, campfire embers. |
| `PointsOfInterest.ts` | `PointsOfInterest`, `POI` | Spawns ruin/shrine/camp POIs with discovery orbs. Proximity-based discovery triggers journal entries. |
| `Campfires.ts` | `Campfires` | Places 5 campfire rings with point lights and additive ember particles. Wind-affected particle sim. |
| `Landmarks.ts` | `Landmarks` | Places a ruined castle on the mega-mountain. Stone/iron geometry, slope-optimized placement. |
| `noise.ts` | `makeNoise2D`, `fbm2`, `ridge2` | Deterministic simplex noise wrapper, FBM summation, ridge transform |

## render/

| File | Exports | Purpose |
|------|---------|---------|
| `PostFX.ts` | `PostFX` | EffectComposer pipeline: biome palette grading, god rays, fog veil, film grain. Biome ID render pass. Quality-adaptive sample counts. |
| `PostFX.ts` | `PostFX.tagBiome(mesh, idx)` | Static helper to tag meshes for biome grading |
| `RimLight.ts` | `applyRimLightToScene`, `applyRimLightToStandardMaterial` | Patches MeshStandardMaterial with fresnel rim + dusk-boosted back-light |

## audio/

| File | Exports | Purpose |
|------|---------|---------|
| `AudioSystem.ts` | `AudioSystem` | Procedural ambient audio. Pink noise wind (mountain-scaled), white noise birds (forest-scaled), impulse footsteps (biome-tinted volume). Starts on first pointer interaction. |

## ui/

| File | Exports | Purpose |
|------|---------|---------|
| `HUD.ts` | `HUD` | Fixed overlay: compass arrow (top-center), stamina bar (bottom-left), interaction prompt (bottom-center) |
| `Journal.ts` | `JournalUI` | Tab-toggled overlay: two-column layout with map slot (left) and scrollable lore entries (right) |
| `WorldMap.ts` | `WorldMap` | 2D canvas minimap with biome coloring and fog-of-war reveal by player proximity |
