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
| `Game.ts` | `Game` | Thin orchestrator. Owns renderer, scene, camera, clock. Instantiates all systems in `seedScene()`, builds `GameContext`, delegates gameplay to active `GameState`. Manages environment updates, performance tiers, **ESC pause** (`paused` flag + `PauseMenu`; not a `MenuState` yet), post-FX. **Only `ExploringState` is registered**; `piloting` / `menu` IDs exist on `GameStateId` but have no state classes wired. |
| `Game.ts` | `.start()` | Begins the render loop |
| `Game.ts` | `.stop()` | Cancels render loop, disposes input |
| `Game.ts` | `.changeState(id)` | Exits current state, enters next state |
| `Game.ts` | `.seedScene()` | Instantiates terrain, water, vegetation, sky, clouds, wind, player, camera rig, POIs, campfires, landmarks, dormant Walkers, journal, HUD, world map, pause menu, audio, post-fx |
| `GameState.ts` | `GameState`, `GameStateId`, `GameContext` | State machine interface. States: `exploring`, `piloting`, `menu`. `GameContext` provides shared references (player, camera, terrain, HUD, etc.) that states can access. |
| `ExploringState.ts` | `ExploringState` | On-foot **first-person** exploration. FP camera yaw/pitch via `CameraRig`, player movement, compass to nearest POI, journal toggle, world map markers, rest at camps (hold E), **Walker activation** (hold E near dormant Walker → HUD ring → `WalkerMech.activate()`), **Walker mounting** (hold E near activated Walker → `requestStateChange('piloting')`). Optional dev fly toggle. |
| `PilotingState.ts` | `PilotingState` | **Walker piloting** state. Tank-style controls: W/S forward/back along walker facing, A/D rotate yaw. Tier-based speed/turn (scout 8 m/s, assault 6 m/s). Drives `animateWalker` walk cycle in-game. ChaseCam third-person orbit. Hold E 1.5s to dismount. Stomp shake forwarded to camera. |
| `ChaseCam.ts` | `ChaseCam` | **Third-person chase camera** for Walker piloting. Free orbit around target (Halo vehicle camera — yaw independent of walker facing). Tier-based distance (scout 12, assault 18). Heavy cinematic lerp follow. 1.5s smooth mount transition from FP to chase position. Stomp shake. FOV 72. |
| `Player.ts` | `Player` | First-person player controller. WASD, sprint/stamina, jump, crouch, slide, air control; Destiny-tuned speeds. **No visible mesh** (empty `Object3D` for position). Step/landing events for audio/camera. |
| `Player.ts` | `.update(dt, input, cameraYaw)` | Per-frame movement: accel/decel, terrain clamping, slope rejection, facing, step phase, calls animateKnight |
| `Player.ts` | `.setWind(dirXZ)` | Updates cape flutter wind direction |
| `KnightModel.ts` | `buildKnightModel()` | Procedural Dark Souls knight: medieval steel/leather/chainmail palette, overlapping half-sphere pauldrons with ridges, segmented greaves, pointed knee cops, leather cross-straps and pouches, brown cowl, barrel helmet with horizontal ridges and visor slit. Hierarchical limb groups for animation. |
| `KnightModel.ts` | `animateKnight(limbs, dt, speed, phase)` | Speed-blended procedural animation: idle sway, walk stride, run with weight. Legs/arms counter-swing, body bobs, head counters. |
| `Input.ts` | `Input`, `InputState` | Keyboard + mouse input. WASD, Shift sprint, E interact, Tab journal, Escape pause, pointer lock orbit. `consume()` returns and resets deltas. |
| `CameraRig.ts` | `CameraRig` | **Destiny / Helsby boxing-style FP rig.** Lowered aim point (~3.5° below center for peripheral vision), weighted sway bob (2.4 Hz walk, 2.8 Hz sprint, minimal amplitude), momentum lean (pitch into accel, roll into strafe), under-damped landing (overshoot → settle), idle breathing, sprint FOV, slide roll. Raw 1:1 mouse input — smoothness from animation weight, not filtering. |
| `CameraRig.ts` | `.addOrbitDelta(dx, dy)` | Applies raw mouse look (yaw/pitch, no smoothing) |
| `CameraRig.ts` | `.setMovementState(speed, max, sprint, slide, strafe)` | Feeds movement data for bob, lean, FOV, roll |
| `CameraRig.ts` | `.update(dt, targetPos)` | Updates camera position at player eye + all effect layers |
| `CameraRig.ts` | `.impulseFootstep(intensity)` | Subtle camera shake on player step |
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
| `Vegetation.ts` | `Vegetation` | Instanced trees (deciduous: clustered icosahedron canopy; pine: layered cones) scattered by biome density. 3-color leaf palette, subsurface scattering, diffuse+hemisphere lighting, golden rim, height gradient, bark detail, leaf flutter + trunk sway. Casts and receives shadows. Quality-tier instance count scaling. |
| `GrassField.ts` | `GrassField` | Dense instanced grass blades (22k). Wind sway + player push-away. BotW-saturated green-to-yellow tips. Quality-tier scaling. |
| `SkySystem.ts` | `SkySystem` | Day/night cycle (~10min). Three.js Sky object, directional sun light, fog color/density, dusk detection. |
| `CloudDome.ts` | `CloudDome` | Backface sphere with FBM cloud shader. Day/dusk/night coloring, quality-adaptive detail. |
| `WindSystem.ts` | `WindSystem` | Slowly meandering wind direction + speed. Drives vegetation sway, water ripple, cape flutter, campfire embers. |
| `PointsOfInterest.ts` | `PointsOfInterest`, `POI` | Spawns ruin/shrine/camp POIs with discovery orbs. Proximity-based discovery triggers journal entries. |
| `Campfires.ts` | `Campfires` | Campfire rings with point lights and additive ember particles (count scaled with world — see `Game.ts`). Wind-affected particle sim. |
| `Landmarks.ts` | `Landmarks` | Places a ruined castle on the mega-mountain. Stone/iron geometry, slope-optimized placement. |
| `WalkerMech.ts` | `WalkerTier`, `WalkerMech`, `WalkerLimbs`, `LegLimb`, `animateWalker` | Spider-tank quadruped Walker (Scout/Assault). Vex-inspired materials (radiolaria glow, cyclops eye). `setDormant(bool)` controls crouched/standing pose + material emissive states. `animateWalker()` drives idle and diagonal-trot walk. |
| `WalkerMechs.ts` | `WalkerMechs` | Spawns dormant Walkers with seeded biome rules. All start in dormant pose. |
| `WalkerActivationCinematic.ts` | `WalkerActivationCinematic` | 6-second choreographed walker awakening: "The Hush" (world quiets) → "First Light" (radiolaria pulses) → "The Eye" (cyclops flickers on, sacred tone) → "Rising" (walker stands from dormant crouch). All audio procedural via Web Audio API. |
| `noise.ts` | `makeNoise2D`, `fbm2`, `ridge2` | Deterministic simplex noise wrapper, FBM summation, ridge transform |

## render/

| File | Exports | Purpose |
|------|---------|---------|
| `PostFX.ts` | `PostFX` | EffectComposer pipeline: **Destiny-style warm/cool color grade** (cool blue-violet shadows, warm golden highlights, time-of-day driven), saturated biome palette, god rays, warm-to-cool height fog veil, **atmospheric perspective** (depth-based desaturation + blue shift), **depth of field** (subtle gameplay bokeh, quality-adaptive), **eye adaptation** (auto-exposure driven by scene luminance), bloom, film grain, chromatic aberration, vignette. Biome ID render pass. Quality-adaptive. |
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
