import * as THREE from 'three'

export type WalkerTier = 'scout' | 'assault'

type TierDims = {
  hullW: number
  hullH: number
  hullD: number
  armorBoost: number
  hipY: number
  hipX: number
  hipZ: number
  footX: number
  footZ: number
  kneeBias: number
  upperR: number
  lowerR: number
  footW: number
  footD: number
  footH: number
  turretR: number
  turretH: number
  barrelR: number
  barrelLen: number
  hullColor: number
  armorColor: number
  jointColor: number
}

function tierDims(tier: WalkerTier): TierDims {
  if (tier === 'scout') {
    return {
      hullW: 2.0,
      hullH: 1.05,
      hullD: 2.65,
      armorBoost: 0.12,
      hipY: 1.82,
      hipX: 0.72,
      hipZ: 0.88,
      footX: 1.02,
      footZ: 1.18,
      kneeBias: 0.42,
      upperR: 0.14,
      lowerR: 0.11,
      footW: 0.42,
      footD: 0.52,
      footH: 0.12,
      turretR: 0.38,
      turretH: 0.32,
      barrelR: 0.1,
      barrelLen: 0.95,
      hullColor: 0x3a3d45,
      armorColor: 0x5c616c,
      jointColor: 0x2a2c32,
    }
  }
  return {
    hullW: 3.15,
    hullH: 1.65,
    hullD: 4.1,
    armorBoost: 0.18,
    hipY: 2.85,
    hipX: 1.12,
    hipZ: 1.38,
    footX: 1.58,
    footZ: 1.85,
    kneeBias: 0.4,
    upperR: 0.22,
    lowerR: 0.17,
    footW: 0.62,
    footD: 0.78,
    footH: 0.18,
    turretR: 0.58,
    turretH: 0.48,
    barrelR: 0.15,
    barrelLen: 1.45,
    hullColor: 0x2f3238,
    armorColor: 0x4a4f58,
    jointColor: 0x22242a,
  }
}

function orientCylinder(
  mesh: THREE.Mesh,
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  radialSeg = 8
) {
  const dir = new THREE.Vector3().subVectors(to, from)
  const len = dir.length()
  if (len < 1e-6) return
  mesh.geometry.dispose()
  mesh.geometry = new THREE.CylinderGeometry(radius, radius, len, radialSeg, 1)
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)
  mesh.position.copy(mid)
  const up = new THREE.Vector3(0, 1, 0)
  mesh.quaternion.setFromUnitVectors(up, dir.clone().normalize())
}

export class WalkerMech {
  public readonly object3d: THREE.Group
  public readonly tier: WalkerTier
  public readonly name: string

  constructor(tier: WalkerTier, name: string) {
    this.tier = tier
    this.name = name
    this.object3d = new THREE.Group()
    this.object3d.name = `WalkerMech:${name}`

    const d = tierDims(tier)
    const hullMat = new THREE.MeshStandardMaterial({
      color: d.hullColor,
      roughness: 0.88,
      metalness: 0.22,
    })
    const armorMat = new THREE.MeshStandardMaterial({
      color: d.armorColor,
      roughness: 0.82,
      metalness: 0.28,
    })
    const jointMat = new THREE.MeshStandardMaterial({
      color: d.jointColor,
      roughness: 0.9,
      metalness: 0.35,
    })

    const hullBottomY = d.hipY
    const hullCenterY = hullBottomY + d.hullH * 0.5

    const hull = new THREE.Mesh(new THREE.BoxGeometry(d.hullW, d.hullH, d.hullD), hullMat)
    hull.position.set(0, hullCenterY, 0)
    hull.castShadow = true
    hull.receiveShadow = true
    this.object3d.add(hull)

    const armor = new THREE.Mesh(
      new THREE.BoxGeometry(d.hullW + d.armorBoost, d.hullH * 0.35, d.hullD + d.armorBoost * 0.6),
      armorMat
    )
    armor.position.set(0, hullBottomY + d.hullH * 0.82, 0)
    armor.castShadow = true
    this.object3d.add(armor)

    const turretBase = new THREE.Mesh(
      new THREE.CylinderGeometry(d.turretR, d.turretR * 1.08, d.turretH, 10, 1),
      armorMat
    )
    turretBase.position.set(0, hullBottomY + d.hullH + d.turretH * 0.48, 0)
    turretBase.castShadow = true
    this.object3d.add(turretBase)

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(d.barrelR, d.barrelR * 0.92, d.barrelLen, 8, 1),
      jointMat
    )
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, turretBase.position.y, -d.turretR - d.barrelLen * 0.48)
    barrel.castShadow = true
    this.object3d.add(barrel)

    const flips: Array<{ sx: number; sz: number; label: string }> = [
      { sx: -1, sz: 1, label: 'FL' },
      { sx: 1, sz: 1, label: 'FR' },
      { sx: -1, sz: -1, label: 'RL' },
      { sx: 1, sz: -1, label: 'RR' },
    ]

    for (const { sx, sz } of flips) {
      const hip = new THREE.Vector3(sx * d.hipX, d.hipY, sz * d.hipZ)
      const foot = new THREE.Vector3(sx * d.footX, d.footH * 0.5, sz * d.footZ)
      const knee = new THREE.Vector3().lerpVectors(hip, foot, d.kneeBias)
      knee.x += sx * 0.18
      knee.z += sz * 0.14
      knee.y -= 0.12

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1), jointMat)
      orientCylinder(upper, hip, knee, d.upperR)
      upper.castShadow = true
      this.object3d.add(upper)

      const kneeMesh = new THREE.Mesh(new THREE.SphereGeometry((d.upperR + d.lowerR) * 0.55, 8, 6), jointMat)
      kneeMesh.position.copy(knee)
      kneeMesh.castShadow = true
      this.object3d.add(kneeMesh)

      const lower = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1), jointMat)
      orientCylinder(lower, knee, foot, d.lowerR)
      lower.castShadow = true
      this.object3d.add(lower)

      const pad = new THREE.Mesh(new THREE.BoxGeometry(d.footW, d.footH, d.footD), hullMat)
      pad.position.copy(foot)
      pad.castShadow = true
      this.object3d.add(pad)
    }
  }

  /** Reserved for future animation; dormant models are static for now. */
  update(_dt: number) {}
}

