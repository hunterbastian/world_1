# Glasswake — AGENTS.md

## Project Overview

First-person exploration + mech-piloting game built with Three.js. Explore a procedurally generated alien world of grasslands, forests, and mountains. Find dormant ancient Walker Mechs, activate them, pilot them in third-person, fight void creatures, level up at camps. You are alone. The world is beautiful but empty. Something happened here.

Aesthetic: Destiny × Studio Ghibli — sci-fi grandeur with organic warmth. Lonely awe with an undercurrent of mystery.

**Foundational docs:**
- [game-design-document.md](./game-design-document.md) — what the game is
- [tech-stack.md](./tech-stack.md) — what it's built with
- [architecture.md](./architecture.md) — one-liner per file and function
- [docs/roadmap.md](./docs/roadmap.md) — MVP exit criteria + engineering order
- [docs/roadmap-status.md](./docs/roadmap-status.md) — implementation status table

## Rules

- Follow the implementation plan step by step. Do not edit the plan file during implementation.
- One step per chat session. Test manually after each step.
- Do not add features outside the current plan step.
- Keep architecture.md updated after each step (add new files/functions, remove deleted ones).
- No crafting system. No quest system. These are explicitly out of scope.
- World has no swamp biome.

## Learned User Preferences

- Prefers strict adherence to an existing implementation plan when executing it (do not edit the plan file during implementation).
- Prefers working from an existing todo list without recreating items; mark todos in progress sequentially while implementing.
- Prefers a structured game workflow: conversational brainstorm first, then foundational docs (game-design-document.md, tech-stack.md) linked from AGENTS.md; MVP plans limited to roughly 6-10 steps with manual testing after each step; fresh chat per step when following that workflow; keep architecture.md with concise per-file or per-function notes; repeat discuss → plan → execute → test → document for larger post-MVP features.
- Prefers keeping gameplay and engine code organized and avoiding orchestrator spaghetti (clear separation or state machines before stacking many systems in one file).
- Relies on AI-generated 3D assets only; does not author models in Blender.
- When choosing larger chunks of background or autonomous work, prefers foundational engine, terrain, and shader improvements over expanding gameplay or content surface area.
- Prefers first-person on foot, third-person when piloting Walker mechs (Halo vehicle style).
- Targets Destiny/Halo-tier movement smoothness — sprint, slide, slide-jump, mantle. No weighty/deliberate Dark Souls feel.

## Learned Workspace Facts

- Repository and package name: `glasswake` (GitHub: hunterbastian/glasswake).
- World design excludes a swamp biome; procedural map targets grasslands, forests, and mountains.
- Known bug: player can spawn trapped between mountains. Spawn should prefer grasslands biome with low slope.
- Walker mechs use Greek mythology × Viking designation names (Argos, Tyr, Fenrir, etc.) as model numbers from the lost civilization.
- MVP targets two Walker tiers first; additional tiers are deferred until after MVP.
- Walker progression allows either finding and activating a higher-tier Walker in the world or upgrading the current Walker to the next tier at a mech camp when the player has the required resources.
- Reference imagery for Walkers, environments, and UI is kept under `references/` (subfolders such as walker-mechs, environment, ui).
- Game UI direction: Frutiger Aero whites and Mirror’s Edge clean futuristic panels rather than ornate gold or heavy medieval chrome.
- Walker mechs should not have visible eyes; materials favor aluminum/silver with dark grey accents, plus translucent glassy/crystalline panels with dim internal glow. The glass suggests alien technology beyond human understanding.
- Walker mechs are four-legged with a turret on each design; tier-one (Argos) is placed in grasslands near spawn, tier-two (Tyr) near ruins and forest areas.
- Walker mechs are ancient machines, not companions. No autonomous behavior, no following, no personality. They activate, stand, and wait for input. The bond is functional, not emotional.
- Aesthetic: Destiny × Studio Ghibli — sci-fi organic, not medieval fantasy. Lonely awe, not oppressive grimness. Dark Souls emotional DNA (loneliness, mystery, environmental storytelling) expressed through sci-fi visual language.
- Tone references: Destiny 1 (Moon/Venus missions), Shadow of the Colossus, Outer Wilds, Subnautica.
- NOT Dark Souls aesthetically. NOT Breath of the Wild. NOT third-person on foot.
- Rendering target: Destiny-quality (PBR, atmospheric scattering, IBL, SSAO, bloom, god rays) with Ghibli warmth and a very slight NMS voxel grain on terrain.
- Sky system target: fully procedural GPU sky dome (gradient, sin/cos clouds, hash stars, smoothstep sun/moon). Zero textures.
- Terrain target: smooth voxels (marching cubes) with subtle geometric faceting. 95% smooth, slight voxel character at close range.
- Future direction may include multiplayer / MMO-like features. Architecture decisions should keep the door open (chunked terrain, deterministic worldgen, serializable state).
- Uses a Vite-served `viewer.html` model viewer to inspect and iterate on procedural models and animations (knight, Walkers, world assets).
