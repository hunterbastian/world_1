import * as THREE from 'three'
import type { Terrain } from './Terrain'
import type { POI } from './PointsOfInterest'
import { WalkerMech } from './WalkerMech'

type Options = {
  terrain: Terrain
  seed: string
  /** Must match player spawn (e.g. terrain.findFlatSpawn(1337)) for guaranteed Scout placement. */
  playerSpawn: THREE.Vector3
  pois: readonly POI[]
}

function hash01(seed: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 0xffffffff
}

function makeRng(seed: string) {
  let s = Math.floor(hash01(seed) * 0x7fffffff) || 1
  return () => {
    s = (Math.imul(48271, s) % 0x7fffffff) >>> 0
    return s / 0x7fffffff
  }
}

function distXZ(a: THREE.Vector3, b: THREE.Vector3) {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.hypot(dx, dz)
}

function minDistToPlaced(p: THREE.Vector3, placed: readonly THREE.Vector3[], minD: number) {
  for (const q of placed) {
    if (distXZ(p, q) < minD) return false
  }
  return true
}

function ruinPoiPositions(pois: readonly POI[]) {
  return pois.filter((p) => p.type === 'ruin').map((p) => p.position)
}

export class WalkerMechs {
  public readonly object3d: THREE.Object3D
  public readonly walkers: WalkerMech[] = []

  private readonly terrain: Terrain

  constructor(opts: Options) {
    this.terrain = opts.terrain
    this.object3d = new THREE.Group()
    this.object3d.name = 'WalkerMechs'

    const rng = makeRng(`${opts.seed}:walkers`)
    const minSep = 60
    const placed: THREE.Vector3[] = []
    const ruins = ruinPoiPositions(opts.pois)

    const scoutNames = ['Argos', 'Fenrir', 'Baldr']
    const assaultNames = ['Tyr', 'Typhon', 'Cerberus']

    // --- Scouts: grassy_plains, one guaranteed near player spawn ---
    const nearSpawn = this.pickScoutNearSpawn(opts.playerSpawn, rng)
    if (nearSpawn) {
      placed.push(nearSpawn.clone())
      this.spawnWalker('scout', scoutNames[0]!, nearSpawn, rng())
      this.scatterScouts(2, placed, rng, minSep, scoutNames.slice(1))
    } else {
      this.scatterScouts(3, placed, rng, minSep, scoutNames)
    }

    // --- Assaults: deep_forest / mountains, biased toward ruins; never open grasslands ---
    const assaultCount = 3
    this.scatterAssaults(assaultCount, placed, rng, minSep, ruins, assaultNames)
  }

  update(dt: number) {
    for (const w of this.walkers) w.update(dt)
  }

  private spawnWalker(
    tier: 'scout' | 'assault',
    name: string,
    pos: THREE.Vector3,
    yaw01: number
  ) {
    const mech = new WalkerMech(tier, name)
    const y = this.terrain.heightAtXZ(pos.x, pos.z)
    mech.object3d.position.set(pos.x, y - 0.3, pos.z)
    mech.object3d.rotation.y = yaw01 * Math.PI * 2
    this.object3d.add(mech.object3d)
    this.walkers.push(mech)
  }

  private pickScoutNearSpawn(spawn: THREE.Vector3, rng: () => number): THREE.Vector3 | null {
    const tries = 420
    let best: THREE.Vector3 | null = null
    let bestScore = -Infinity

    for (let i = 0; i < tries; i++) {
      const ang = rng() * Math.PI * 2
      const t = rng()
      const r = THREE.MathUtils.lerp(40, 80, t)
      const x = spawn.x + Math.cos(ang) * r
      const z = spawn.z + Math.sin(ang) * r
      const biome = this.terrain.biomeAtXZ(x, z)
      if (biome !== 'grassy_plains') continue

      const h = this.terrain.heightAtXZ(x, z)
      if (h < this.terrain.seaLevel + 1) continue
      const slope = this.terrain.slopeAtXZ(x, z)
      if (slope >= 0.25) continue

      const dSpawn = distXZ(new THREE.Vector3(x, 0, z), spawn)
      const slopeScore = 1 - slope / 0.25
      const distScore = 1 - Math.abs(dSpawn - 58) / 58
      const score = slopeScore * 1.4 + distScore * 0.9
      if (score > bestScore) {
        bestScore = score
        best = new THREE.Vector3(x, h, z)
      }
    }

    return best
  }

  private scatterScouts(
    count: number,
    placed: THREE.Vector3[],
    rng: () => number,
    minSep: number,
    names: string[]
  ) {
    const half = this.terrain.size * 0.5
    const samples = 900
    type Cand = { p: THREE.Vector3; score: number; yaw: number }
    const cands: Cand[] = []

    for (let i = 0; i < samples; i++) {
      const x = (rng() * 2 - 1) * half
      const z = (rng() * 2 - 1) * half
      const biome = this.terrain.biomeAtXZ(x, z)
      if (biome !== 'grassy_plains') continue
      const h = this.terrain.heightAtXZ(x, z)
      if (h < this.terrain.seaLevel + 1) continue
      const slope = this.terrain.slopeAtXZ(x, z)
      if (slope >= 0.25) continue
      const p = new THREE.Vector3(x, h, z)
      if (!minDistToPlaced(p, placed, minSep)) continue

      const slopeScore = 1 - slope / 0.25
      const score = slopeScore + rng() * 0.08
      cands.push({ p, score, yaw: rng() })
    }

    cands.sort((a, b) => b.score - a.score)

    let ni = 0
    for (const c of cands) {
      if (count <= 0) break
      if (!minDistToPlaced(c.p, placed, minSep)) continue
      const name = names[ni] ?? `Scout-${ni + 2}`
      ni++
      placed.push(c.p.clone())
      this.spawnWalker('scout', name, c.p, c.yaw)
      count--
    }
  }

  private scatterAssaults(
    count: number,
    placed: THREE.Vector3[],
    rng: () => number,
    minSep: number,
    ruinPositions: readonly THREE.Vector3[],
    names: string[]
  ) {
    const half = this.terrain.size * 0.5
    const samples = 1100
    type Cand = { p: THREE.Vector3; score: number; yaw: number }
    const cands: Cand[] = []

    for (let i = 0; i < samples; i++) {
      const x = (rng() * 2 - 1) * half
      const z = (rng() * 2 - 1) * half
      const biome = this.terrain.biomeAtXZ(x, z)
      if (biome === 'grassy_plains') continue

      const h = this.terrain.heightAtXZ(x, z)
      if (h < this.terrain.seaLevel + 2) continue
      const slope = this.terrain.slopeAtXZ(x, z)
      if (slope >= 0.32) continue

      const p = new THREE.Vector3(x, h, z)
      if (!minDistToPlaced(p, placed, minSep)) continue

      let biomeScore = 0
      if (biome === 'deep_forest') biomeScore = 3.2
      else if (biome === 'snowy_mountains') biomeScore = 1.1

      let ruinScore = 0
      for (const r of ruinPositions) {
        const d = distXZ(p, r)
        if (d < 95) ruinScore = Math.max(ruinScore, 2.8 * (1 - d / 95))
      }

      const heightScore = THREE.MathUtils.clamp((h - 4) / 42, 0, 1) * 0.55
      const slopePenalty = slope * 1.2
      const score = biomeScore + ruinScore + heightScore - slopePenalty + rng() * 0.06
      if (score < 0.35) continue
      cands.push({ p, score, yaw: rng() })
    }

    cands.sort((a, b) => b.score - a.score)

    let ni = 0
    for (const c of cands) {
      if (count <= 0) break
      if (!minDistToPlaced(c.p, placed, minSep)) continue
      const name = names[ni] ?? `Assault-${ni + 1}`
      ni++
      placed.push(c.p.clone())
      this.spawnWalker('assault', name, c.p, c.yaw)
      count--
    }
  }
}
