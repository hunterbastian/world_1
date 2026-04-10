# Glasswake — Task Plan

## Implementation status (living)

See **[docs/roadmap-status.md](./docs/roadmap-status.md)** for the full theme-by-theme table (done / partial / not started) and file pointers.

**MVP step markers** are inlined in [mvp-plan.md](./mvp-plan.md). **Game state diagram** → [docs/game-state-transitions.md](./docs/game-state-transitions.md).

---

## Current phase: World scale + exploration baseline

Aligned with **MVP Steps 1–4** and playtest follow-up from Step 12 polish.

### Phase 1 — Terrain & content at 1500×1500 (MVP Step 1 + world shell)

- [x] Terrain size 700 → 1500, segments 224 → 350 — `Terrain.ts`, `Game.ts`
- [x] Vegetation / grass / POIs / campfires / rivers / fog tuned for scale
- [x] Walker scatter density — `WalkerMechs.ts`
- [ ] **Playtest:** biome distribution, spawn safety (`findFlatSpawn`), FPS — *blocks closing Step 1 verification*

### Phase 2 — Walker mechs: piloting loop (MVP Steps 3–6)

Primary files: `PilotingState.ts` (new), `Game.ts`, `GameContext`, `ExploringState.ts`, `WalkerMech.ts`, `CameraRig.ts`, `HUD.ts`

- [x] Dormant Walkers in world; procedural model + idle animation — Step **4**
- [~] Activation: hold E fills ring; `activate()` — **not** mount/dismount — Step **5** partial
- [ ] `PilotingState` + chase camera + Walker movement — Step **5**
- [ ] Turret, projectile, auto-aim, piloting crosshair — Step **6**
- [ ] Walker MECH bar driven by real health when piloting — Steps **6/9**
- [ ] Assault tier requires power cells — Step **11** (can slip after first playable piloting)

### Phase 3 — Enemies (MVP Step 7)

Primary files: `EnemySystem.ts` (new), `Game.ts`, Walker combat hooks

- [ ] Void creature model + spawn after Walker active + melee + XP drop

### Phase 4 — Progression (MVP Steps 8–11)

Primary files: `HUD.ts`, camp interaction in `ExploringState` or dedicated UI, `PauseMenu.ts`, pickup entities

- [ ] XP from kills; camp level-up spend
- [ ] Inventory + pickups; tier-2 gate
- [ ] Pause menu wired to real stats + **Restart** — Step **10**

### Phase 5 — Polish (MVP Step 12 + feel)

- [ ] Activation / combat VFX, audio, tuning
- [ ] World map overlays as needed
- [ ] `architecture.md` + GDD drift pass after major systems land

---

## Error Log

_(none yet)_

## Decisions

- Terrain segments 350 (not 480) to balance detail vs performance at 1500 scale
- ~4.6x area increase; content scaled ~3–4x (slightly below linear to keep performance)
- Fog density reduced so distant mountains stay readable
- On-foot exploration is **first-person**; **third-person** reserved for **Walker piloting** (planned)
