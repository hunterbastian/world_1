# Experience pillars (north star)

Short guide from the creative pitch ([game-design-document.md](../game-design-document.md)): Ghibli warmth, Halo/Destiny mythic sci-fi, No Man’s Sky wanderlust, *Last Guardian* scale — **you pilot the Walker**.

These are **directional**, not a task list. Use them when choosing defaults for art, audio, and feel.

## Landscape readability

- Horizon and biome silhouette should read at a glance (grass vs forest vs mountain).
- Fog, haze, and color grading support depth without hiding landmarks.
- **Tie-in:** `Terrain.ts`, biome palette, `SkySystem` / fog, vegetation density.

## Ruin scale fantasy

- POIs and mega-geometry should feel **left behind by something huge** — broken verticality, long sightlines through arches, mist in valleys.
- **Tie-in:** `PointsOfInterest`, `Landmarks`, ruin placement; future vertical asset passes.

## Walker: “you are the giant”

- Piloting should sell **mass**: camera height, FOV, turn radius, stomp/sway, turret feedback.
- On foot, the Walker reads as imposing before you board.
- **Tie-in:** `PilotingState` (future), `WalkerMech` animation, HUD MECH bar when piloting.

## Lonely wanderlust

- Pacing favors **travel and discovery**; combat is a spike, not constant noise.
- Sparse, intentional audio stingers; wind and ambience carry the open map.
- **Tie-in:** enemy spawn rules (when added), `AudioSystem`, encounter density tuning.

## Clean heroic UI

- HUD stays minimal and futuristic-readable; Frutiger/Mirror’s Edge panel language for menus.
- **Tie-in:** `HUD.ts`, `PauseMenu.ts`, future piloting prompts.
