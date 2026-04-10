# Glasswake — Progress

## Session: 2026-04-08

### World Scale-Up (700→1500)
- **Terrain**: size 1500, segments 350, seed unchanged
- **Vegetation**: deciduous 2800, pine 800, 20k scatter attempts
- **Grass**: 55k blades (from 32k)
- **POIs**: 14 total (5 ruins, 4 camps, 5 shrines)
- **Campfires**: 12 (from 5)
- **Rivers**: 4 (from 2)
- **Walkers**: scatter samples scaled (2800/3400), minSep 120
- **Fog**: base density 0.00014 (from 0.00022), night range 0.00028-0.00008

### Files Changed
- `src/game/Game.ts` — terrain size/segments, grass count, river count
- `src/world/Vegetation.ts` — tree counts, scatter attempts
- `src/world/PointsOfInterest.ts` — POI list expanded to 14
- `src/world/Campfires.ts` — fire count 5→12
- `src/world/WalkerMechs.ts` — scatter samples, minSep
- `src/world/SkySystem.ts` — fog density values

### Build Status
- `tsc --noEmit`: PASS (no errors)
- Playtest: pending

## Session: 2026-04-08 (continued)

### First-Person Conversion + Destiny Movement Feel
- **CameraRig**: Rewrote from orbit to FP eye-level camera
  - Camera bob (vertical + horizontal sway, walk/sprint frequencies)
  - Idle breathing when stationary
  - Landing dip (critically damped spring, intensity ∝ fall velocity)
  - Sprint FOV shift (65 → 69, smooth lerp)
  - Slide camera roll tilt
  - Full pitch range: ±80° (see feet / sky)
  - Footstep shake reduced for FP (0.3x original)
- **Player**: Full rewrite with state machine
  - States: idle, walking, sprinting, crouching, sliding, airborne
  - Jump physics: 7.5 m/s up, 22 m/s² gravity, 30% air control
  - Slide: sprint+crouch triggers, decelerates at 8 m/s², camera drops to 0.9m
  - Crouch: toggle C/Ctrl, camera at 1.0m, speed 2.8
  - Destiny-tuned speeds: walk 5.5, sprint 7.0 (1.27x ratio)
  - Strafe penalty: 0.85x when moving sideways
  - Smooth sprint blend (~0.3s transition)
  - Stamina: 0.5s grace period, 0.8s regen delay
  - Landing events emitted for camera + audio
  - Knight model removed (FP, no visible player model)
- **Input**: Added Space (jump), C/Ctrl (crouch/slide)
- **Audio**: Footstep pitch variation ±5%, sprint footsteps lower/louder
- **ExploringState**: Rewired for FP camera, movement state feedback
- **Game.ts**: Landing event wired player → camera

### Files Changed
- `src/game/CameraRig.ts` — full rewrite (orbit → FP)
- `src/game/Player.ts` — full rewrite (state machine, jump/slide/crouch)
- `src/game/Input.ts` — added jump, crouch inputs
- `src/game/ExploringState.ts` — rewired for FP
- `src/game/Game.ts` — updated CameraRig params, landing wiring
- `src/audio/AudioSystem.ts` — footstep pitch/volume variation

### Build Status
- `tsc --noEmit`: PASS
- `npm run build`: PASS
- Playtest: pending
