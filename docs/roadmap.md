# Glasswake roadmap (contributor snapshot)

## Vision (one line)

Procedural exploration + **pilotable** quadruped Walkers — Ghibli nature × Halo/Destiny sci-fi × NMS horizons × *Last Guardian* scale.

## MVP exit criteria

From [mvp-plan.md](../mvp-plan.md): spawn safely in grasslands, explore, **activate and mount** a Walker, **turret combat** vs void creatures, **XP and leveling** at camps, health/damage, ESC overview, **tier-2 resource gate**, polish pass.

## Where things stand

See [roadmap-status.md](./roadmap-status.md) for a file-level **done / partial / not started** table.

## Suggested build order (engineering)

1. **`PilotingState`** + mount/dismount + third-person chase camera (MVP Steps 5–6).
2. **`EnemySystem`** + XP from kills (Steps 7–8).
3. **Damage**, camp respawn, Walker eject (Step 9).
4. Wire **pause menu** to real stats / Restart (Step 10).
5. **Pickups + Assault activation cost** (Step 11).
6. Polish + doc sync (Step 12).

## Related docs

- [game-state-transitions.md](./game-state-transitions.md) — state machine intent.
- [experience-pillars.md](./experience-pillars.md) — taste checks for content and FX.
