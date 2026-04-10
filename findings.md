# Glasswake — Findings

## Architecture
- All world systems read `terrain.size` dynamically — no hardcoded 700 values outside Game.ts
- Scatter systems use `terrain.size * 0.5` for half-extent — auto-adapts to size changes
- Camera far plane is 2000 — sufficient for 1500 world (max half-diagonal ~1060)
- Ocean plane is 6000x6000 — already covers any reasonable world size
- Fog is exponential (FogExp2) — density needs manual tuning per world scale

## Content Density (old → new)
| System | Old (700x700) | New (1500x1500) | Ratio |
|--------|--------------|-----------------|-------|
| Terrain segments | 224 | 350 | 1.56x |
| Deciduous trees | 900 | 2800 | 3.1x |
| Pine trees | 260 | 800 | 3.1x |
| Scatter attempts | 6500 | 20000 | 3.1x |
| Grass blades | 32000 | 55000 | 1.7x |
| POIs | 6 | 14 | 2.3x |
| Campfires | 12 | 12 | 2.4x |
| Rivers | 2 | 4 | 2.0x |
| Walker min sep | 60 | 120 | 2.0x |
| World area | 490k | 2.25M | 4.59x |

Note: grass scales less than trees because grass is already center-biased (60% within 0.35*half) and player-proximate. Trees need to fill the visible horizon.

## Performance Concerns
- 350 segments = ~123k terrain vertices (was ~50k). Should be fine — single draw call.
- 55k grass instances is the biggest GPU budget item. Quality tier scaling already exists.
- 2800+800 tree instances = 3600 total (was 1160). Two instanced draw calls. Fine.
- Fog density reduction means more geometry visible at distance — watch draw call count.

## Biome Distribution
- Grassland basin occupies center area. With 1500 scale, more room for forest and mountain biomes.
- Mega-mountain with spiral passes is at world center — will be more dramatic at larger scale.
- Scouts spawn in grasslands (near player), Assaults in forest/mountains near ruins.
