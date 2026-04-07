import * as THREE from 'three'
import type { Terrain } from './Terrain'

export type POIType = 'ruin' | 'shrine' | 'camp'

export type POI = {
  id: string
  type: POIType
  position: THREE.Vector3
  discovered: boolean
  loreTitle: string
  loreBody: string
  orb: THREE.Object3D
  restPoint: boolean
}

type Options = {
  seed: string
  terrain: Terrain
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

export class PointsOfInterest {
  public readonly object3d: THREE.Object3D
  public readonly pois: POI[] = []

  private readonly terrain: Terrain
  private readonly listeners = new Set<(poi: POI) => void>()

  constructor(opts: Options) {
    this.terrain = opts.terrain
    this.object3d = new THREE.Group()
    this.object3d.name = 'PointsOfInterest'

    const rng = makeRng(`${opts.seed}:poi`)
    this.spawnPOIs(rng)
  }

  onDiscover(cb: (poi: POI) => void) {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  nearestUndiscovered(from: THREE.Vector3) {
    let best: POI | null = null
    let bestD2 = Infinity
    for (const poi of this.pois) {
      if (poi.discovered) continue
      const dx = poi.position.x - from.x
      const dz = poi.position.z - from.z
      const d2 = dx * dx + dz * dz
      if (d2 < bestD2) {
        bestD2 = d2
        best = poi
      }
    }
    return best
  }

  update(playerPos: THREE.Vector3) {
    const pickRadius = 2.1
    for (const poi of this.pois) {
      if (poi.discovered) continue
      const d = poi.position.distanceTo(playerPos)
      if (d < pickRadius) {
        poi.discovered = true
        poi.orb.visible = false
        for (const cb of this.listeners) cb(poi)
      }
    }
  }

  private spawnPOIs(rng: () => number) {
    const half = this.terrain.size * 0.5
    const types: POIType[] = ['ruin', 'shrine', 'camp', 'ruin', 'camp', 'shrine']

    for (let i = 0; i < types.length; i++) {
      const type = types[i]!

      const pos = this.pickLocation(rng, type, half)
      const base = this.makePOIMesh(type)
      base.position.copy(pos)
      this.object3d.add(base)

      const orb = this.makeOrb()
      orb.position.copy(pos).add(new THREE.Vector3(0, 1.35, 0))
      this.object3d.add(orb)

      const poi: POI = {
        id: `${type}-${i}`,
        type,
        position: pos.clone(),
        discovered: false,
        loreTitle: this.loreTitle(type),
        loreBody: this.loreBody(type),
        orb,
        restPoint: type === 'camp',
      }
      this.pois.push(poi)
    }
  }

  private pickLocation(rng: () => number, type: POIType, half: number) {
    const attempts = 400
    let best = new THREE.Vector3(0, 0, 0)
    let bestScore = -Infinity

    for (let i = 0; i < attempts; i++) {
      const x = (rng() * 2 - 1) * half
      const z = (rng() * 2 - 1) * half
      const y = this.terrain.heightAtXZ(x, z)
      const biome = this.terrain.biomeAtXZ(x, z)

      // Simple heuristic scoring per POI type.
      let score = -Math.abs(y) * 0.05
      if (type === 'shrine') score += biome === 'snowy_mountains' ? 2.0 : 0.2
      if (type === 'camp') score += biome === 'autumn_forest' ? 1.4 : 0.6
      if (type === 'ruin') score += biome !== 'snowy_mountains' ? 1.1 : 0.1

      // Prefer not too close to sea.
      score -= Math.max(0, (-1 - y) * 0.2)

      if (score > bestScore) {
        bestScore = score
        best.set(x, y, z)
      }
    }

    return best
  }

  private makeOrb() {
    const group = new THREE.Group()
    group.name = 'DiscoveryOrb'

    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x86d7ff,
        emissive: 0x55c9ff,
        emissiveIntensity: 1.0,
        roughness: 0.3,
        metalness: 0.0,
      })
    )
    group.add(m)

    const light = new THREE.PointLight(0x7ad8ff, 1.2, 7, 2)
    light.position.set(0, 0, 0)
    group.add(light)

    return group
  }

  private makePOIMesh(type: POIType) {
    const group = new THREE.Group()
    group.name = `POI:${type}`

    const stone = new THREE.MeshStandardMaterial({ color: 0x6f7782, roughness: 1, metalness: 0 })
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1, metalness: 0 })

    if (type === 'ruin') {
      const a = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 2.2), stone)
      a.position.y = 0.3
      group.add(a)
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), stone)
      b.position.set(0.9, 0.9, -0.6)
      b.rotation.y = 0.3
      group.add(b)
    } else if (type === 'shrine') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.5, 8), stone)
      base.position.y = 0.25
      group.add(base)
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 2.2, 7), stone)
      pillar.position.y = 1.35
      group.add(pillar)
      const top = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), stone)
      top.position.y = 2.55
      group.add(top)
    } else {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.12, 6, 12), wood)
      ring.rotation.x = Math.PI / 2
      ring.position.y = 0.2
      group.add(ring)
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.0, 6), wood)
      post.position.set(0.6, 0.5, 0.6)
      group.add(post)
    }

    return group
  }

  private loreTitle(type: POIType) {
    if (type === 'shrine') return `Shrine of the Pale Sun`
    if (type === 'camp') return `Ashen Campfire`
    return `Broken Stones`
  }

  private loreBody(type: POIType) {
    if (type === 'shrine')
      return `A weatherworn altar faces the horizon. The carvings are softened by wind and time, but the devotion remains unmistakable.`
    if (type === 'camp')
      return `Someone rested here recently—or long ago. The circle of stones is deliberate, like a promise that warmth can be found again.`
    return `The ruins don’t announce what they were. They simply persist, letting the land reclaim the edges while memory clings to the shape.`
  }
}

