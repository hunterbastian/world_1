# Glasswake — implementation status

Snapshot of how far the repo matches [mvp-plan.md](../mvp-plan.md). Re-check after major merges.

| Theme | Status | Notes | Primary files |
|--------|--------|--------|----------------|
| Spawn + grasslands bias | **Done (verify)** | `findFlatSpawn` uses strict `grassy_plains` pass, slope caps, sea check | `Terrain.ts`, `Game.ts` |
| On-foot exploration + camera | **Done** | First-person; Destiny-tuned movement; no visible body on `Player` | `Player.ts`, `CameraRig.ts`, `ExploringState.ts` |
| Game state machine | **Partial** | `GameState` / `GameContext` exist; only `ExploringState` registered. `piloting` / `menu` IDs unused for transitions | `Game.ts`, `GameState.ts`, `ExploringState.ts` |
| Walker models + world placement | **Done** | `WalkerMechs` places Scouts + Assaults; procedural `WalkerMech` | `WalkerMechs.ts`, `WalkerMech.ts` |
| Walker activation | **Done** | Hold E activates; **mount** switches to `PilotingState`. Remount activated Walkers with shorter hold. No resource gate for Assault yet | `ExploringState.ts`, `WalkerMech.ts`, `Game.ts` |
| Piloting + turret | **Partial** | Chase camera + WASD Walker move + dismount; **no turret** yet | `PilotingState.ts`, `CameraRig.ts`, MVP Step 6 |
| Enemies + XP progression | **Not started** | HUD has HP/STA/XP bars; `setXP(0)` only; no kills or leveling | `HUD.ts`, `Game.ts` |
| Health + damage | **Not started** | HP bar static at full | MVP Step 9 |
| Pause / ESC menu | **Partial** | ESC toggles overlay; Resume/Quit; placeholder stats UI. No `MenuState`; no Restart | `Game.ts`, `PauseMenu.ts` |
| Resource pickups + tier gates | **Not started** | — | MVP Step 11 |
| World scale 1500 + content | **Done (playtest pending)** | Terrain1500×1500; Phase 1 checkboxes in task_plan | `Game.ts`, `task_plan.md` |

See [game-state-transitions.md](./game-state-transitions.md) for planned `exploring` / `piloting` / `menu` behavior.
