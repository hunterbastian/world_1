import * as THREE from 'three'
import type { Terrain } from './Terrain'
import { PostFX } from '../render/PostFX'
import { biomeIndex } from './Biomes'

export class Landmarks {
  public readonly object3d: THREE.Object3D

  constructor(terrain: Terrain) {
    this.object3d = new THREE.Group()
    this.object3d.name = 'Landmarks'

    const castle = this.makeRuinedCastle()
    this.placeCastleOnMegaMountain(terrain, castle)
    this.object3d.add(castle)
  }

  private placeCastleOnMegaMountain(terrain: Terrain, castle: THREE.Object3D) {
    const c = terrain.megaMountainCenterXZ

    // Try a handful of angles/radii and pick a stable-ish slope.
    const tries = 64
    let bestScore = -Infinity
    let best = new THREE.Vector3(c.x + 30, 0, c.y + 30)
    let bestYaw = 0

    for (let i = 0; i < tries; i++) {
      const a = (i / tries) * Math.PI * 2
      const r = THREE.MathUtils.lerp(70, 120, (i % 7) / 6)
      const x = c.x + Math.cos(a) * r
      const z = c.y + Math.sin(a) * r
      const y = terrain.heightAtXZ(x, z)
      if (y < terrain.seaLevel + 6) continue

      const slope = terrain.slopeAtXZ(x, z)
      // Favor “mountainside” (some slope) but not sheer.
      const slopeScore = 1 - Math.abs(slope - 0.22) / 0.22
      const heightScore = THREE.MathUtils.clamp((y - 10) / 50, 0, 1)
      const score = slopeScore * 1.2 + heightScore * 0.6

      if (score > bestScore) {
        bestScore = score
        best.set(x, y, z)

        // Face roughly outward from the mountain center (so it silhouettes nicely).
        const out = new THREE.Vector2(x - c.x, z - c.y).normalize()
        bestYaw = Math.atan2(out.x, out.y) + Math.PI // face toward center-ish
      }
    }

    castle.position.copy(best)
    castle.rotation.y = bestYaw

    // Slightly sink into slope to feel anchored.
    castle.position.y -= 0.6

    // Biome grade as mountains for coherence.
    PostFX.tagBiome(castle, biomeIndex('snowy_mountains'))
  }

  private makeRuinedCastle() {
    const group = new THREE.Group()
    group.name = 'RuinedCastle'

    const stone = new THREE.MeshStandardMaterial({ color: 0x707784, roughness: 1, metalness: 0 })
    const darkStone = new THREE.MeshStandardMaterial({ color: 0x4d545e, roughness: 1, metalness: 0 })
    const iron = new THREE.MeshStandardMaterial({ color: 0x2d2f35, roughness: 0.9, metalness: 0.2 })

    // Keep silhouette readable: big shapes first.
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 3.2, 16), stone)
    base.position.y = 1.6
    group.add(base)

    const keep = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 8), darkStone)
    keep.position.set(-3, 8, -1)
    group.add(keep)

    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.9, 14, 8, 1), stone)
    tower.position.set(7, 7.4, 4)
    tower.rotation.y = 0.25
    group.add(tower)

    // Broken wall segments.
    const wallA = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 1.2), stone)
    wallA.position.set(0, 3.4, 8.6)
    wallA.rotation.y = 0.12
    group.add(wallA)

    const wallB = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 1.2), darkStone)
    wallB.position.set(-9, 2.7, -6.8)
    wallB.rotation.y = -0.35
    group.add(wallB)

    // “Ruin break” notch: just omit geometry + add some fallen blocks.
    for (let i = 0; i < 10; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(THREE.MathUtils.lerp(0.8, 2.1, Math.random()), 0.7, 0.9), darkStone)
      b.position.set(THREE.MathUtils.lerp(-6, 10, Math.random()), 0.25, THREE.MathUtils.lerp(-7, 8, Math.random()))
      b.rotation.set(0, Math.random() * Math.PI * 2, Math.random() * 0.35)
      group.add(b)
    }

    // A few iron spikes / banners as thin silhouettes.
    const spikeGeo = new THREE.ConeGeometry(0.18, 1.6, 6, 1)
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(spikeGeo, iron)
      s.position.set(THREE.MathUtils.lerp(-10, 10, Math.random()), 3.2, THREE.MathUtils.lerp(-8, 8, Math.random()))
      s.rotation.y = Math.random() * Math.PI * 2
      group.add(s)
    }

    // Overall scale: make it “mega” but not absurd.
    group.scale.setScalar(1.0)
    return group
  }
}

