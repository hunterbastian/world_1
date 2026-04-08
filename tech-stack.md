# World_1 — Tech Stack

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
| `postprocessing` | God rays, fog, bloom, tone mapping |

## Architecture Style

- **Vanilla Three.js** — no React/R3F wrapper. Direct scene graph manipulation.
- **Class-based systems** — each major system is a class (Terrain, Water, Player, SkySystem, etc.).
- **Game class as orchestrator** — `Game.ts` owns the render loop, instantiates all systems, wires them together.
- **No ECS (yet)** — simple enough that classes + direct references work. May revisit if entity count grows significantly with enemies/items.

## Project Structure

```
src/
  main.ts              — Entry point, creates canvas + Game
  game/                — Core game logic
    Game.ts            — Main orchestrator, render loop
    Player.ts          — Player controller, movement, stamina
    Input.ts           — Keyboard/mouse input
    CameraRig.ts       — Third-person camera
    PerformanceManager.ts — Adaptive quality tiers
  world/               — World generation and environment
    Terrain.ts         — Procedural heightfield terrain
    Biomes.ts          — Biome classification
    Water.ts           — Sea and rivers
    Vegetation.ts      — Trees, grass, bushes
    SkySystem.ts       — Day/night cycle, sun, ambient
    CloudDome.ts       — Volumetric cloud layer
    WindSystem.ts      — Wind direction and strength
    PointsOfInterest.ts — POI placement and discovery
    Campfires.ts       — Camp rest points
    Landmarks.ts       — Landmark generation
    noise.ts           — Noise utility wrappers
  render/              — Rendering and post-processing
    PostFX.ts          — Post-processing pipeline
    RimLight.ts        — Rim/back lighting effect
  audio/               — Sound
    AudioSystem.ts     — Spatial audio, ambient
  ui/                  — 2D overlays
    HUD.ts             — Stamina, compass, prompts
    Journal.ts         — Lore journal + world map
    WorldMap.ts        — Fog-of-war minimap
```

## Browser Target

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge).
- WebGL 2 required.
- Mobile not targeted yet.

## Future Tech Considerations

| Feature | Likely Approach |
|---------|----------------|
| Multiplayer | WebSocket server (Node.js) + client prediction. Evaluate Colyseus, socket.io, or custom. |
| Physics | Rapier.js (WASM) if needed for Walker locomotion or ragdoll. Currently terrain-only collision. |
| State Management | May need a lightweight state machine for player states (on-foot, mounting, piloting, combat, menu). |
| Asset Pipeline | GLTF models for Walkers, enemies, props. Blender → glTF export. |
| Level Streaming | Chunk-based terrain loading if world expands beyond 700×700. |
