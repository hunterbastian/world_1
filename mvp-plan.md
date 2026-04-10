# Glasswake — MVP Implementation Plan

Goal: Player can spawn, explore on foot, find an abandoned Walker Mech, activate it, pilot it, fight basic enemies, and level up at a camp. ESC menu with character/mech overview and quit/restart.

Each step should be tested manually before moving to the next. New chat for each step.

**Repo status snapshot:** see [docs/roadmap-status.md](./docs/roadmap-status.md) for a living table. Inline markers below are a point-in-time summary.

---

## Step 1 — Fix spawn + grasslands bias

**Repo status:** Done (verify in playtest) — `Terrain.findFlatSpawn` strict grasslands pass + slope caps.

**What:** Player always spawns in flat grasslands, never trapped in mountains. Increase `findFlatSpawn` grasslands bias and lower max acceptable slope.

**Test:** Reload 5+ times. Player should always start in open grass with room to walk.

---

## Step 2 — Biome tuning + procedural knight character

**Repo status:** Partial —1500 world + biomes in place; on-foot is **first-person** with no visible body (`Player` empty group). `KnightModel` remains for `viewer.html` / future TP or reflections.

**What:** Finalize biome visuals (grasslands, forests, mountains). Build a procedural **Halo/Destiny-inspired** armored explorer from Three.js primitives to replace the capsule placeholder — helmet silhouette, light plating, cloth or tech-fabric read, optional weapon stow on back. Attach to Player.ts **if** a visible on-foot or third-person mode returns; otherwise treat as optional for piloting cutaways / menu.

**Test:** World reads as Ghibli grasslands → forests → snowy mountains with mythic sci-fi ruins. If a body is attached: reads as **sci-fi wanderer** at exploration camera distance (FP shadow/audio only is acceptable until piloting ships).

---

## Step 3 — Game state machine + Game.ts refactor

**Repo status:** Partial — `GameState.ts` + `ExploringState` exist; `Game.ts` delegates exploration. **`piloting` / `menu` states not registered.** Pause uses a `paused` flag, not `MenuState`.

**What:** Extract tangled logic from Game.ts into a clean state machine. Create `src/game/GameState.ts` with states: `exploring` (on foot), `piloting` (in Walker), `menu` (ESC pause). Each state owns its own update/input logic. Extract rest mechanic, compass, and spawn intro into their own concerns. Game.ts becomes a thin orchestrator that delegates to the active state. This prevents spaghetti as we add Walkers, enemies, health, and menus.

**Test:** Game plays identically to before — movement, rest at camps, journal, compass all still work. No new features, just clean architecture.

---

## Step 4 — Walker Mech model + world placement

**Repo status:** Done — `WalkerMech` + `WalkerMechs`; Scouts + Assaults placed with biome rules.

**What:** Create a `WalkerMech` class (`src/world/WalkerMech.ts`). Procedural quadruped geometry (spider-horse, ~5x player height, all AI-generated from Three.js primitives). Place 3-5 dormant Walkers in the world (1 easy near spawn, others in ruins/mountains). Walkers are visible but inactive (slightly glowing idle state). Turret geometry included on every Walker.

**Test:** Walk around, visually confirm Walkers exist at varied locations. First one should be close to spawn.

---

## Step 5 — Walker activation + mounting

**Repo status:** **Done (no turret)** — `PilotingState`, third-person chase `CameraRig`, hold E dismount; remount supported. Heavier turn + inertia tuned in `PilotingState`; no separate player mesh on Walker.

**What:** Add interaction system. Walk up to a dormant Walker, HUD shows "Press E to Activate". First Walker activates for free. Player mounts the Walker: swap player model for mounted-on-Walker state, camera pulls back to accommodate larger model, movement becomes heavier (wider turn radius, higher speed, more inertia).

**Test:** Find the first Walker, press E, confirm camera change and heavier movement. Dismount with E again.

---

## Step 6 — Walker turret + auto-aim

**Repo status:** Not started — geometry exists; no firing or piloting crosshair path.

**What:** Add turret to Walker. Click to fire projectile. Auto-aim: locks onto nearest enemy within range (or a debug target if enemies aren't in yet). Projectile is a simple glowing sphere that travels and despawns on hit/timeout. Add crosshair to HUD when piloting.

**Test:** Mount Walker, click to fire. Projectiles should travel forward (or toward debug target). Crosshair visible.

---

## Step 7 — Void creature enemies

**Repo status:** Not started.

**What:** Create `EnemySystem` (`src/game/EnemySystem.ts`). Spawn dark organic void creatures once player has a Walker. Simple AI: move toward player, melee attack on contact. One creature type to start. Drop XP on death (floating number or orb pickup).

**Test:** Activate Walker, enemies spawn nearby. Shoot them with turret. They die and drop XP.

---

## Step 8 — XP bar + leveling at camps

**Repo status:** Not started — HUD XP bar exists; always empty (`setXP(0)`).

**What:** Add XP bar to HUD (below or beside stamina). XP accumulates from enemy kills. At mech camps, hold E to open level-up prompt. Spending XP increases player stats (health, stamina, speed) and Walker stats (armor, turret damage, speed). Simple numeric stat system.

**Test:** Kill enemies, watch XP bar fill. Go to camp, level up. Confirm stat changes affect gameplay.

---

## Step 9 — Health system + damage

**Repo status:** Not started — HP bar stuck at full; no damage pipeline.

**What:** Add health bar to HUD for player and Walker. Enemies deal damage on contact. Walker has separate health pool. If Walker health reaches 0, player is ejected (dismounted). If player health reaches 0, respawn at last camp.

**Test:** Let enemies hit you. Health decreases. Walker destruction ejects player. Player death respawns.

---

## Step 10 — ESC menu (pause, inventory, overview, quit)

**Repo status:** Partial — ESC overlay + Resume/Quit; placeholder stats; **no Restart**; not wired to live progression.

**What:** Press ESC to open pause menu overlay. Shows: character stats + level, Walker stats + level (if active), simple inventory list (parts, resources — placeholder for now), Quit button (reloads page), Restart button (resets game state). Game loop pauses while menu is open.

**Test:** Press ESC mid-game. Menu shows correct stats. Resume, Quit, Restart all work.

---

## Step 11 — Resource pickups + Walker tiers

**Repo status:** Not started — two tiers exist visually; activation is not resource-gated.

**What:** Scatter power cells and parts on the map (glowing pickups). Walking over them auto-collects into inventory. Tier 2 Walker ("Tyr" class — Assault) requires power cells to activate (HUD shows "Requires: 2 Power Cells"). Tier 1 ("Argos" class — Scout) stays free.

**Test:** Find and collect power cells. Try to activate a Tyr without resources (rejected). Collect enough, activate it. Tyr is visibly bigger with better stats.

---

## Step 12 — Polish pass + architecture update

**Repo status:** Not started.

**What:** Tune enemy spawn rates, Walker stats, XP curve, turret feel. Fix any bugs found during Steps 1-9. Update `architecture.md` with all new files/functions. Review game-design-document.md for accuracy.

**Test:** Full loop: spawn → explore → find Walker → activate → fight → level up → find rare Walker → activate with resources. Should feel like a complete (if minimal) game.
