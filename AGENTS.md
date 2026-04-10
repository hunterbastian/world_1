# Glasswake — AGENTS.md

## Project Overview

Third-person exploration + mech-piloting game built with Three.js. Explore procedurally generated mountains and grasslands, find abandoned Walker Mechs, activate and pilot them, fight void creatures, level up at camps. **Creative north star:** if **Studio Ghibli**, **Halo**, **Destiny**, **No Man's Sky**, and **The Last Guardian** had a baby — and **you pilot the mech** (the Walker is your Trico-scale companion, but you're in the cockpit).

**Foundational docs:**
- [game-design-document.md](./game-design-document.md) — what the game is
- [tech-stack.md](./tech-stack.md) — what it's built with
- [architecture.md](./architecture.md) — one-liner per file and function

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
- Prefers third-person controls aligned with The Witcher 3–style feel over other reference games when choosing defaults.
- Prefers keeping gameplay and engine code organized and avoiding orchestrator spaghetti (clear separation or state machines before stacking many systems in one file).
- Relies on AI-generated 3D assets only; does not author models in Blender.
- When choosing larger chunks of background or autonomous work, prefers foundational engine, terrain, and shader improvements over expanding gameplay or content surface area.

## Learned Workspace Facts

- Repository and package name: `glasswake` (GitHub: hunterbastian/glasswake).
- World design excludes a swamp biome; procedural map targets grasslands, mountainlands, and forestlands.
- Known bug: player can spawn trapped between mountains. Spawn should prefer grasslands biome with low slope.
- Walker mechs use names drawn from Greek mythology and Viking-inspired naming.
- MVP targets two Walker tiers first; additional tiers are deferred until after MVP.
- Walker progression allows either finding and activating a higher-tier Walker in the world or upgrading the current Walker to the next tier at a mech camp when the player has the required resources.
- Reference imagery for Walkers, environments, and UI is kept under `references/` (subfolders such as walker-mechs, environment, ui).
- Game UI direction: Frutiger Aero–influenced whites and Mirror's Edge–style clean futuristic panels rather than ornate gold or heavy medieval chrome.
- Walker mechs should not have visible eyes; materials favor aluminum/silver with dark grey accents over military camo.
- Walker mechs are four-legged with a turret on each design; tier-one (Argos) is placed in grasslands near the player’s first spawn, tier-two (Tyr) near ruins and forest areas.
- Beyond the Ghibli × Halo/Destiny × No Man's Sky × Last Guardian blend (at mech scale), aims for more Breath of the Wild–style readability and appeal on the player character and overall graphics.
- Uses a Vite-served `viewer.html` model viewer to inspect and iterate on procedural models and animations (knight, Walkers, world assets).
