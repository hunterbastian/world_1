# Glasswake — Tech Stack

## Runtime

| Layer | Choice | Why |
|-------|--------|-----|
| Language | TypeScript (strict) | Type safety, IDE support, refactor confidence |
| 3D Engine | Three.js r183 | Already in use, performant, huge ecosystem |
| Bundler | Vite 8 | Fast HMR, native ESM, zero-config TS |
| Package Manager | npm | Already in use |

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `three` | 3D rendering, scene graph, materials, lights |
| `three-stdlib` | Utility loaders and helpers (GLTFLoader, etc.) |
| `simplex-noise` | Procedural terrain and biome generation |
| `postprocessing` | SSAO, bloom, god rays, vignette, chromatic aberration, film grain |

## Architecture Style

- **Vanilla Three.js** — no React/R3F wrapper. Direct scene graph manipulation.
- **Class-based systems** — each major system is a class (Terrain, Water, Player, SkySystem, etc.).
- **Game class as orchestrator** — `Game.ts` owns the render loop, instantiates all systems, wires them together.
- **State machine** — `GameState` interface with `ExploringState` (on foot) and `PilotingState` (in Walker). Game delegates update/input to the active state.
- **No ECS (yet)** — simple enough that classes + direct references work. May revisit if entity count grows for MMO.

## Rendering Pipeline

| Pass | What |
|------|------|
| RenderPass | Main scene with PBR materials, shadows, IBL |
| NormalPass | Screen-space normals for SSAO |
| SSAO | HBAO-style ambient occlusion (postprocessing SSAOEffect) |
| Color + Atmosphere | ToonRamp, BiomePalette, GodRays, HeightFog, Bloom |
| Final Polish | ChromaticAberration, Vignette, FilmGrain |

Additional rendering features:
- PCFSoftShadowMap with shadow focus following player
- IBL via PMREMGenerator (refreshed every 30s for day/night)
- Procedural GPU sky dome (gradient, sin/cos clouds, hash stars, smoothstep sun/moon)
- Rim/back lighting via onBeforeCompile injection

## Project Structure

```
src/
  main.ts              — Entry point, creates canvas + Game
  game/                — Core game logic
    Game.ts            — Main orchestrator, render loop
    GameState.ts       — State machine interface
    ExploringState.ts  — On-foot gameplay state
    PilotingState.ts   — Walker piloting gameplay state
    Player.ts          — Player controller, FP movement, Destiny-feel
    Input.ts           — Keyboard/mouse input
    CameraRig.ts       — First-person camera (on foot)
    ChaseCam.ts        — Third-person camera (piloting Walker)
    PerformanceManager.ts — Adaptive quality tiers
  world/               — World generation and environment
    Terrain.ts         — Procedural terrain (heightmap now, voxel later)
    Biomes.ts          — Biome classification
    Water.ts           — Sea and rivers
    Vegetation.ts      — Trees, grass, bushes (instanced)
    GrassField.ts      — Dense grass blades (instanced, wind-reactive)
    SkySystem.ts       — Procedural sky dome, sun/moon, day/night, shadows
    CloudDome.ts       — (merged into SkySystem procedural sky)
    WindSystem.ts      — Wind direction and strength
    PointsOfInterest.ts — POI placement and discovery
    Campfires.ts       — Camp rest points
    Landmarks.ts       — Landmark generation
    WalkerMech.ts      — Single Walker model, animation, activation
    WalkerMechs.ts     — Walker spawning and management
    noise.ts           — Noise utility wrappers
  render/              — Rendering and post-processing
    PostFX.ts          — Post-processing pipeline (SSAO, bloom, fog, etc.)
    RimLight.ts        — Rim/back lighting effect
  audio/               — Sound
    AudioSystem.ts     — Spatial audio, ambient
  ui/                  — 2D overlays
    HUD.ts             — Health, stamina, compass, XP
    Journal.ts         — Lore journal + world map
    WorldMap.ts        — Fog-of-war minimap
    PauseMenu.ts       — ESC menu with stats overlay
```

## Browser Target

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge).
- WebGL 2 required (WebGPU migration is a future consideration).
- Mobile not targeted yet.

## Future Tech Considerations

| Feature | Likely Approach |
|---------|----------------|
| Voxel Terrain | Marching cubes mesher (TypeScript first, Rust/WASM if perf requires). Chunked 3D density field. |
| Terrain LOD | Distant Horizons-style multi-level LOD per chunk. Web Worker generation. |
| WebGPU | Migrate renderer + TSL materials when postprocessing lib supports it. |
| Multiplayer / MMO | WebSocket server (Node.js or Rust) + client prediction. Chunked terrain doubles as network relevance grid. |
| Physics | Rapier.js (WASM) if needed for Walker locomotion or ragdoll. Currently terrain-only collision. |
| Asset Pipeline | Procedural geometry (AI-generated from Three.js primitives). No Blender. |
