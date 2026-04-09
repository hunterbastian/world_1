# Destiny 1 Visual Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform World_1's rendering from anime-toon to Destiny 1-inspired filmic visuals while maintaining 60fps on wide vistas at 1500x1500 world scale.

**Architecture:** Performance pipeline restructure (terrain chunking, spatial grid vegetation/grass, frustum culling) creates GPU headroom, then Destiny-style shaders (rim lighting, atmospheric haze, cinematic grading, SSAO, DOF, chromatic aberration) replace the current toon pipeline. A normals pre-pass feeds SSAO; all other depth consumers reuse the existing EffectComposer depth buffer.

**Tech Stack:** Three.js 0.183, TypeScript 6, Vite 8, postprocessing (pmndrs), simplex-noise

**Spec:** `docs/superpowers/specs/2026-04-09-destiny-visual-overhaul-design.md`

**Verification approach:** No test suite — verify via `npx tsc --noEmit` + `npm run build` + visual inspection notes per task.

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/render/AtmosphericHaze.ts` | Depth-aware atmospheric scattering effect (replaces FogVeil) |
| `src/render/CinematicGrade.ts` | Lift/gamma/gain + split-tone + vignette effect (replaces ToonRamp + BiomePalette) |
| `src/render/SSAOEffect.ts` | Screen-space AO + contact shadow effect |
| `src/render/DOFEffect.ts` | Hexagonal bokeh depth-of-field effect |
| `src/render/ChromaticAberration.ts` | Chromatic aberration + film grain composite effect |
| `src/render/NormalPass.ts` | Scene normal pre-pass for SSAO |

### Modified Files
| File | Changes |
|------|---------|
| `src/world/Terrain.ts` | Chunk grid (7x7), shared material, rim GLSL in onBeforeCompile |
| `src/world/Vegetation.ts` | 8x8 spatial grid, 3 LOD bands, displaced icosahedron canopy, leaf translucency, canopy AO |
| `src/world/GrassField.ts` | 8x8 spatial grid, distance-based per-cell culling |
| `src/render/PostFX.ts` | New effect chain, normals pre-pass integration, remove ToonRamp/BiomePalette/FogVeil |
| `src/render/RimLight.ts` | Sky-sampled rim color, directional backlit, per-material intensity, skip terrain mesh |
| `src/world/SkySystem.ts` | Remove FogExp2 creation and fog update logic |
| `src/game/Game.ts` | Wire new systems, remove scene.fog, pass sunDir to vegetation, update PostFX calls |
| `src/game/PerformanceManager.ts` | Expanded tier definitions for new effects |
| `src/world/WalkerMechs.ts` | Frustum visibility check |
| `src/world/PointsOfInterest.ts` | Frustum visibility check |

### Removed Files
| File | Reason |
|------|--------|
| `src/render/TerrainShader.ts` | Dead code — `makeTerrainMaterial()` is never imported |

---

## Phase 1: Render Pipeline Foundation

### Task 1: Terrain Chunking

**Files:**
- Modify: `src/world/Terrain.ts`
- Verify: `npx tsc --noEmit`

- [ ] **Step 1: Add chunk grid infrastructure to Terrain class**

Add private fields and a `buildChunks()` method. After `generate()` runs (which populates geometry positions, normals, colors), split the single PlaneGeometry into a 7x7 grid of chunk meshes.

```typescript
// New private fields on Terrain class
private readonly chunks: THREE.Mesh[] = []
private readonly chunkGroup = new THREE.Group()
private static readonly GRID = 7
```

The key algorithm for `buildChunks()`:
1. The PlaneGeometry has `(segments+1)` vertices per row/col
2. Each chunk covers `Math.ceil(segments / GRID)` segments
3. For each chunk (row, col): extract the sub-rectangle of vertices, build a new BufferGeometry with position/normal/color attributes, compute an index buffer, set a tight bounding box
4. Create a Mesh with the **shared** `this.material` (not cloned)
5. Add to `this.chunkGroup`, which replaces `this.mesh` in `this.object3d`

- [ ] **Step 2: Implement buildChunks()**

Call `buildChunks()` at the end of `generate()`, after `computeVertexNormals()`. Remove the old `this.mesh` from `this.object3d` and add `this.chunkGroup` instead.

Each chunk needs:
- Positions, normals, colors copied from the corresponding sub-grid of the main geometry
- Index buffer computed for the sub-grid (triangle strip of the chunk's local vertices)
- `geometry.computeBoundingBox()` and `geometry.computeBoundingSphere()` from actual vertex positions
- `mesh.receiveShadow = true`

- [ ] **Step 3: Update carveRiverChannels to rebuild affected chunks**

After `carveRiverChannels()` modifies the main geometry's positions, the affected chunk geometries need their positions and bounding boxes updated. Add a method `rebuildChunkGeometry(chunkRow, chunkCol)` that re-copies positions from the main geometry into the chunk's buffer.

In `carveRiverChannels()`, after modifying vertices, track which chunk grid cells were affected (from vertex x,z positions) and call `rebuildChunkGeometry` for each.

- [ ] **Step 4: Verify terrain renders identically**

Run: `npx tsc --noEmit`
Run: `npm run build`
Visual check: terrain should look identical — same material, same vertex colors, same lighting. Frustum culling now applies per-chunk.

- [ ] **Step 5: Commit**

```bash
git add src/world/Terrain.ts
git commit -m "feat: split terrain into 7x7 chunk grid for per-chunk frustum culling"
```

---

### Task 2: Grass Spatial Grid

**Files:**
- Modify: `src/world/GrassField.ts`
- Verify: `npx tsc --noEmit`

- [ ] **Step 1: Replace single InstancedMesh with 8x8 cell grid**

Refactor `GrassField` constructor:
1. Keep the existing scatter logic (same RNG, same biome density checks)
2. Instead of writing all instances to one `InstancedMesh`, bucket each grass blade into a cell based on `Math.floor((x + half) / cellSize)` and `Math.floor((z + half) / cellSize)` where `cellSize = terrain.size / 8`
3. First pass: count instances per cell. Second pass: create per-cell `InstancedMesh` with exact capacity, write instances
4. Each cell mesh uses the shared `makeGrassMaterial()` result
5. Add all cell meshes to the group

New private fields:
```typescript
private readonly cells: { mesh: THREE.InstancedMesh; cx: number; cz: number; filled: number }[] = []
private readonly cellSize: number
```

- [ ] **Step 2: Add per-frame distance culling to update()**

In `update()`, after updating time/wind/playerPos uniforms:
```typescript
const camPos = /* passed as new parameter */ cameraPosition
for (const cell of this.cells) {
  const dx = camPos.x - cell.cx
  const dz = camPos.z - cell.cz
  const dist = Math.sqrt(dx * dx + dz * dz)
  const range = this.grassRange // quality-tiered: 120/80/50
  if (dist > range + this.cellSize) {
    cell.mesh.visible = false
  } else if (dist > range * 0.8) {
    // Fade: reduce count at edge
    cell.mesh.visible = true
    const fade = 1 - (dist - range * 0.8) / (range * 0.2 + this.cellSize)
    cell.mesh.count = Math.floor(cell.filled * Math.max(0, fade))
  } else {
    cell.mesh.visible = true
    cell.mesh.count = cell.filled
  }
}
```

- [ ] **Step 3: Update GrassField.update() signature**

Add `cameraPosition: THREE.Vector3` parameter. Update call site in `Game.ts`:
```typescript
// Game.ts tick():
this.grass.update(dt, windDir, this.player.position, this.camera.position)
```

- [ ] **Step 4: Update setQuality() for grass range**

```typescript
setQuality(tier: QualityTier) {
  this.grassRange = tier === 'high' ? 120 : tier === 'medium' ? 80 : 50
  // Instance count factor still applies within visible cells
  const factor = tier === 'high' ? 1.0 : tier === 'medium' ? 0.6 : 0.35
  for (const cell of this.cells) {
    cell.filled = Math.floor(cell.totalScattered * factor)
  }
}
```

- [ ] **Step 5: Verify grass renders correctly**

Run: `npx tsc --noEmit`
Run: `npm run build`
Visual check: grass should appear identical when standing in a field. Walking to world edge — grass behind should disappear. Performance improvement visible on F3 debug.

- [ ] **Step 6: Commit**

```bash
git add src/world/GrassField.ts src/game/Game.ts
git commit -m "feat: grass spatial grid with distance-based per-cell culling"
```

---

### Task 3: Vegetation Spatial Grid + LOD

**Files:**
- Modify: `src/world/Vegetation.ts`
- Verify: `npx tsc --noEmit`

This is the largest task. Split into sub-steps.

- [ ] **Step 1: Refactor tree geometry — displaced icosahedron canopy**

Replace `DodecahedronGeometry(0.85, 0)` with `IcosahedronGeometry(0.85, 1)` in `makeTreeGeometry()`. Add noise displacement:

```typescript
function displaceCanopy(geo: THREE.BufferGeometry, seed: number) {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i)
    // Simple hash displacement along normal
    const h = Math.sin(pos.getX(i) * 12.9898 + pos.getY(i) * 78.233 + seed) * 43758.5453
    const disp = (h - Math.floor(h)) * 0.25 - 0.125 // [-0.125, 0.125]
    pos.setXYZ(i, pos.getX(i) + nx * disp, pos.getY(i) + ny * disp, pos.getZ(i) + nz * disp)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
}
```

Call `displaceCanopy(canopy, 0)` after creating the canopy geometry. For pine: add slight displacement to cone too.

- [ ] **Step 2: Add leaf translucency + canopy AO to tree shader**

Modify `makeTreeWindMaterial()`:

Add uniform: `uSunDir: { value: new THREE.Vector3(0, 1, 0) }`

Add varying `vLocalY` in vertex shader (pass `position.y` before instance transform).

In fragment shader, after existing `col` computation:
```glsl
// Leaf translucency
vec3 sunDir = normalize(uSunDir);
float scatter = pow(max(0.0, dot(-V, sunDir)), 3.0) * vIsLeaf;
vec3 scatterColor = col * vec3(1.2, 1.1, 0.6);
col += scatterColor * scatter * 0.35;

// Canopy self-AO (dark at base, light at top)
float canopyH = clamp((vLocalY - 1.4) / 1.6, 0.0, 1.0); // 1.4 = trunk height
float selfAO = smoothstep(0.0, 0.4, canopyH);
col *= (0.7 + 0.3 * selfAO) * mix(1.0, 1.0, 1.0 - vIsLeaf); // only apply to leaves

// Bark variation
float barkN = hash(vWorldPos.xz * 2.0 + vWorldPos.y * 0.5);
col = mix(col, col * (0.85 + 0.15 * barkN), 1.0 - vIsLeaf);
```

- [ ] **Step 3: Update Vegetation.update() to pass sunDir**

Add `sunDir: THREE.Vector3` parameter to `update()`. In the loop over mats:
```typescript
m.uniforms.uSunDir.value.copy(sunDir)
```

Update call site in `Game.ts`:
```typescript
this.vegetation.update(dt, windDir, this.sky.sunDirection)
```

- [ ] **Step 4: Verify tree visual upgrades**

Run: `npx tsc --noEmit`
Run: `npm run build`
Visual check: trees should have organic lumpy canopies (not perfect spheres/cones). At dusk with sun behind trees, canopies should glow warm. Canopy bases should be darker than tops.

- [ ] **Step 5: Commit tree upgrades**

```bash
git add src/world/Vegetation.ts src/game/Game.ts
git commit -m "feat: displaced icosahedron canopy, leaf translucency, canopy AO"
```

- [ ] **Step 6: Implement spatial grid infrastructure**

Refactor the constructor to scatter into an 8x8 grid:

```typescript
private readonly cells: VegCell[] = []
private readonly cellSize: number

type VegCell = {
  cx: number; cz: number // cell center world coords
  deciduous: THREE.InstancedMesh | null
  pine: THREE.InstancedMesh | null
  billboard: THREE.InstancedMesh | null // lazily created
  deciduousFilled: number
  pineFilled: number
}
```

Construction algorithm:
1. Run existing scatter loop, but instead of writing to global meshes, collect `{ x, z, y, isPine, scale, rotation }` per tree
2. Bucket into cells: `cellCol = Math.floor((x + half) / cellSize)`, `cellRow = Math.floor((z + half) / cellSize)`
3. For each cell: create `InstancedMesh` per tree type with exact count. Write instance matrices. Call `geometry.computeBoundingSphere()`.
4. Add all cell meshes to `this.object3d`

- [ ] **Step 7: Implement LOD band management in update()**

Add `cameraPosition: THREE.Vector3` parameter to `update()`.

```typescript
const LOD_FULL = 150
const LOD_REDUCED = 350
const LOD_BILLBOARD = 600

for (const cell of this.cells) {
  const dx = cameraPosition.x - cell.cx
  const dz = cameraPosition.z - cell.cz
  const dist = Math.sqrt(dx * dx + dz * dz)

  if (dist > LOD_BILLBOARD + this.cellSize) {
    // Culled
    if (cell.deciduous) cell.deciduous.visible = false
    if (cell.pine) cell.pine.visible = false
    if (cell.billboard) cell.billboard.visible = false
  } else if (dist > LOD_REDUCED + this.cellSize) {
    // Billboard band
    if (cell.deciduous) cell.deciduous.visible = false
    if (cell.pine) cell.pine.visible = false
    this.ensureBillboard(cell)
    cell.billboard!.visible = true
  } else {
    // Full or reduced band
    if (cell.deciduous) cell.deciduous.visible = true
    if (cell.pine) cell.pine.visible = true
    if (cell.billboard) cell.billboard.visible = false
    // Toggle wind sway based on distance
    const swayEnabled = dist < LOD_FULL + this.cellSize ? 1.0 : 0.0
    // Set via per-cell material uniform if needed, or global
  }
}
```

- [ ] **Step 8: Implement billboard mesh creation**

```typescript
private ensureBillboard(cell: VegCell) {
  if (cell.billboard) return
  // Create billboard InstancedMesh from cell's tree positions
  const totalTrees = cell.deciduousFilled + cell.pineFilled
  if (totalTrees === 0) return

  const geo = new THREE.PlaneGeometry(1.8, 3.0) // tree-sized quad
  const mat = makeBillboardMaterial(this.avgLeafColor)
  const mesh = new THREE.InstancedMesh(geo, mat, totalTrees)
  // Copy positions from deciduous + pine instance matrices (just position, billboard shader handles rotation)
  // ... (extract position from each instance matrix, write to billboard instances)
  mesh.instanceMatrix.needsUpdate = true
  mesh.frustumCulled = true
  cell.billboard = mesh
  this.object3d.add(mesh)
}
```

Billboard vertex shader always faces camera:
```glsl
// Billboard vertex shader
vec4 wp = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); // instance origin
vec3 toCamera = normalize(cameraPosition - wp.xyz);
vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
vec3 up = vec3(0.0, 1.0, 0.0);
wp.xyz += right * position.x + up * position.y;
gl_Position = projectionMatrix * viewMatrix * wp;
```

- [ ] **Step 9: Update Game.ts to pass camera position to vegetation**

```typescript
this.vegetation.update(dt, windDir, this.sky.sunDirection, this.camera.position)
```

- [ ] **Step 10: Verify spatial grid + LOD**

Run: `npx tsc --noEmit`
Run: `npm run build`
Visual check: trees should look identical up close. Walking away — at ~150u trees stop swaying. At ~350u trees become flat billboards. At ~600u they disappear. Looking at world from mountain — only nearby trees are 3D, distant ones are billboards, very far ones gone.

- [ ] **Step 11: Commit spatial grid + LOD**

```bash
git add src/world/Vegetation.ts src/game/Game.ts
git commit -m "feat: vegetation 8x8 spatial grid with 3-band LOD (full/reduced/billboard)"
```

---

### Task 4: Frustum Culling for Walkers & POIs

**Files:**
- Modify: `src/world/WalkerMechs.ts`
- Modify: `src/world/PointsOfInterest.ts`
- Verify: `npx tsc --noEmit`

- [ ] **Step 1: Add frustum check to WalkerMechs.update()**

```typescript
// Add camera parameter to update()
update(dt: number, camera: THREE.Camera) {
  const frustum = new THREE.Frustum()
  const matrix = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix, camera.matrixWorldInverse
  )
  frustum.setFromProjectionMatrix(matrix)

  // For each walker mesh child:
  this.object3d.children.forEach(child => {
    if (!child.userData.walkerPos) return
    child.visible = frustum.containsPoint(child.userData.walkerPos as THREE.Vector3)
  })
}
```

Update call site in `Game.ts`:
```typescript
this.walkers.update(dt, this.camera)
```

- [ ] **Step 2: Add frustum check to PointsOfInterest.update()**

Same pattern. Add `camera: THREE.Camera` parameter.

Update call site in `Game.ts`:
```typescript
this.poi.update(this.player.position, this.camera)
```

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit`
Run: `npm run build`

```bash
git add src/world/WalkerMechs.ts src/world/PointsOfInterest.ts src/game/Game.ts
git commit -m "feat: frustum culling for walker mechs and POI markers"
```

---

### Task 5: Remove Dead Code

**Files:**
- Remove: `src/render/TerrainShader.ts`
- Verify: `npx tsc --noEmit`

- [ ] **Step 1: Verify TerrainShader.ts is unused**

Search for any imports of `TerrainShader` or `makeTerrainMaterial` across the codebase. Confirm zero references.

- [ ] **Step 2: Delete and commit**

```bash
rm src/render/TerrainShader.ts
git add -A src/render/TerrainShader.ts
git commit -m "chore: remove dead TerrainShader.ts (terrain uses onBeforeCompile)"
```

---

## Phase 1 Checkpoint

> **Playtest gate:** Start dev server (`npm run dev`), navigate to a mountain vista. FPS should be meaningfully better than before these changes. Grass disappears at distance. Trees LOD to billboards. Terrain chunks behind camera don't render. If FPS still drops below 45 on high tier, investigate before proceeding to Phase 2.

---

## Phase 2: Normals Pre-Pass

### Task 6: Normal Pass for SSAO

**Files:**
- Create: `src/render/NormalPass.ts`
- Modify: `src/render/PostFX.ts`
- Verify: `npx tsc --noEmit`

- [ ] **Step 1: Create NormalPass**

```typescript
// src/render/NormalPass.ts
import * as THREE from 'three'

const normalOverrideMaterial = new THREE.ShaderMaterial({
  vertexShader: /* glsl */ `
    varying vec3 vNormalW;
    void main() {
      vNormalW = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vNormalW;
    void main() {
      gl_FragColor = vec4(vNormalW * 0.5 + 0.5, 1.0); // encode [-1,1] -> [0,1]
    }
  `,
})

export class NormalPass {
  public readonly target: THREE.WebGLRenderTarget
  private enabled = true

  constructor(width: number, height: number) {
    this.target = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.UnsignedByteType,
    })
    this.target.texture.name = 'NormalTarget'
  }

  setEnabled(v: boolean) { this.enabled = v }

  resize(w: number, h: number) {
    this.target.setSize(w, h)
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    if (!this.enabled) return
    const prevOverride = scene.overrideMaterial
    scene.overrideMaterial = normalOverrideMaterial
    const prevRT = renderer.getRenderTarget()
    renderer.setRenderTarget(this.target)
    renderer.clear()
    renderer.render(scene, camera)
    scene.overrideMaterial = prevOverride
    renderer.setRenderTarget(prevRT)
  }
}
```

- [ ] **Step 2: Integrate into PostFX**

In `PostFX` constructor, create `NormalPass`. In `PostFX.render()`, call `this.normalPass.render()` before `this.composer.render()`. Wire `setQuality()` to set half-res on medium, disable on low.

- [ ] **Step 3: Verify no visual regression**

Run: `npx tsc --noEmit`
Run: `npm run build`
Visual check: scene should look identical. The normal pass runs but its output isn't consumed yet.

- [ ] **Step 4: Commit**

```bash
git add src/render/NormalPass.ts src/render/PostFX.ts
git commit -m "feat: add normals pre-pass for SSAO (output not consumed yet)"
```

---

## Phase 3: Shader Upgrades

### Task 7: Rim Lighting Upgrade

**Files:**
- Modify: `src/render/RimLight.ts`
- Modify: `src/world/Terrain.ts`
- Modify: `src/game/Game.ts`
- Verify: `npx tsc --noEmit`

- [ ] **Step 1: Upgrade RimLight.ts**

Replace the existing `onBeforeCompile` patch with the Destiny-style directional rim:

New uniforms: `uRimSkyColor`, `uRimSunColor`, `uRimIntensity` (add to existing `uRimSunDir`).

Updated GLSL (replaces existing `#include <dithering_fragment>` injection):
```glsl
vec3 Nw = normalize(normal);
vec3 Vw = normalize(-vViewPosition);
float fres = pow(1.0 - clamp(dot(Vw, Nw), 0.0, 1.0), 1.8);
// Directional: backlit objects glow strongest
float backlitFactor = clamp(dot(-Vw, normalize(uRimSunDir)), 0.0, 1.0);
float rim = fres * (0.3 + 0.7 * backlitFactor) * uRimIntensity;
gl_FragColor.rgb += rim * uRimSkyColor;
#include <dithering_fragment>
```

Update `applyRimLightToStandardMaterial` to accept `intensityScale` parameter. Store in `userData.rimScale`.

- [ ] **Step 2: Add terrain mesh exclusion**

In `applyRimLightToScene`, skip meshes with `userData.isTerrainChunk = true`. In `Terrain.ts`, tag each chunk mesh: `mesh.userData.isTerrainChunk = true`.

- [ ] **Step 3: Merge rim into Terrain's onBeforeCompile**

In `Terrain.ts`, extend the existing `onBeforeCompile` callback to include rim lighting uniforms and the same GLSL pattern, but with intensity 0.3. Add `uRimSkyColor`, `uRimSunDir` uniforms to the terrain shader.

- [ ] **Step 4: Update Game.ts to feed rim colors from sky**

Each frame in `tick()`:
```typescript
// Compute rim sky color from sky system
const rimSkyColor = new THREE.Color()
  .setHSL(0, 0, 0.8) // neutral base
  .lerp(new THREE.Color(0xffc38a), this.sky.duskAmount) // warm at dusk
  .lerp(new THREE.Color(0x4466aa), 1 - this.sky.dayAmount) // cool at night

this.rim.skyColor = rimSkyColor
// Pass to terrain material uniforms and RimLight uniforms
```

- [ ] **Step 5: Verify rim lighting**

Run: `npx tsc --noEmit`
Run: `npm run build`
Visual check: enable time cycling (set `sky.freezeTime = false`). At dusk, objects between camera and sun should glow warm at edges. Terrain edges should have subtle rim. Night should have cool blue rim.

- [ ] **Step 6: Commit**

```bash
git add src/render/RimLight.ts src/world/Terrain.ts src/game/Game.ts
git commit -m "feat: Destiny-style directional rim lighting with sky-sampled colors"
```

---

### Task 8: Atmospheric Haze

**Files:**
- Create: `src/render/AtmosphericHaze.ts`
- Modify: `src/render/PostFX.ts`
- Modify: `src/world/SkySystem.ts`
- Modify: `src/game/Game.ts`
- Verify: `npx tsc --noEmit`

- [ ] **Step 1: Remove FogExp2 from SkySystem**

In `SkySystem.ts`:
- Remove the `private readonly fog: THREE.FogExp2` field
- Remove `this.fog = new THREE.FogExp2(...)` and `this.scene.fog = this.fog` from constructor
- Remove `this.fog.color.copy(fogCol)` and `this.fog.density = ...` from update()
- Keep the `fogCol` computation logic — export it as public properties for the haze effect to consume:
  ```typescript
  public readonly hazeColor = new THREE.Color()
  // In update(): compute hazeColor from day/dusk amounts
  ```

- [ ] **Step 2: Remove scene.fog from Game.ts**

If `Game.ts` references `scene.fog` anywhere, remove it. The atmospheric haze effect replaces all fog.

- [ ] **Step 3: Create AtmosphericHaze.ts**

```typescript
import { Effect } from 'postprocessing'
import * as THREE from 'three'

export class AtmosphericHazeEffect extends Effect {
  constructor() {
    super('AtmosphericHazeEffect', /* glsl */ `
      uniform float uDensity;
      uniform vec3 uHazeHorizon;
      uniform vec3 uHazeZenith;
      uniform float uNear;
      uniform float uFar;

      float linearizeDepth(float d) {
        return uNear * uFar / (uFar - d * (uFar - uNear));
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        // Read depth from EffectComposer's depth buffer (automatically available as 'depth' in postprocessing)
        float d = texture2D(depthBuffer, uv).r; // postprocessing provides depthBuffer
        float worldDist = linearizeDepth(d);
        float hazeAmount = 1.0 - exp(-worldDist * uDensity);
        hazeAmount = clamp(hazeAmount, 0.0, 0.95);
        vec3 hazeColor = mix(uHazeHorizon, uHazeZenith, clamp(uv.y * 1.5 - 0.1, 0.0, 1.0));
        outputColor = vec4(mix(inputColor.rgb, hazeColor, hazeAmount), 1.0);
      }
    `, {
      uniforms: new Map<string, THREE.Uniform>([
        ['uDensity', new THREE.Uniform(0.0025)],
        ['uHazeHorizon', new THREE.Uniform(new THREE.Color(0.65, 0.72, 0.82))],
        ['uHazeZenith', new THREE.Uniform(new THREE.Color(0.45, 0.55, 0.75))],
        ['uNear', new THREE.Uniform(0.1)],
        ['uFar', new THREE.Uniform(2000)],
      ]),
    })
  }

  setHazeColors(horizon: THREE.Color, zenith: THREE.Color) {
    (this.uniforms.get('uHazeHorizon') as THREE.Uniform).value.copy(horizon)
    ;(this.uniforms.get('uHazeZenith') as THREE.Uniform).value.copy(zenith)
  }

  setDensity(v: number) {
    (this.uniforms.get('uDensity') as THREE.Uniform).value = v
  }
}
```

- [ ] **Step 4: Replace FogVeil in PostFX effect chain**

In `PostFX.ts`:
- Remove `FogVeilEffect` class and its instantiation
- Remove `BiomePaletteEffect` (will be replaced by CinematicGrade in next task, but remove now to avoid broken chain)
- Add `AtmosphericHazeEffect` to the `EffectPass`
- Keep `ToonRampEffect` temporarily until CinematicGrade replaces it

- [ ] **Step 5: Wire haze updates in PostFX.update()**

Add parameters for haze horizon/zenith colors and density. Driven from `SkySystem.hazeColor` and `SkySystem.dayAmount`/`duskAmount` in `Game.ts`.

- [ ] **Step 6: Verify atmospheric haze**

Run: `npx tsc --noEmit`
Run: `npm run build`
Visual check: distant mountains should fade into a colored haze. At dusk, haze should be golden-amber. At night, deep blue-violet. The old screen-space fog noise is gone — haze should be smooth and depth-correct.

- [ ] **Step 7: Commit**

```bash
git add src/render/AtmosphericHaze.ts src/render/PostFX.ts src/world/SkySystem.ts src/game/Game.ts
git commit -m "feat: depth-aware atmospheric haze (replaces FogVeil + FogExp2)"
```

---

### Task 9: Cinematic Color Grading

**Files:**
- Create: `src/render/CinematicGrade.ts`
- Modify: `src/render/PostFX.ts`
- Verify: `npx tsc --noEmit`

- [ ] **Step 1: Create CinematicGradeEffect**

Lift/gamma/gain + split-toning + contrast S-curve + vignette, all in one fragment shader.

```typescript
import { Effect } from 'postprocessing'
import * as THREE from 'three'

export class CinematicGradeEffect extends Effect {
  constructor() {
    super('CinematicGradeEffect', /* glsl */ `
      uniform vec3 uLift;    // shadow color shift
      uniform vec3 uGamma;   // midtone color shift
      uniform vec3 uGain;    // highlight color shift
      uniform float uSaturation;
      uniform float uContrast;
      uniform vec3 uSplitShadow;
      uniform vec3 uSplitHighlight;
      uniform float uVignetteAmount;
      uniform float uDayAmount;
      uniform float uDuskAmount;

      vec3 liftGammaGain(vec3 col, vec3 lift, vec3 gamma, vec3 gain) {
        vec3 lerpV = clamp(pow(col, vec3(1.0 / 1.6)), 0.0, 1.0);
        vec3 shadowed = mix(lift, vec3(1.0), lerpV);
        vec3 midtoned = pow(shadowed, 1.0 / gamma);
        vec3 highlighted = midtoned * gain;
        return highlighted;
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 col = inputColor.rgb;

        // Lift/gamma/gain
        col = liftGammaGain(col, uLift, uGamma, uGain);

        // Saturation
        float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(lum), col, uSaturation);

        // Contrast S-curve
        col = clamp(col, 0.0, 1.0);
        col = col * col * (3.0 - 2.0 * col); // smoothstep as S-curve
        col = mix(inputColor.rgb, col, uContrast);

        // Split-toning
        float lumFinal = dot(col, vec3(0.2126, 0.7152, 0.0722));
        vec3 shadowTone = mix(col, col * uSplitShadow, (1.0 - lumFinal) * 0.3);
        vec3 highTone = mix(col, col * uSplitHighlight, lumFinal * 0.25);
        col = mix(shadowTone, highTone, lumFinal);

        // Vignette
        vec2 vc = uv - 0.5;
        float vignette = 1.0 - dot(vc, vc) * uVignetteAmount;
        col *= vignette;

        outputColor = vec4(col, 1.0);
      }
    `, {
      uniforms: new Map<string, THREE.Uniform>([
        ['uLift', new THREE.Uniform(new THREE.Color(0.92, 0.94, 1.05))],
        ['uGamma', new THREE.Uniform(new THREE.Color(1.0, 1.0, 1.0))],
        ['uGain', new THREE.Uniform(new THREE.Color(1.06, 1.02, 0.95))],
        ['uSaturation', new THREE.Uniform(0.88)],
        ['uContrast', new THREE.Uniform(0.65)],
        ['uSplitShadow', new THREE.Uniform(new THREE.Color(0.85, 0.88, 1.05))],
        ['uSplitHighlight', new THREE.Uniform(new THREE.Color(1.08, 1.02, 0.92))],
        ['uVignetteAmount', new THREE.Uniform(1.2)],
        ['uDayAmount', new THREE.Uniform(1.0)],
        ['uDuskAmount', new THREE.Uniform(0.0)],
      ]),
    })
  }

  setTimeOfDay(day: number, dusk: number) {
    (this.uniforms.get('uDayAmount') as THREE.Uniform).value = day
    ;(this.uniforms.get('uDuskAmount') as THREE.Uniform).value = dusk
  }
}
```

- [ ] **Step 2: Replace ToonRamp in PostFX**

Remove `ToonRampEffect` class. Add `CinematicGradeEffect` to the `EffectPass`, positioned after atmospheric haze.

- [ ] **Step 3: Wire time-of-day updates**

In `PostFX.update()`, call `this.cinematicGrade.setTimeOfDay(dayAmount, duskAmount)`.

- [ ] **Step 4: Verify color grading**

Run: `npx tsc --noEmit`
Run: `npm run build`
Visual check: the world should look filmic — warm highlights, cool shadows, subtle vignette. Compare before/after: no more anime toon ramp bands. Dusk should feel cinematic with amber highlights and blue shadows.

- [ ] **Step 5: Commit**

```bash
git add src/render/CinematicGrade.ts src/render/PostFX.ts
git commit -m "feat: cinematic color grading (replaces ToonRamp + BiomePalette)"
```

---

### Task 10: SSAO + Contact Shadows

**Files:**
- Create: `src/render/SSAOEffect.ts`
- Modify: `src/render/PostFX.ts`
- Verify: `npx tsc --noEmit`

- [ ] **Step 1: Create SSAOEffect**

Screen-space ambient occlusion with contact shadow. Reads depth buffer (from EffectComposer) and normal texture (from NormalPass).

Key uniforms: `tNormals` (normal texture), `uRadius` (sample radius), `uBias`, `uIntensity`, `uSunDir` (for contact shadow), `uNear`, `uFar`, `uSampleCount`, `uContactSteps`.

The GLSL samples a hemisphere of directions around each pixel, reads depth at each sample point, compares to expected depth to estimate occlusion. Contact shadow raymarches along sun direction.

This is a complex shader — implement in `src/render/SSAOEffect.ts` as a `postprocessing` Effect subclass with ~80 lines of GLSL.

- [ ] **Step 2: Wire into PostFX**

Add `SSAOEffect` as the first effect in the `EffectPass` (before atmospheric haze and grading). Pass `normalPass.target.texture` as the `tNormals` uniform.

In `setQuality()`: high = 12 samples full-res, medium = 8 samples (set `uSampleCount`), low = intensity 0 (effectively disabled).

- [ ] **Step 3: Verify SSAO**

Run: `npx tsc --noEmit`
Run: `npm run build`
Visual check: terrain creases should be subtly darker. Tree bases should be darker where they meet terrain. The effect should be subtle — not dark halos, just grounding.

- [ ] **Step 4: Commit**

```bash
git add src/render/SSAOEffect.ts src/render/PostFX.ts
git commit -m "feat: screen-space AO + contact shadows with quality tiering"
```

---

### Task 11: Depth of Field

**Files:**
- Create: `src/render/DOFEffect.ts`
- Modify: `src/render/PostFX.ts`
- Modify: `src/game/Game.ts`
- Verify: `npx tsc --noEmit`

- [ ] **Step 1: Create DOFEffect**

Hexagonal bokeh DOF. Reads depth buffer. Two zones: near (sharp) and far (soft blur).

Key uniforms: `uFocusDist`, `uFarStart`, `uFarEnd`, `uBlurAmount`, `uNear`, `uFar`.

6-tap hexagonal blur kernel in the fragment shader.

- [ ] **Step 2: Wire into PostFX**

Add after CinematicGrade in the effect chain. In `PostFX.update()`, accept `playerMoving: boolean` parameter. Interpolate `uBlurAmount` toward 0 when moving, toward target when stationary for >1s.

- [ ] **Step 3: Update Game.ts**

Pass player movement state to PostFX:
```typescript
const playerMoving = this.player.velocity.length() > 0.5
this.postfx.update(dt, sunUv, godAmt * 0.55, fogAmt, this.camera.position.y, playerMoving)
```

- [ ] **Step 4: Verify DOF**

Run: `npx tsc --noEmit`
Run: `npm run build`
Visual check: stand still on a hilltop looking at distant mountains. After ~1s, mountains should gently blur. Start moving — blur fades out. The effect should be very subtle.

- [ ] **Step 5: Commit**

```bash
git add src/render/DOFEffect.ts src/render/PostFX.ts src/game/Game.ts
git commit -m "feat: depth of field with movement-aware dynamic blur"
```

---

### Task 12: Chromatic Aberration

**Files:**
- Create: `src/render/ChromaticAberration.ts`
- Modify: `src/render/PostFX.ts`
- Verify: `npx tsc --noEmit`

- [ ] **Step 1: Create ChromaticAberrationEffect**

Combined chromatic aberration + film grain in one final composite effect (replaces the existing `FilmGrainEffect`).

```glsl
// Chromatic aberration
vec2 dir = uv - 0.5;
float dist2 = dot(dir, dir);
float offset = uChromaticAmount * dist2;
float r = texture2D(inputBuffer, uv + dir * offset).r;
float g = inputColor.g;
float b = texture2D(inputBuffer, uv - dir * offset).b;
vec3 col = vec3(r, g, b);

// Film grain (existing logic)
float grain = hash(uv * (800.0 + uTime * 0.07) + vec2(uTime * 0.13));
col += (grain * 2.0 - 1.0) * uGrainAmount;
```

- [ ] **Step 2: Replace FilmGrainEffect in PostFX**

Remove `FilmGrainEffect`. Add `ChromaticAberrationEffect` as the last effect in the chain.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Run: `npm run build`
Visual check: look at screen edges — very subtle color fringing. Should be barely noticeable. Film grain still present.

- [ ] **Step 4: Commit**

```bash
git add src/render/ChromaticAberration.ts src/render/PostFX.ts
git commit -m "feat: chromatic aberration + film grain composite (final post-fx)"
```

---

## Phase 3 Checkpoint

> **Playtest gate:** The full Destiny 1 visual pipeline is now active. Check these at various times of day:
> - Rim lighting changes with sun position (backlit objects glow)
> - Atmospheric haze gives depth to vistas (golden at dusk, blue-grey at noon)
> - Color grading feels filmic not cartoony (cool shadows, warm highlights)
> - SSAO grounds objects (check tree bases, mech feet)
> - DOF activates when standing still on a vista
> - Trees glow warm when backlit at golden hour
> - Performance is still 60fps on mountain vistas

---

## Phase 4: Polish

### Task 13: Quality Tier Wiring

**Files:**
- Modify: `src/game/PerformanceManager.ts`
- Modify: `src/render/PostFX.ts`
- Modify: `src/game/Game.ts`
- Verify: `npx tsc --noEmit`

- [ ] **Step 1: Expand PerformanceManager tier definitions**

Add tier thresholds for all new effects. The existing `PerformanceManager` tracks EMA frame time and switches tiers. Add exported constants for the new effect parameters per tier.

- [ ] **Step 2: Wire all new effects into PostFX.setQuality()**

```typescript
setQuality(tier: QualityTier) {
  this.quality = tier
  // SSAO
  this.ssao.setIntensity(tier === 'low' ? 0 : 0.6)
  this.ssao.setSampleCount(tier === 'high' ? 12 : 8)
  // Atmospheric haze detail
  // DOF taps
  this.dof.setTapCount(tier === 'high' ? 6 : tier === 'medium' ? 4 : 0)
  // Chromatic aberration
  this.chromaticAberration.setEnabled(tier !== 'low')
  // Normal pass
  this.normalPass.setEnabled(tier !== 'low')
  // God rays (tighter budget)
  this.godRays.setSamples(tier === 'high' ? 20 : tier === 'medium' ? 12 : 8)
  // Film grain
  this.chromaticAberration.setGrainAmount(tier === 'low' ? 0 : tier === 'medium' ? 0.010 : 0.012)
}
```

- [ ] **Step 3: Wire vegetation LOD distances per tier**

In `Game.ts`, when tier changes:
```typescript
this.vegetation.setLODDistances(tier)
this.grass.setQuality(tier) // already done
```

- [ ] **Step 4: Verify tier switching**

Run: `npx tsc --noEmit`
Run: `npm run build`
Visual check: press F3 to see tier debug. Force low tier — SSAO off, DOF off, chromatic off, grass sparse. Force high — everything on. Transitions should be smooth.

- [ ] **Step 5: Commit**

```bash
git add src/game/PerformanceManager.ts src/render/PostFX.ts src/game/Game.ts src/world/Vegetation.ts
git commit -m "feat: quality tier wiring for all new visual effects"
```

---

### Task 14: Parameter Tuning

**Files:**
- Modify: various (PostFX, Game, SkySystem)
- Verify: visual inspection

- [ ] **Step 1: Per-biome haze colors**

Tune atmospheric haze horizon/zenith colors per biome. Forest biomes → greener haze. Mountain → cooler/clearer. Plains → neutral blue-grey. Feed biome at camera position to the haze effect.

- [ ] **Step 2: Time-of-day sweep**

Cycle through dawn → noon → dusk → midnight. Verify:
- Rim color transitions smoothly
- Haze color matches sky at each phase
- Color grading warm/cool balance feels right
- SSAO intensity doesn't fight with dark night

Adjust uniforms as needed.

- [ ] **Step 3: DOF focus distance tuning**

Test on various terrain heights. The auto-focus (terrain height at screen center) should keep mid-ground sharp and blur far mountains. Adjust `uFarStart`/`uFarEnd` ranges.

- [ ] **Step 4: Commit tuning pass**

```bash
git add -A
git commit -m "polish: tune atmosphere, grading, and DOF parameters per biome and time of day"
```

---

## Final Checkpoint

> **Success criteria verification:**
> - [ ] 60fps on mountain vistas at high quality tier
> - [ ] Vegetation at <30% of original draw cost on vistas
> - [ ] Rim lighting varies with sun position
> - [ ] Atmospheric haze distinct per biome
> - [ ] Color grading reads as filmic
> - [ ] Trees glow when backlit
> - [ ] SSAO grounds objects
> - [ ] DOF activates when stationary

Update `progress.md` and `task_plan.md` with results.
