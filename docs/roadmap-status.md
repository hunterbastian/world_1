# Glasswake — implementation status

Snapshot of how far the repo matches [mvp-plan.md](../mvp-plan.md). Re-check after major merges.

**Last audited:** 2026-04-10

## MVP step-by-step status

| MVP Step | Theme | Status | What works | What's missing |
|----------|-------|--------|------------|----------------|
| 1 | Spawn + grasslands bias | **Done** | `findFlatSpawn` strict `grassy_plains` pass, slope caps, sea check | Needs playtest verification across seeds |
| 2 | Biome tuning + knight | **Done** | 1500×1500 terrain, 3 biomes, `KnightModel` procedural mesh (viewer + future TP) | Knight not visible in-game (FP, by design) |
| 3 | Game state machine | **Partial** | `GameState`/`GameContext` interface, `ExploringState` registered and working | Only `exploring` registered; `piloting`/`menu` are type stubs only; pause is a flag, not a `MenuState` |
| 4 | Walker models + placement | **Done** | Procedural `WalkerMech` (Scout + Assault), `WalkerMechs` places with biome rules, Scout near spawn | — |
| 5 | Walker activation + mounting | **Partial** | Hold E fills HUD ring → `activate()` fires + audio | **No mounting**, no `PilotingState`, no dismount, no camera transition, no Walker movement control |
| 6 | Turret + auto-aim | **Not started** | Turret geometry on model | No firing, no projectiles, no aiming, no crosshair path in gameplay |
| 7 | Void creature enemies | **Not started** | — | No `EnemySystem`, no enemy models, no spawn logic, no AI |
| 8 | XP + leveling at camps | **Not started** | HUD XP bar element exists; `setXP(0)` at startup | No kill→XP pipeline, no leveling UI, no stat upgrades |
| 9 | Health + damage | **Not started** | HUD HP bar element exists; `setHealth(1.0)` at startup | No damage on Player or Walker, no death/respawn, no eject |
| 10 | ESC menu | **Partial** | ESC toggles overlay; Resume + Quit (full reload) | **No Restart**; `setCharacterStats`/`setWalkerStats`/`setInventory` APIs exist but are **never called** — stats are hard-coded defaults |
| 11 | Resource pickups + tier gates | **Not started** | Two Walker tiers exist visually | No pickups, no inventory, Assault activation not resource-gated |
| 12 | Polish pass | **Not started** | — | Deferred until core loop works |

## System-level audit

| System | Reality |
|--------|---------|
| State machine | `exploring` only; `requestStateChange` exists but is never called from gameplay |
| Player movement | Full: WASD, sprint, jump, crouch, slide, stamina, terrain clamping |
| Player health | **None** — no HP field, no damage intake, no death |
| Camera | **FP only** — `CameraRig` has no third-person / chase mode |
| HUD bars | Stamina is **live** (driven each frame); HP and XP are **static** (set once at init) |
| Walker health bar | `setWalkerHealth` API exists in HUD but **never called** from any game code |
| Walker in-game animation | `update()` runs idle stomp only; the full `animateWalker` (walk/trot) is used in viewer, not in-game |
| Turret | Geometry only; no combat code path |
| Pause menu stats | Layout and setter APIs ready; **Game never populates** them with live data |

## Primary files

| File | Role |
|------|------|
| `Game.ts` | Orchestrator, state registration, pause flag, render loop |
| `GameState.ts` | State interface + `GameContext` |
| `ExploringState.ts` | On-foot: movement, camera, camp rest, Walker activation UX |
| `Player.ts` | Movement controller (no health/XP) |
| `CameraRig.ts` | FP camera rig |
| `HUD.ts` | Overlay bars + compass + prompts |
| `PauseMenu.ts` | ESC overlay |
| `WalkerMech.ts` | Procedural model + activate flag + idle stomp |
| `WalkerMechs.ts` | Seeded world placement |

See [game-state-transitions.md](./game-state-transitions.md) for planned `exploring` / `piloting` / `menu` behavior.
