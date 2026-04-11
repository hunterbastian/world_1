# Glasswake — Task Plan

## Implementation status (living)

See **[docs/roadmap-status.md](./docs/roadmap-status.md)** for the full theme-by-theme table (done / partial / not started) and file pointers.

**MVP step markers** are inlined in [mvp-plan.md](./mvp-plan.md). **Game state diagram** → [docs/game-state-transitions.md](./docs/game-state-transitions.md). **Graphics research** → [docs/graphics-research.md](./docs/graphics-research.md).

---

## Completed: Destiny visual stack + exploration baseline

### Phase 0 — Terrain & content at 1500×1500 (MVP Steps 1–4)

- [x] Terrain size 700 → 1500, segments 224 → 350
- [x] Vegetation / grass / POIs / campfires / rivers / fog tuned for scale
- [x] Walker scatter density
- [x] Dormant Walkers in world; procedural model + idle animation
- [x] Activation: hold E fills ring; `activate()` fires + audio

### Phase 0.5 — Destiny aesthetic pass (pre-gameplay)

- [x] Camera feel — boxing-style weight, lowered aim point, momentum lean, weighted bob
- [x] Warm/cool color grading — cool blue-violet shadows, warm golden highlights, ToD-driven
- [x] Atmospheric perspective — depth desaturation + blue shift for vast horizon
- [x] Depth of field — subtle gameplay DOF, quality-adaptive
- [x] Eye adaptation — auto-exposure from scene luminance
- [x] Tree aesthetics — clustered canopy, 3-color palette, SSS, rim light, leaf flutter
- [x] Tree shadows — castShadow + receiveShadow enabled
- [x] HUD rework — Destiny curved arc HP/STA bars, compass strip, clean prompts

---

## Next: Phase 1 — Ambient particles (last visual item)

One more visual pass before gameplay:

- [ ] **Biome particles** — instanced quads: pollen/dust in grasslands, snow in mountains, fireflies at dusk/night, leaves in forests. Wind-driven, camera-relative spawn. Quality-adaptive count.

---

## Next: Phase 2 — Piloting loop (MVP Steps 5–6)

The biggest gameplay gap. Activation dead-ends — nothing happens after `activate()`.

Primary files: `PilotingState.ts` (new), `CameraRig.ts`, `Game.ts`, `ExploringState.ts`, `WalkerMech.ts`, `HUD.ts`

- [ ] `PilotingState` class — owns Walker movement, camera, and input
- [ ] Chase camera mode in `CameraRig` — third-person pulled back, orbit behind Walker
- [ ] Mount transition — `ExploringState` calls `requestStateChange('piloting')` after activation
- [ ] Walker movement — WASD drives the Walker with heavier physics (wider turn, more inertia)
- [ ] Dismount — press E to exit Walker, return to `ExploringState`
- [ ] `animateWalker` walk cycle driven in-game (currently only used in viewer)
- [ ] Turret aiming — mouse rotates turret head, crosshair shown
- [ ] Projectile — click fires a glowing sphere, travels forward, despawns on hit/timeout
- [ ] Auto-aim assist — snaps toward nearest enemy within range
- [ ] MECH bar driven by Walker health when piloting

---

## Next: Phase 3 — Combat loop (MVP Steps 7 + 9)

Primary files: `EnemySystem.ts` (new), `Game.ts`, `Player.ts`, `WalkerMech.ts`

- [ ] Void creature procedural model — dark, inky, organic
- [ ] Spawn system — enemies appear after Walker activated, proximity-based
- [ ] Basic AI — move toward player, melee attack on contact
- [ ] Health system — player HP, Walker HP, damage intake
- [ ] Death — Walker destroyed → player ejected; player killed → respawn at camp
- [ ] XP drops — enemies drop XP orbs on death

---

## Next: Phase 4 — Progression (MVP Steps 8, 10, 11)

- [ ] XP accumulation from kills → HUD XP arc fills
- [ ] Camp level-up — hold E at camp to spend XP on stats
- [ ] Pause menu wired to live stats + Restart button
- [ ] Resource pickups (power cells) scattered in world
- [ ] Assault Walker requires power cells to activate

---

## Later: Phase 5 — Polish + terrain evolution

- [ ] Combat VFX, hit feedback, audio
- [ ] World map overlays for Walker/enemy positions
- [ ] Voxel terrain hybrid — marching cubes in POI zones (caves, overhangs)
- [ ] Full voxel terrain — replace heightmap if hybrid proves out
- [ ] `architecture.md` + GDD sync after major systems land

---

## Error Log

_(none yet)_

## Decisions

- Terrain segments 350 (not 480) to balance detail vs performance at 1500 scale
- ~4.6x area increase; content scaled ~3–4x (slightly below linear to keep performance)
- Fog density reduced so distant mountains stay readable
- On-foot exploration is **first-person**; **third-person** reserved for **Walker piloting** (planned)
- Destiny visual quality is the target — voxels are a data structure, not a visual style
- Visual stack completed before gameplay to establish the look everything builds on
