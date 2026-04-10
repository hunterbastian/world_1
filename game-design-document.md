# Mech World — Game Design Document

## Vision

A third-person exploration and mech-piloting game set in a mysterious procedurally generated world of mountains, grasslands, and ancient ruins. The aesthetic blends Studio Ghibli's sense of wonder with Dark Souls 1's oppressive mystery — beautiful but unsettling, with secrets buried in every ruin.

**Reference games:** Dark Souls 1/3 (movement, exploration, weight), Breath of the Wild (discovery, open world), Skyrim (mountains, wandering).

## Core Loop

1. **Spawn** in the grasslands on foot, third-person camera.
2. **Explore** ruins, mountains, and grasslands. Discover camps, lore, and resources.
3. **Find a Walker Mech** — an abandoned quadruped machine left behind by an unknown civilization.
4. **Activate it** — the first one is free. Later mechs require gathered resources (power cells, parts).
5. **Pilot it** — mount the Walker and traverse the world from a higher vantage. Enemies begin spawning.
6. **Fight** — use the Walker's turret (auto-aim with lock-on) to destroy void creatures.
7. **Loot** — enemies drop XP and occasionally parts (mech upgrades, weapons, Walker unlocks).
8. **Level up** — return to a mech camp, spend accumulated XP to upgrade your character and your Walker.
9. **Find rarer Walkers** — deeper in the world, harder to activate, more powerful.

## The Player

- On foot: Dark Souls-inspired movement. Weighty, deliberate. Walk, sprint (stamina-limited).
- No melee combat on foot initially. The player is vulnerable until they find a Walker.
- Third-person camera at all times.
- Stamina system already exists.

## Walker Mechs

- **Shape:** Spider × horse hybrid. Four legs, organic-mechanical look. Quadruped locomotion.
- **Size:** ~5x human height. Roughly orca-sized.
- **Lore:** Abandoned by a lost civilization. Why they were left behind is a mystery (lore breadcrumbs in ruins).
- **Activation:** First Walker is free (press E). Later Walkers require resources (power cells found on the map, parts from enemies).
- **Piloting:** Player mounts the Walker. Camera pulls back to accommodate the larger model. Movement becomes heavier, wider turning radius.
- **Combat:** Turret mounted on the Walker. Auto-aim assist with automatic lock-on to nearest enemy. Fire with click.
- **Naming convention:** Greek mythology × Viking names (e.g., Fenrir, Argos, Tyr, Cerberus, Baldr, Typhon).
- **Tiers (MVP — 2 tiers, 4 planned):**
  - **Tier 1 — Scout** (e.g., "Argos") — Smallest, lightest. Free to activate. Basic turret, fast, low armor. Found near spawn in grasslands.
  - **Tier 2 — Assault** (e.g., "Tyr") — Bigger, heavier plating. Requires power cells. Stronger turret, more armor, slower. Found in ruins deeper in the world.
  - *Tier 3 — Strider (post-MVP)* — Even larger, rare parts required. Balanced power + mobility.
  - *Tier 4 — Colossus (post-MVP)* — Endgame. Massive, heavily armored, moss-covered. Only one per map seed. Hidden deep.
- Each tier is visibly larger, more armored, and more imposing than the last.
- **Two paths to upgrade:** Find a higher-tier Walker in the world and activate it, OR upgrade your current Walker to the next tier at a mech camp if you have the required resources. Player always has a choice between exploring for a better one or investing in what they have.
- **Upgradeable:** Spend XP at mech camps to improve Walker stats (speed, armor, turret damage, turret range).

## Enemies

- **Void Creatures** — dark, organic beings. Corrupted by darkness/the void.
- Spawn once the player activates a Walker (the activation draws their attention).
- Variety TBD, but start simple: one basic melee creature type.
- Drop XP on death, occasionally drop parts.

## Progression

- **XP bar** — fills from enemy kills.
- **Mech Camps** — rest points where the player can:
  - Level up their character (increase stats: health, stamina, speed).
  - Level up their Walker (increase stats: armor, turret damage, speed).
  - Time-lapse rest (already implemented).
- **Parts** — rare drops and world pickups. Used to:
  - Activate higher-tier Walkers.
  - Unlock better weapons/turret types.
  - Upgrade Walker components.
- **No crafting.** No quests. Pure exploration + combat + progression.

## World

- **Procedurally generated.** Seed-based terrain with biomes.
- **Biomes:** Mountains, grasslands, ruins. No swamp.
- **Scale:** Currently 700×700 units. May expand.
- **Points of Interest:** Ruins with lore, Walker spawn locations, mech camps, resource caches.
- **Day/night cycle** with weather (wind, clouds). Already implemented.
- **Fog of war** on the world map. Already implemented.

## UI

- **HUD:** Stamina bar, compass, XP bar (new), health bar (new).
- **ESC Menu:** Pause overlay with:
  - Character overview (stats, level).
  - Walker overview (stats, level, equipped parts).
  - Inventory (parts, resources).
  - Quit / Restart buttons.
- **Tab/Journal:** Existing journal with lore entries + world map. Keep and expand.

## Aesthetic

- Studio Ghibli × Dark Souls 1.
- Mysterious, slightly gritty, but still beautiful.
- Muted natural colors for the world. Ruins have a weathered, ancient feel.
- Walkers have an organic-mechanical look — mossy, rusted, overgrown.
- Void creatures are dark, inky, unsettling shapes.
- Current stylized/low-poly direction stays, with a touch more grit.

### Visual References (`references/`)

**Walker Mechs** (`references/walker-mechs/`)
- 4-legged quadrupeds with a heavy armored body and turret mounted on top.
- Proportions: wide stance, thick articulated legs, compact hull. ~5x human height.
- Leg style ranges from horse-like (reverse-jointed rear legs) to spider-like (splayed, angular).
- Surface: weathered metal plating, panel lines, military markings faded by time. Mossy/rusted when dormant.
- Key refs: Ghost in the Shell spider tank in ruins (anime-mechanical crossover), heavy quad-mech #02 concept (chunky armored silhouette), green quad-walker (dog/horse body proportions), weathered 3D model with turret (abandoned military feel).
- All Walkers have a turret on top. No exceptions.

**Environment** (`references/environment/`)
- Grasslands: Howl's Moving Castle rolling green hills — lush, alive, wildflowers, ponds catching sky reflections. Snow-capped mountains on the horizon. Warm light.
- Forests: Dense green canopy, overgrown paths, earthy warm tones, dappled light. Totoro-era Ghibli.
- Mountains/Ruins: Dark Souls fortress stone — fog below, gritty cobblestone, weathered battlements. The contrast between Ghibli warmth below and Souls grimness above.

**UI** (`references/ui/`)
- Dark Souls bonfire: minimal prompt at bottom center, health/stamina/item bars tucked in corners. No clutter.
- Clean minimal design: lots of breathing room, simple typography, understated.

## Future (Not Now)

- Multiplayer (co-op exploration, PvP Walker battles).
- More enemy types and boss encounters.
- Deeper lore and environmental storytelling.
- More biomes and world expansion.
- On-foot melee combat.
- Walker customization (visual + functional).
