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
| `Game.ts` | `Game` | Thin orchestrator. Owns renderer, scene, camera, clock. Instantiates all systems in `seedScene()`, builds `GameContext`, delegates gameplay to active `GameState`. **`mountWalker` / `dismountWalker` / `getMountedWalker`** on context. Manages environment updates, performance tiers, **ESC pause** (`paused` + `PauseMenu`; not `MenuState`), post-FX. Registers **`ExploringState`** + **`PilotingState`**; `menu` ID still unused. |
| `Game.ts` | `.start()` | Begins the render loop |
| `Game.ts` | `.stop()` | Cancels render loop, disposes input |
| `Game.ts` | `.changeState(id)` | Exits current state, enters next state |
| `Game.ts` | `.seedScene()` | Instantiates terrain, water, vegetation, sky, clouds, wind, player, camera rig, POIs, campfires, landmarks, dormant Walkers, journal, HUD, world map, pause menu, audio, post-fx |
| `GameState.ts` | `GameState`, `GameStateId`, `GameContext` | State machine interface. States: `exploring`, `piloting`, `menu`. `GameContext` includes **`mountWalker`**, **`getMountedWalker`**, **`dismountWalker`**. |
| `ExploringState.ts` | `ExploringState` | On-foot **first-person** exploration. FP camera via `CameraRig`, player movement, compass, journal, world map, rest at camps (hold E), **Walker**: hold E near dormant or **remount** activated (shorter hold) → **`mountWalker`**. Optional dev fly toggle. |
| `PilotingState.ts` | `PilotingState` | **Third-person chase** via `CameraRig.setThirdPersonChase`. WASD moves Walker on terrain; mouse orbits camera; Shift sprint. Hold E to dismount (ring). HUD crosshair + MECH bar placeholder. |
| `Player.ts` | `Player` | First-person player controller when exploring. WASD, sprint/stamina, jump, crouch, slide, air control; Destiny-tuned speeds. **No visible mesh** (empty `Object3D` for position). Step/landing events for audio/camera. |
| `Player.ts` | `.update(dt, input, cameraYaw)` | Per-frame movement: accel/decel, terrain clamping, slope rejection, facing from camera yaw. |
| `Player.ts` | `.setWind(dirXZ)` | Reserved for future cape/flutter hooks. |
| `KnightModel.ts` | `buildKnightModel()` | BotW-style wanderer: matte tunic/leather/cloth palette, puffy sleeves, leather bracers, exposed skin, styled hair, cowl, flowing cape + scarf. Slightly larger head (1.08x) for stylized read. Hierarchical limb groups for animation. |
| `KnightModel.ts` | `animateKnight(limbs, dt, speed, phase)` | Speed-blended procedural animation: idle sway, walk stride, run with weight. Legs/arms counter-swing, body bobs, head counters. |
| `Input.ts` | `Input`, `InputState` | Keyboard + mouse input. WASD, Shift sprint, E interact, Tab journal, Escape pause, pointer lock orbit. `consume()` returns and resets deltas. |
| `CameraRig.ts` | `CameraRig` | **Modes:** `firstPerson` (default) and `thirdPersonChase` (offset camera, look-at anchor). FP: eye height spring, bob, landing dip, sprint FOV, slide roll, shake. TP: distance/height from `setThirdPersonChase`, pitch clamped for over-shoulder feel. |
| `CameraRig.ts` | `.setFirstPerson()` / `.setThirdPersonChase(opts?)` | Switch rig mode |
| `CameraRig.ts` | `.addOrbitDelta(dx, dy)` | Mouse look (yaw; pitch limits depend on mode) |
| `CameraRig.ts` | `.update(dt, targetPos)` | FP: eye at `targetPos` + bob. TP: orbit behind anchor at `targetPos` |
| `CameraRig.ts` | `.impulseFootstep(intensity)` | Triggers camera shake on player step |
| `PerformanceManager.ts` | `PerformanceManager`, `QualityTier` | Adaptive quality tiers (high/medium/low) via EMA frame time with hysteresis and cooldown. |

## world/

| File | Exports | Purpose |
|------|---------|---------|
| `Terrain.ts` | `Terrain` | Procedural heightfield (e.g. **1500×1500**, 350 segments in `Game.ts`). FBM + ridge noise, mega-mountain with spiral carved passes. Biome assignment per vertex. |
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
| `WalkerMech.ts` | `WalkerTier`, `WalkerMech`, `WalkerLimbs`, `LegLimb`, `animateWalker` | Spider-tank quadruped Walker (Scout/Assault). **`mounted`** + **`setPilotMotion`**: when mounted, `update()` runs walk animation from speed; when dormant, idle stomp detection + **`animateWalker(..., 0, 0)`** for idle pose. **`pilotCameraAnchorY()`** for chase look-at height. |
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
| `PauseMenu.ts` | `PauseMenu`, `CharacterStats`, `WalkerStats`, `InventoryItem` | ESC-toggled pause overlay: Warcraft-style gold-trimmed panel with character stats, Walker stats (if active), inventory list, Resume/Quit buttons. |
