# Glasswake

First-person exploration + mech-piloting game. Three.js, TypeScript, Vite. Aesthetic: Destiny × Studio Ghibli — sci-fi grandeur with organic warmth. You explore an alien world alone. Something happened here.

## Tech Stack

- TypeScript (strict), Three.js r183, Vite 8, npm
- Dependencies: `three`, `three-stdlib`, `simplex-noise`, `postprocessing`
- No React/R3F — vanilla Three.js scene graph manipulation
- No ECS — class-based systems with direct references

## Build & Run

```bash
cd ~/Desktop/Projects/Code/games/active/glasswake
npm run dev          # Dev server (index.html)
npm run dev:viewer   # Dev server (viewer.html model viewer)
npm run build        # tsc + vite build
npm run preview      # Preview production build
```

Viewer at `/viewer.html` — orbit studio for inspecting procedural models + animations.

## Architecture

```
src/
  main.ts                  Entry point — creates canvas, instantiates Game
  game/
    Game.ts                Orchestrator: renderer, scene, camera, clock, render loop, seedScene()
    GameState.ts           State machine interface (GameStateId: exploring | piloting | menu)
    ExploringState.ts      First-person on-foot: movement, journal, map, Walker activation
    PilotingState.ts       Third-person Walker piloting: movement, firing, dismount
    MenuState.ts           Menu state (exists but not fully wired)
    Player.ts              FP controller: Destiny-tuned speeds, sprint/slide/crouch/jump
    Input.ts               Keyboard + mouse: WASD, Shift, E, Tab, Space, C/Ctrl
    CameraRig.ts           Dual-mode: FP eye-level + TP chase cam (spring-smoothed)
    PerformanceManager.ts  Adaptive quality tiers (high/medium/low) via EMA frame time
    ActivationCinematic.ts 6s Walker activation cinematic (orbit, bloom spike, dust)
    ProjectileSystem.ts    Pooled projectile system (50 projectiles, point lights)
  world/
    Terrain.ts             Procedural heightfield: FBM + ridge noise, 1500×1500, 350 segments
    Biomes.ts              BiomeId enum: grassy_plains, deep_forest, snowy_mountains
    Water.ts               Ocean plane + river ribbons, custom shader, wind-driven
    Vegetation.ts          Instanced deciduous + pine, wind sway shader
    GrassField.ts          55k instanced blades, wind + player push-away
    SkySystem.ts           Day/night cycle (~10min), starts at golden hour (timeOfDay=0.72)
    CloudDome.ts           FBM cloud shader on backface sphere
    WindSystem.ts          Meandering wind dir/speed — drives all vegetation, water, cape
    PointsOfInterest.ts    POI spawning + discovery orbs → journal entries
    Campfires.ts           Rest points with ember particles
    Landmarks.ts           Ruined castle on mega-mountain
    WalkerMech.ts          Quadruped walker: model, animation, mount/dismount, piloting API
    WalkerMechs.ts         Walker spawning with biome rules (Scouts in plains, Assaults in forest)
    WalkerMechModel.ts     Procedural geometry: hull, legs, sensor head, weapon pylons
    WalkerMechAnimation.ts Idle + diagonal-trot walk animation
    noise.ts               Simplex noise wrapper: makeNoise2D, fbm2, ridge2
  render/
    PostFX.ts              EffectComposer pipeline: ToonRamp, BiomePalette, SSAO, bloom, fog
    TerrainShader.ts       Terrain material with biome color blending
    RimLight.ts            Golden rim light via onBeforeCompile injection
    OutlineShell.ts        Backface expansion outline shader
  audio/
    AudioSystem.ts         Procedural ambient: pink noise wind, white noise birds
  ui/
    HUD.ts                 Health/stamina bars, compass, SVG sci-fi reticle, Walker health
    Journal.ts             Tab-toggled lore overlay (Warcraft/Witcher ornate style)
    WorldMap.ts            2D canvas parchment map with fog-of-war, POI/Walker markers
    TitleScreen.ts         "GLASSWAKE" title over live world, cinematic orbit at golden hour
    PauseMenu.ts           Frutiger Aero / Mirror's Edge style frosted panel
  viewer/
    modelViewer.ts         Orbit studio: key/fill/rim + shadows, WASD roam
    KnightModel.ts         Procedural Dark Souls knight (for viewer/legacy only)
```

## Key Design Decisions

- **First-person on foot, third-person when piloting** — Halo vehicle style. CameraRig switches modes via setMode('fp'|'tp').
- **Walker mechs are functional tools, not companions** — no autonomous behavior, no personality. Activate → stand → wait for input.
- **Walker tiers**: Scout (fast, light, plains) and Assault (heavy, armed, forest/mountains). More tiers deferred until post-MVP.
- **Walker naming**: Greek mythology × Viking (Argos, Tyr, Fenrir, etc.)
- **Game UI direction**: Frutiger Aero whites + Mirror's Edge clean panels. NOT ornate gold/medieval chrome.
- **Walker materials**: aluminum/silver + dark grey + translucent glassy panels with dim glow. No visible eyes.
- **World is 1500×1500** — camera far plane 2000, ocean 6000×6000, fog density 0.00014.
- **logarithmicDepthBuffer** on WebGLRenderer for stable depth at 1500m scale.
- **Procedural everything** — no external 3D assets. All models from Three.js primitives.
- **Title screen** shows live world at golden hour with cinematic camera drift. Gameplay frozen until dismiss.
- **Terrain shader** uses smooth biome color blending via continuous weights (mountainMask × basinFalloff, forestMask, elevation).

## Debugging Lessons

- **Spawn trap bug**: Player can spawn between mountains. Fix: `Terrain.findFlatSpawn` with strict grasslands bias + slope caps. Always test 5+ reloads.
- **World scale cascades**: Changing terrain size requires updating vegetation counts, grass count, POI count, fog density, and camera far plane. See `findings.md` for ratios.
- **Fog density is manual per scale**: exponential fog (FogExp2) — density needs hand-tuning when world size changes.
- **Shader onBeforeCompile**: Terrain material and RimLight use `onBeforeCompile` injection. Changes to these require careful GLSL string replacement — fragile if the Three.js shader template changes between versions.
- **Grass performance**: 55k instances is the biggest GPU budget item. Quality tier scaling exists in PerformanceManager.
- **IBL refresh**: PMREMGenerator environment map refreshes every 30s for day/night. Don't set it too frequent — expensive.
- **PostFX pipeline order matters**: RenderPass → NormalPass → SSAO → ToonRamp → BiomePalette → GodRays → HeightFog → Bloom → ChromaticAberration → Vignette → FilmGrain.
- **Vite multi-page**: Two entry points (index.html + viewer.html). Both in vite.config.ts rollupOptions.input.
- **Walker activation flow**: hold E → HUD ring → WalkerMech.activate() → ActivationCinematic (6s) → onComplete → PilotingState. The cinematic locks camera and input during playback.

## Known Pitfalls

- **No swamp biome** — explicitly excluded from world design.
- **Don't add crafting/quest systems** — explicitly out of scope per AGENTS.md.
- **One step per chat session** when following the MVP plan. Test manually after each step.
- **Walker mechs have no eyes** — material choice matters for alien tech feel.
- **Player has no visible mesh in FP** — empty Object3D for position. KnightModel is viewer-only.
- **Don't use MenuState for pause** — pause uses a `paused` flag + PauseMenu overlay, not the menu GameState.
- **Terrain is heightfield, not marching cubes yet** — voxel terrain is a future direction.
- **Keep architecture.md updated** after any structural changes.

## Conventions

- Class-based systems: each system is a class, `Game.ts` wires them in `seedScene()`.
- `GameContext` provides shared references to states (player, camera, terrain, HUD, walkers, etc.).
- State machine: `GameState` interface with enter/exit/update. States: exploring, piloting.
- Scatter systems use `terrain.size * 0.5` for half-extent — auto-adapts to size changes.
- All world systems read `terrain.size` dynamically — no hardcoded values.
- Commit often. Run `tsc --noEmit` before committing.

## Docs

- `game-design-document.md` — what the game is
- `tech-stack.md` — what it's built with
- `architecture.md` — one-liner per file and function
- `mvp-plan.md` — MVP steps (one per chat session)
- `findings.md` — world scale data and performance notes
- `progress.md` — session-by-session changelog
- `references/` — imagery for Walkers, environments, UI
