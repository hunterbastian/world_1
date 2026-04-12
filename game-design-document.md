# Glasswake — Game Design Document

## Vision

A first-person exploration and mech-piloting game set on a vast, beautiful alien world. Procedurally generated terrain stretches to the horizon — rolling grasslands, dense forests, snow-capped mountains. Something massive hangs in the sky. Ancient machines lie dormant in the moss. You are alone.

The aesthetic blends Destiny's sci-fi grandeur with Studio Ghibli's warmth and wonder — golden light on alien terrain, with the quiet dread of a world whose builders vanished. The tone is lonely awe with an undercurrent of mystery. **On foot** the camera is **first-person**; **piloting a Walker** switches to **third-person** (pulled-back chase camera) for scale and combat read. The quadruped is your mount and presence in the world, not a separate AI partner.

**Reference games:**
- Destiny (scale, skybox, smooth FPS movement, golden-age ruins, atmospheric rendering)
- Halo (epic vistas, vehicle camera transitions, combat sandbox)
- No Man's Sky (smooth procedural voxel terrain, alien flora, discovery)
- Shadow of the Colossus (the feeling of being near something massive and ancient)
- Outer Wilds / Subnautica (lonely discovery, beauty with underlying mystery)
- The Last Guardian (ruins, scale, bond with something enormous — here, *being* the enormous thing)

**Reference aesthetic:**
- Destiny × Studio Ghibli × The Last Guardian — sci-fi organic, not medieval fantasy

## Core Loop

1. **Wake** in the grasslands, first-person. No explanation. A vast world stretches before you.
2. **Explore** ruins, mountains, and grasslands. Discover camps, lore fragments, and resources.
3. **Find a Walker Mech** — an ancient quadruped machine, dormant, half-buried in moss and time.
4. **Activate it** — the first one is free. It powers on. Servos whir. Lights flicker. It rises. The ground shakes.
5. **Pilot it** — mount the Walker. Camera pulls to third-person. Movement becomes heavy, powerful. Enemies begin appearing.
6. **Fight** — use the Walker's turret to destroy void creatures drawn by the activation signal.
7. **Loot** — enemies drop XP and occasionally parts (mech upgrades, weapons, Walker unlocks).
8. **Level up** — return to a mech camp, spend accumulated XP to upgrade your character and Walker.
9. **Find rarer Walkers** — deeper in the world, harder to activate, more powerful.

## Tone

**Lonely awe with an undercurrent of mystery.**

You are alone on a vast, beautiful alien world. The grass sways, the light is warm, something enormous hangs in the sky. It is gorgeous. But the ruins are too old. The Walkers were abandoned for a reason. The void creatures come when you activate one. Nobody is here to explain why.

The emotional DNA of Dark Souls / Elden Ring stays: loneliness, environmental storytelling, the feeling that something terrible happened here and you are piecing it together from ruins. But the expression is sci-fi, not medieval. The dread is subtle — an undercurrent beneath beauty, not a constant oppressive weight. The beauty makes the mystery hit harder because you care about the world.

Not cheerful. Not populated. You are alone. The world is beautiful but empty of people. That tension is the core mood.

## The Player

- On foot: first-person. Destiny-smooth movement. Sprint, slide, slide-jump chains. Responsive and fluid. Jump, crouch implemented (see `Player.ts`).
- Mantle/clamber for ledges and overhangs (planned — critical for voxel terrain).
- Vulnerable on foot — no heavy weapons, limited defense. The world is dangerous without a Walker.
- **First-person camera** on foot; **third-person** when piloting a Walker (`PilotingState`).
- Stamina system exists. Cooldown-based alternatives TBD.

## Walker Mechs

Ancient machines. Not companions. Not characters. Technology from a lost civilization that still works, for reasons unknown.

- **Shape:** Spider × horse hybrid. Four legs, quadruped locomotion. Turret mounted on top.
- **Size:** ~5x human height. Roughly orca-sized.
- **Lore:** Abandoned by a lost civilization. Sci-fi ancient, not fantasy ancient — think Destiny's Golden Age. Why they were left is a mystery (lore breadcrumbs in ruins).
- **Feel:** Heavy, mechanical, alien. They power on with servos and lights, not animation. They do not acknowledge you. They wait for input. When you dismount, they stand where you left them. Dormant. Waiting.
- **Material:** Weathered aluminum/silver metal hull with dark grey accents. Sections of translucent glassy/crystalline panels — frosted, not clear — with dim internal glow or energy visible through the glass. The glass suggests a technology level beyond human understanding. No visible eyes.
- **Activation:** First Walker is free (hold E). Later Walkers require resources (power cells, parts from enemies).
- **Piloting:** Player mounts the Walker. Camera transitions smoothly from first-person to third-person (Halo vehicle style). Movement becomes heavier — wider turning radius, more inertia, screen shake from footfalls. Mouse aims turret independently of hull facing. *Last Guardian*'s bond-with-a-giant feeling, but **you are the giant machine** — agency stays with the player.
- **Combat:** Turret with auto-aim assist and lock-on. Fire with click.
- **Naming convention:** Greek mythology × Viking designations (Argos, Tyr, Fenrir, Cerberus, Baldr, Typhon) — model numbers from the lost civilization, not names you give them.
- **Tiers (MVP — 2 tiers, 4 planned):**
  - **Tier 1 — Scout** ("Argos") — Smallest, lightest. Free to activate. Basic turret, fast, low armor. Found near spawn in grasslands.
  - **Tier 2 — Assault** ("Tyr") — Bigger, heavier plating. Requires power cells. Stronger turret, more armor, slower. Found near ruins deeper in the world.
  - *Tier 3 — Strider (post-MVP)* — Larger, rare parts required. Balanced power + mobility.
  - *Tier 4 — Colossus (post-MVP)* — Endgame. Massive, heavily armored. Only one per map seed. Hidden deep.
- **Two upgrade paths:** Find a higher-tier Walker in the world, OR upgrade your current Walker to the next tier at a mech camp with the required resources.
- **Upgradeable:** Spend XP at mech camps to improve Walker stats (speed, armor, turret damage, turret range).

## Enemies

- **Void Creatures** — dark, inky, unsettling shapes. Organic corruption.
- Spawn once the player activates a Walker (the activation draws them).
- Start simple: one basic melee creature type. More variety post-MVP.
- Drop XP on death, occasionally drop parts.
- AI should patrol, flank, and retreat — not just chase (Halo-tier combat AI is the target).

## Progression

- **XP bar** — fills from enemy kills.
- **Mech Camps** — rest points where the player can:
  - Level up their character (health, stamina/cooldowns, speed).
  - Level up their Walker (armor, turret damage, speed).
  - Rest (time-lapse, already implemented).
- **Parts** — rare drops and world pickups for Walker activation and upgrades.
- **No crafting.** No quests. Pure exploration + combat + progression.

## World

- **Procedurally generated.** Seed-based terrain with biomes.
- **Biomes:** Grasslands, forests, mountains. No swamp.
- **Terrain:** Smooth voxels (marching cubes) with subtle geometric character — 95% smooth, slight voxel faceting at close range. Caves and overhangs possible.
- **Scale:** Currently 1500 units. Target 4000+ with chunked LOD (Distant Horizons-style).
- **Points of Interest:** Ruins with lore, Walker spawn locations, mech camps, resource caches.
- **Sky:** Fully procedural GPU sky dome — gradient, volumetric clouds (sin/cos math), stars (cell hashing), sun/moon discs (smoothstep). Zero textures.
- **Megastructures:** 1-2 massive structures visible from anywhere — the "look up and feel small" moment. Design TBD (broken ring, floating ruin, dormant megastructure).
- **Day/night cycle** with wind and clouds. Already implemented.
- **Fog of war** on the world map. Already implemented.

## Camera

- **On foot:** First-person. Sprint bob, idle breathe, landing dip, slide roll. Destiny-feel.
- **Piloting Walker:** Third-person chase cam pulled back to show Walker's full body (Halo Scorpion/Mantis style). Camera collides with terrain.
- **Transition:** Smooth blend from FP to TP on mount, TP to FP on dismount. Not a hard cut.

## UI

- **HUD:** Stamina/cooldown bar, compass, XP bar, health bar. Minimal, clean, lots of breathing room.
- **ESC Menu:** Pause overlay with character overview, Walker overview, inventory, quit/restart.
- **Tab/Journal:** Lore entries + world map with fog of war.
- **Style:** Frutiger Aero whites, Mirror's Edge clean futuristic panels. Not ornate, not medieval.

## Aesthetic

- **Destiny × Studio Ghibli × sci-fi organic.**
- Beautiful, warm, alive — but empty and ancient. The contrast is the identity.
- Golden hour tones, alien blues and purples on distant terrain, warm amber in light.
- Terrain: Destiny-quality rendering (PBR, atmospheric scattering, IBL) with a slight NMS voxel grain.
- Sky: Procedural, dramatic. Painted clouds, visible stars at night, prominent sun/moon discs.
- Walkers: Weathered metal + glassy crystalline panels with dim internal glow. Ancient, alien, cold.
- Ruins: Sci-fi ancient (Destiny Golden Age), not medieval. Overgrown tech, not crumbling stone.
- Void creatures: Dark, organic, inky. Unsettling contrast against the warm world.

### Visual References (`references/`)

**Walker Mechs** (`references/walker-mechs/`)

- 4-legged quadrupeds with a heavy armored body and turret mounted on top.
- Proportions: wide stance, thick articulated legs, compact hull. ~5x human height.
- Leg style ranges from horse-like (reverse-jointed rear legs) to spider-like (splayed, angular).
- Surface: weathered metal plating, panel lines, faded by time. Glassy/crystalline panels when activated.
- Key refs: Ghost in the Shell spider tank in ruins (anime-mechanical crossover), heavy quad-mech #02 concept (chunky armored silhouette), green quad-walker (dog/horse body proportions), weathered 3D model with turret (abandoned military feel).
- All Walkers have a turret on top. No exceptions.

**Environment** (`references/environment/`)

- Grasslands: Howl's Moving Castle rolling green hills — lush, alive, wildflowers, ponds catching sky reflections. Snow-capped mountains on the horizon. Warm light.
- Forests: Dense green canopy, overgrown paths, earthy warm tones, dappled light. Totoro-era Ghibli.
- Mountains/Ruins: **Halo/Destiny** lost-civilization stone and metal — monolithic forms, dramatic atmosphere, fog in the valleys, readable mega-geometry. **No Man's Sky**-style sense of landing on a single vast place worth crossing. Contrast Ghibli-soft wilds below with mythic sci-fi heights.

**UI** (`references/ui/`)

- **Frutiger Aero / Mirror's Edge HUD discipline:** minimal prompt at bottom center, vitals and meters tucked in corners, high readability. Futuristic clarity over ornate fantasy chrome.
- Clean minimal design: lots of breathing room, simple typography, understated.

## Rendering Target

- Full PBR materials (metalness/roughness workflow)
- IBL from sky capture
- High-quality directional shadows (PCFSoft, shadow focus follows player)
- SSAO / HBAO for contact shadows and depth
- Bloom (mipmap blur) for energy sources and bright highlights
- God rays with sun scattering
- Height fog with sun-scatter glow
- Atmospheric scattering for distance haze (Rayleigh/Mie)
- Distance color grading (warm near, cool/desaturated far)
- Chromatic aberration, vignette, film grain (cinematic polish)
- Rim lighting for silhouette readability
- Auto-exposure / eye adaptation (bright sky vs dark cave)

## Planning docs

Contributor-facing status and pillars (kept in `docs/` so AGENTS links stay short):

- [docs/roadmap.md](./docs/roadmap.md) — MVP exit criteria and suggested build order
- [docs/roadmap-status.md](./docs/roadmap-status.md) — done / partial / not started vs themes
- [docs/game-state-transitions.md](./docs/game-state-transitions.md) — exploring / piloting / menu intent
- [docs/experience-pillars.md](./docs/experience-pillars.md) — north-star taste checks

## Future (Not Now)

- Multiplayer / MMO-like (architecture decisions keep the door open).
- More enemy types and boss encounters.
- Deeper lore and environmental storytelling.
- More biomes and world expansion.
- On-foot combat (melee or light weapons).
- Walker customization (visual + functional).
- WebGPU renderer migration (TSL materials, compute shaders).
- Rust/WASM for voxel meshing performance.
