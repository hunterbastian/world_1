# Mech World — Task Plan

## Current Phase: World Scale-Up (1500x1500)

### Phase 1: Terrain & Content Scaling [IN PROGRESS]
- [x] Terrain size 700 → 1500, segments 224 → 350
- [x] Vegetation: deciduous 900 → 2800, pine 260 → 800, scatter 6500 → 20000
- [x] Grass blades 32k → 55k
- [x] POIs 6 → 14 (more ruins, shrines, camps)
- [x] Campfires 5 → 12
- [x] Walker scatter samples scaled (900→2800 scout, 1100→3400 assault), minSep 60→120
- [x] Rivers 2 → 4
- [x] Fog density reduced for longer draw distance (0.00022→0.00014 base, night/day range adjusted)
- [ ] Playtest: verify terrain generation, biome distribution, spawn placement
- [ ] Playtest: check performance (FPS) with scaled content
- [ ] Tune if sparse or dense in any biome

### Phase 2: Walker Mechs — Core Gameplay
- [ ] Player can approach dormant Walker and press E to activate
- [ ] Mount/dismount animation transition
- [ ] Piloting state: camera pulls back, movement becomes Walker-scaled
- [ ] Walker turret: auto-aim lock-on to nearest enemy, click to fire
- [ ] Walker health bar on HUD
- [ ] Two tiers functional: Scout (free) and Assault (requires power cells)

### Phase 3: Enemies — Void Creatures
- [ ] Basic melee void creature model (dark, inky, organic)
- [ ] Spawn system: enemies appear after Walker activation
- [ ] AI: pathfind toward player Walker, melee attack
- [ ] Health + death: drop XP, occasionally drop parts
- [ ] Spawn density scales with distance from spawn

### Phase 4: Progression System
- [ ] XP bar fills from enemy kills (HUD already has slot)
- [ ] Mech camp level-up: spend XP on character stats (health, stamina, speed)
- [ ] Mech camp level-up: spend XP on Walker stats (armor, turret damage, speed)
- [ ] Parts: rare drops + world pickups for Walker activation/upgrades
- [ ] Pause menu: character overview, Walker overview, inventory

### Phase 5: Polish & Feel
- [ ] Walker activation cinematic (camera sweep, power-up VFX)
- [ ] Enemy death VFX (void dissipation)
- [ ] Combat audio (turret fire, impact, enemy sounds)
- [ ] Turret projectile visuals
- [ ] World map: Walker markers, enemy density overlay

## Error Log
_(none yet)_

## Decisions
- Terrain segments 350 (not 480) to balance detail vs performance at 1500 scale
- ~4.6x area increase; content scaled ~3-4x (slightly below linear to keep performance)
- Fog density reduced proportionally so distant mountains still visible
