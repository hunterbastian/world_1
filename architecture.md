# Glasswake — Architecture

One-liner per file and exported function/class.

## Entry

| File | Purpose |
|------|---------|
| `index.html` | HTML shell, mounts `#app` div, loads `main.ts` |
| `viewer.html` | Dev model viewer: UI overlay + loads `src/viewer/modelViewer.ts` |
| `vite.config.ts` | Vite multi-page build: `index.html` + `viewer.html` inputs |
| `src/main.ts` | Creates canvas, instantiates `Game`, calls `start()` |
| `src/viewer/modelViewer.ts` | Orbit studio for Knight + `WalkerMech` tiers: key/fill/rim + shadows, studio/outdoor, exposure, bottom toolbar, WASD+Q/E roam; knight auto-cycles idle/walk/run demo |

## game/

| File | Exports | Purpose |
|------|---------|---------|
| `Game.ts` | `Game` | Thin orchestrator. Owns renderer, scene, camera, clock. Instantiates all systems in `seedScene()`, builds `GameContext`, delegates gameplay to active `GameState`. Manages environment updates, performance tiers, **ESC pause** (`paused` flag + `PauseMenu`; not a `MenuState` yet), post-FX. **`ExploringState` and `PilotingState` registered**; `menu` ID exists on `GameStateId` but has no state class wired. |
| `Game.ts` | `.start()` | Begins the render loop |
| `Game.ts` | `.stop()` | Cancels render loop, disposes input |
| `Game.ts` | `.changeState(id)` | Exits current state, enters next state |
| `Game.ts` | `.seedScene()` | Instantiates terrain, water, vegetation, sky, clouds, wind, player, camera rig, POIs, campfires, landmarks, dormant Walkers, journal, HUD, world map, pause menu, audio, post-fx |
| `GameState.ts` | `GameState`, `GameStateId`, `GameContext` | State machine interface. States: `exploring`, `piloting`, `menu`. `GameContext` provides shared references (player, camera, terrain, HUD, etc.) that states can access. Includes `activeWalker: WalkerMech | null` for the currently mounted Walker. |
| `ExploringState.ts` | `ExploringState` | On-foot **first-person** exploration. FP camera yaw/pitch via `CameraRig`, player movement, compass to nearest POI, journal toggle, world map markers, rest at camps (hold E), **Walker activation** (hold E near dormant Walker → HUD ring → `WalkerMech.activate()` → mount → `PilotingState`). Re-mount activated Walkers with hold E. Optional dev fly toggle. |
| `PilotingState.ts` | `PilotingState` | **Third-person** Walker piloting. WASD drives Walker movement (heading-based steering, heavy inertia). TP chase camera orbits Walker hull. Compass to nearest POI. Hold E to dismount back to `ExploringState`. Shows Walker health bar + crosshair. |
| `Player.ts` | `Player` | First-person player controller. WASD, sprint/stamina, jump, crouch, slide, air control; Destiny-tuned speeds. **No visible mesh** (empty `Object3D` for position). Step/landing events for audio/camera. |
| `Player.ts` | `.update(dt, input, cameraYaw)` | Per-frame movement: accel/decel, terrain clamping, slope rejection, facing, step phase, calls animateKnight |
| `Player.ts` | `.setWind(dirXZ)` | Updates cape flutter wind direction |
| `KnightModel.ts` | `buildKnightModel()` | Procedural Dark Souls knight: medieval steel/leather/chainmail palette, overlapping half-sphere pauldrons with ridges, segmented greaves, pointed knee cops, leather cross-straps and pouches, brown cowl, barrel helmet with horizontal ridges and visor slit. Hierarchical limb groups for animation. |
| `KnightModel.ts` | `animateKnight(limbs, dt, speed, phase)` | Speed-blended procedural animation: idle sway, walk stride, run with weight. Legs/arms counter-swing, body bobs, head counters. |
| `Input.ts` | `Input`, `InputState` | Keyboard + mouse input. WASD, Shift sprint, E interact, Tab journal, Escape pause, pointer lock orbit. `consume()` returns and resets deltas. |
| `CameraRig.ts` | `CameraRig` | Dual-mode camera rig. **FP mode**: eye height spring, mouse yaw/pitch, walk/sprint bob, landing dip, sprint FOV, slide roll, footstep shake. **TP mode**: spring-smoothed chase camera orbiting a follow target (Walker hull top), configurable distance/height per tier. `setMode('fp'|'tp')` switches modes. |
| `CameraRig.ts` | `.addOrbitDelta(dx, dy)` | Applies mouse look (yaw/pitch) |
| `CameraRig.ts` | `.update(dt, targetPos)` | Updates camera position at player eye + effects |
| `CameraRig.ts` | `.impulseFootstep(intensity)` | Triggers camera shake on player step |
| `PerformanceManager.ts` | `PerformanceManager`, `QualityTier` | Adaptive quality tiers (high/medium/low) via EMA frame time with hysteresis and cooldown. |

## world/

| File | Exports | Purpose |
|------|---------|---------|
| `Terrain.ts` | `Terrain` | Procedural heightfield (e.g. **1500×1500**, 350 segments in `Game.ts`). FBM + ridge noise, mega-mountain with spiral carved passes. Biome assignment per vertex. Smooth biome color blending via continuous weights (mountainMask × basinFalloff, forestMask, elevation) so boundaries gradient naturally. |
| `Terrain.ts` | `.heightAtXZ(x, z)` | Bilinear interpolated height lookup |
| `Terrain.ts` | `.biomeAtXZ(x, z)` | Nearest-vertex biome lookup |
| `Terrain.ts` | `.slopeAtXZ(x, z)` | Finite-difference slope magnitude |
| `Terrain.ts` | `.findFlatSpawn(seed)` | Picks a flat, above-sea, non-mountain spawn point |
| `Terrain.ts` | `.carveRiverChannels(paths, width, depth)` | Carves geometry along a path for rivers/passes |
| `Biomes.ts` | `BiomeId`, `Biome`, `biomeIndex`, `biomeFromIndex` | Biome enum (`grassy_plains`, `deep_forest`, `snowy_mountains`), color/density params, index helpers |
| `Water.ts` | `Water` | Ocean plane + river ribbons. Custom shader materials with wind-driven animation. Downhill path generation for rivers, carves terrain channels. |
| `Vegetation.ts` | `Vegetation` | Instanced deciduous + pine trees scattered by biome density. Wind sway shader. Quality-tier instance count scaling. |
| `GrassField.ts` | `GrassField` | Dense instanced grass blades (22k). Wind sway + player push-away. BotW-saturated green-to-yellow tips. Quality-tier scaling. |
| `SkySystem.ts` | `SkySystem` | Day/night cycle (~10min). Three.js Sky object, directional sun light, fog color/density, dusk detection. |
| `CloudDome.ts` | `CloudDome` | Backface sphere with FBM cloud shader. Day/dusk/night coloring, quality-adaptive detail. |
| `WindSystem.ts` | `WindSystem` | Slowly meandering wind direction + speed. Drives vegetation sway, water ripple, cape flutter, campfire embers. |
| `PointsOfInterest.ts` | `PointsOfInterest`, `POI` | Spawns ruin/shrine/camp POIs with discovery orbs. Proximity-based discovery triggers journal entries. |
| `Campfires.ts` | `Campfires` | Campfire rings with point lights and additive ember particles (count scaled with world — see `Game.ts`). Wind-affected particle sim. |
| `Landmarks.ts` | `Landmarks` | Places a ruined castle on the mega-mountain. Stone/iron geometry, slope-optimized placement. |
| `WalkerMech.ts` | `WalkerTier`, `WalkerMech`, `WalkerLimbs`, `LegLimb`, `animateWalker` | Spider-tank quadruped Walker (Scout/Assault): ellipsoid dome hull, belly plate, armor collar, panel lines, bustle; sensor head (block, visor slit, sensor bumps) in rotatable Group; side-mounted weapon pylons; 4 legs as nested Group chains (hip ball → upper + panel + knee shroud → lower + panel + ankle → foot heel + 3 splayed toes). `animateWalker()` drives idle and diagonal-trot walk. **Piloting API**: `mount()` / `dismount()`, `moveUpdate(dt, fwd, right, sprint, terrain)` for heading-based steering with tier-tuned speed/accel/turn-rate, terrain clamping, walk-phase animation. `getHullTopPosition()` for TP camera anchor, `getMuzzleWorldPosition()` for future turret firing. |
| `WalkerMechs.ts` | `WalkerMechs` | Spawns dormant Walkers with seeded biome rules: Scouts in `grassy_plains` (one near player spawn), Assaults in forest/mountains biased near ruin POIs; `walkers` list for future interaction. |
| `noise.ts` | `makeNoise2D`, `fbm2`, `ridge2` | Deterministic simplex noise wrapper, FBM summation, ridge transform |

## render/

| File | Exports | Purpose |
|------|---------|---------|
| `PostFX.ts` | `PostFX` | EffectComposer pipeline: BotW toon ramp (2-band + warm shadow), saturated biome palette, god rays, warm-to-cool fog veil, subtle film grain. Biome ID render pass. Quality-adaptive. |
| `PostFX.ts` | `PostFX.tagBiome(mesh, idx)` | Static helper to tag meshes for biome grading |
| `RimLight.ts` | `applyRimLightToScene`, `applyRimLightToStandardMaterial` | Patches MeshStandardMaterial with wide warm golden rim (always-on, dusk-boosted). BotW-style character pop. |

## audio/

| File | Exports | Purpose |
|------|---------|---------|
| `AudioSystem.ts` | `AudioSystem` | Procedural ambient audio. Pink noise wind (mountain-scaled), white noise birds (forest-scaled), impulse footsteps (biome-tinted volume). Starts on first pointer interaction. |

## ui/

| File | Exports | Purpose |
|------|---------|---------|
| `HUD.ts` | `HUD` | Fixed overlay: health/stamina/XP bar stack (top-left), compass rose (top-center), crosshair (center, piloting only), Walker health bar (piloting only), interaction prompt (bottom-center). Halo/Destiny-style minimal HUD. |
| `Journal.ts` | `JournalUI` | Tab-toggled overlay: Warcraft/Witcher 3 ornate panel. Two-column layout with parchment map slot (left) and scrollable lore entries with gold-accent cards (right). |
| `WorldMap.ts` | `WorldMap`, `MapMarkerData` | 2D canvas parchment map. Layered rendering: base biome colors + water + contour lines, parchment fog-of-war with soft feathered edges, player arrow, POI markers (camp/ruin/shrine), Walker markers, compass rose, vignette border. |
| `PauseMenu.ts` | `PauseMenu`, `CharacterStats`, `WalkerStats`, `InventoryItem` | ESC-toggled pause overlay: Destiny/Halo–style angled shell (cyan accent rail, Barlow Condensed), left nav with Resume/Quit, right column with session header + scrollable character / Walker / inventory stats. |
