# World_1 — Architecture

One-liner per file and exported function/class.

## Entry

| File | Purpose |
|------|---------|
| `index.html` | HTML shell, mounts `#app` div, loads `main.ts` |
| `viewer.html` | Dev model viewer: UI overlay + loads `src/viewer/modelViewer.ts` |
| `vite.config.ts` | Vite multi-page build: `index.html` + `viewer.html` inputs |
| `src/main.ts` | Creates canvas, instantiates `Game`, calls `start()` |
| `src/viewer/modelViewer.ts` | Orbit studio for `WalkerMech`: key/fill/rim + shadows, studio/outdoor, exposure, bottom toolbar, WASD+Q/E roam, R/G/Shift; dispose on swap |

## game/

| File | Exports | Purpose |
|------|---------|---------|
| `Game.ts` | `Game` | Main orchestrator. Owns renderer, scene, camera, clock. Instantiates all systems in `seedScene()`. Runs the game loop in `tick()`. Handles rest mechanic, compass, spawn intro, Walker idle updates, pause state, debug keys (F3). |
| `Game.ts` | `.start()` | Begins the render loop |
| `Game.ts` | `.stop()` | Cancels render loop, disposes input |
| `Game.ts` | `.seedScene()` | Instantiates terrain, water, vegetation, sky, clouds, wind, player, camera rig, POIs, campfires, landmarks, dormant Walkers, journal, HUD, world map, pause menu, audio, post-fx |
| `Player.ts` | `Player` | Player controller. WASD movement, sprint/stamina, slope gating, step events, procedural knight model with wind-driven cape flutter shader. |
| `Player.ts` | `buildKnightModel()` | Builds a Dark Souls-style knight from Three.js primitives: helmet, torso, pauldrons, greaves, cape, sword on back |
| `Player.ts` | `.update(dt, input, cameraYaw)` | Per-frame movement: accel/decel, terrain clamping, slope rejection, facing, step phase |
| `Player.ts` | `.setWind(dirXZ)` | Updates cape flutter wind direction |
| `Input.ts` | `Input`, `InputState` | Keyboard + mouse input. WASD, Shift sprint, E interact, Tab journal, Escape pause, pointer lock orbit. `consume()` returns and resets deltas. |
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
| `WalkerMech.ts` | `WalkerTier`, `WalkerMech` | Procedural quadruped Walker (Scout/Assault): hull, armor, 4 legs, turret; `update` reserved for future animation. |
| `WalkerMechs.ts` | `WalkerMechs` | Spawns dormant Walkers with seeded biome rules: Scouts in `grassy_plains` (one near player spawn), Assaults in forest/mountains biased near ruin POIs; `walkers` list for future interaction. |
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
| `HUD.ts` | `HUD` | Fixed overlay: health/stamina/XP bar stack (top-left), compass rose (top-center), crosshair (center, piloting only), Walker health bar (piloting only), interaction prompt (bottom-center). Dark Souls minimal style. |
| `Journal.ts` | `JournalUI` | Tab-toggled overlay: Warcraft/Witcher 3 ornate panel. Two-column layout with parchment map slot (left) and scrollable lore entries with gold-accent cards (right). |
| `WorldMap.ts` | `WorldMap`, `MapMarkerData` | 2D canvas parchment map. Layered rendering: base biome colors + water + contour lines, parchment fog-of-war with soft feathered edges, player arrow, POI markers (camp/ruin/shrine), Walker markers, compass rose, vignette border. |
| `PauseMenu.ts` | `PauseMenu`, `CharacterStats`, `WalkerStats`, `InventoryItem` | ESC-toggled pause overlay: Warcraft-style gold-trimmed panel with character stats, Walker stats (if active), inventory list, Resume/Quit buttons. |
