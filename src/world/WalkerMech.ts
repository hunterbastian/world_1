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
    hullW: 3.72,
    hullH: 1.88,
    hullD: 4.62,
    armorBoost: 0.24,
    hipY: 2.22,
    hipX: 1.26,
    hipZ: 1.52,
    footX: 1.78,
    footZ: 2.08,
    kneeBias: 0.41,
    upperR: 0.31,
    lowerR: 0.24,
    footW: 0.8,
    footD: 0.98,
    footH: 0.24,
    turretR: 0.7,
    turretH: 0.54,
    barrelR: 0.175,
    barrelLen: 1.62,
    hullColor: 0x2f3238,
    armorColor: 0x4a4f58,
    jointColor: 0x22242a,
  }
}

function shadeColor(hex: number, mult: number) {
  const c = new THREE.Color(hex)
  c.multiplyScalar(mult)
  return c.getHex()
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

function shadow(mesh: THREE.Mesh) {
  mesh.castShadow = true
  mesh.receiveShadow = true
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
    const fac = tier === 'scout' ? 1 : 1.06

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
    const panelMat = new THREE.MeshStandardMaterial({
      color: shadeColor(d.hullColor, 0.78),
      roughness: 0.92,
      metalness: 0.2,
    })
    const rivetMat = new THREE.MeshStandardMaterial({
      color: shadeColor(d.jointColor, 1.15),
      roughness: 0.75,
      metalness: 0.45,
    })

    const hullBottomY = d.hipY

    const bellyH = d.hullH * 0.48
    const belly = new THREE.Mesh(
      new THREE.BoxGeometry(d.hullW * 1.02, bellyH, d.hullD * 0.94),
      hullMat
    )
    belly.position.set(0, hullBottomY + bellyH * 0.5, 0)
    shadow(belly)
    this.object3d.add(belly)

    const cabinH = d.hullH * 0.58
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(d.hullW * 0.86, cabinH, d.hullD * 0.88),
      hullMat
    )
    cabin.position.set(0, hullBottomY + bellyH + cabinH * 0.5 - 0.04, 0.06 * fac)
    shadow(cabin)
    this.object3d.add(cabin)

    const glacis = new THREE.Mesh(
      new THREE.BoxGeometry(d.hullW * 0.72, d.hullH * 0.38, 0.28 * fac),
      armorMat
    )
    glacis.position.set(0, hullBottomY + bellyH + cabinH * 0.35, -d.hullD * 0.44)
    glacis.rotation.x = THREE.MathUtils.degToRad(38)
    shadow(glacis)
    this.object3d.add(glacis)

    for (const sx of [-1, 1] as const) {
      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.11 * fac, bellyH * 0.92, d.hullD * 0.86),
        panelMat
      )
      skirt.position.set(sx * (d.hullW * 0.52 + 0.04), hullBottomY + bellyH * 0.46, 0)
      shadow(skirt)
      this.object3d.add(skirt)

      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, cabinH * 0.55, d.hullD * 0.06),
        panelMat
      )
      rail.position.set(sx * (d.hullW * 0.38), hullBottomY + bellyH + cabinH * 0.45, -d.hullD * 0.41)
      shadow(rail)
      this.object3d.add(rail)
    }

    const bustle = new THREE.Mesh(
      new THREE.BoxGeometry(d.hullW * 0.68, d.hullH * 0.22, 0.48 * fac),
      jointMat
    )
    bustle.position.set(0, hullBottomY + bellyH * 0.65, d.hullD * 0.36)
    bustle.rotation.x = -0.12
    shadow(bustle)
    this.object3d.add(bustle)

    for (let i = 0; i < 3; i++) {
      const zOf = THREE.MathUtils.lerp(-d.hullD * 0.32, d.hullD * 0.28, i / 2)
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(d.hullW * 1.08, 0.045, 0.07),
        panelMat
      )
      strip.position.set(0, hullBottomY + bellyH * 0.35 + i * 0.22 * fac, zOf)
      shadow(strip)
      this.object3d.add(strip)
    }

    const rivetR = tier === 'scout' ? 0.026 : 0.034
    const rivetCols = tier === 'scout' ? 4 : 5
    const rivetGeo = new THREE.SphereGeometry(rivetR, 7, 5)
    for (const sx of [-1, 1] as const) {
      const x0 = sx * (d.hullW * 0.52 + 0.102)
      for (let r = 0; r < rivetCols; r++) {
        const tz = THREE.MathUtils.lerp(
          -d.hullD * 0.36,
          d.hullD * 0.36,
          rivetCols > 1 ? r / (rivetCols - 1) : 0.5
        )
        for (let row = 0; row < 2; row++) {
          const ry = hullBottomY + bellyH * (0.32 + row * 0.38)
          const rivet = new THREE.Mesh(rivetGeo, rivetMat)
          rivet.position.set(x0, ry, tz)
          shadow(rivet)
          this.object3d.add(rivet)
        }
      }
    }

    const roofY = hullBottomY + bellyH + cabinH
    const deckY = roofY - 0.04 * fac
    const deckSegments: Array<{ z: number; w: number; dz: number }> = [
      { z: -d.hullD * 0.26, w: 0.82, dz: 0.42 },
      { z: 0.02, w: 1.0, dz: 0.52 },
      { z: d.hullD * 0.26, w: 0.82, dz: 0.42 },
    ]
    for (const seg of deckSegments) {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(
          d.hullW * seg.w + d.armorBoost * 0.35,
          0.07 * fac,
          d.hullD * seg.dz * 0.32
        ),
        armorMat
      )
      plate.position.set(0, deckY, seg.z)
      shadow(plate)
      this.object3d.add(plate)
    }

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(d.turretR * 1.05, Math.max(0.04, d.turretR * 0.09), 8, 28),
      jointMat
    )
    ring.rotation.x = Math.PI / 2
    ring.position.set(0, roofY + 0.05 * fac, 0)
    shadow(ring)
    this.object3d.add(ring)

    const turretY = roofY + 0.06 * fac + d.turretH * 0.4
    const turretBase = new THREE.Mesh(
      new THREE.CylinderGeometry(d.turretR * 0.92, d.turretR * 1.06, d.turretH, 12, 1),
      armorMat
    )
    turretBase.position.set(0, turretY, 0)
    shadow(turretBase)
    this.object3d.add(turretBase)

    const mantlet = new THREE.Mesh(
      new THREE.BoxGeometry(d.turretR * 1.14, d.turretH * 0.72, d.turretR * 0.48),
      hullMat
    )
    mantlet.position.set(0, turretY, -d.turretR * 0.78)
    shadow(mantlet)
    this.object3d.add(mantlet)

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(d.barrelR, d.barrelR * 0.9, d.barrelLen, 10, 1),
      jointMat
    )
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, turretY, -d.turretR - d.barrelLen * 0.48)
    shadow(barrel)
    this.object3d.add(barrel)

    const brakeLen = d.barrelLen * 0.09
    const muzzleBrake = new THREE.Mesh(
      new THREE.CylinderGeometry(d.barrelR * 1.38, d.barrelR * 1.2, brakeLen, 8, 1),
      jointMat
    )
    muzzleBrake.rotation.x = Math.PI / 2
    muzzleBrake.position.set(0, turretY, -d.turretR - d.barrelLen - brakeLen * 0.48)
    shadow(muzzleBrake)
    this.object3d.add(muzzleBrake)

    const boreTip = new THREE.Mesh(
      new THREE.CylinderGeometry(d.barrelR * 0.42, d.barrelR * 0.5, d.barrelLen * 0.05, 6, 1),
      jointMat
    )
    boreTip.rotation.x = Math.PI / 2
    boreTip.position.set(0, turretY, -d.turretR - d.barrelLen - brakeLen - d.barrelLen * 0.025)
    shadow(boreTip)
    this.object3d.add(boreTip)

    const flips: Array<{ sx: number; sz: number }> = [
      { sx: -1, sz: 1 },
      { sx: 1, sz: 1 },
      { sx: -1, sz: -1 },
      { sx: 1, sz: -1 },
    ]

    for (const { sx, sz } of flips) {
      const hip = new THREE.Vector3(sx * d.hipX, d.hipY, sz * d.hipZ)
      const foot = new THREE.Vector3(sx * d.footX, d.footH * 0.5, sz * d.footZ)
      const knee = new THREE.Vector3().lerpVectors(hip, foot, d.kneeBias)
      knee.x += sx * 0.18
      knee.z += sz * 0.14
      knee.y -= 0.12

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1), jointMat)
      orientCylinder(upper, hip, knee, d.upperR)
      shadow(upper)
      this.object3d.add(upper)

      const shroud = new THREE.Mesh(
        new THREE.BoxGeometry(d.upperR * 2.75, d.upperR * 1.85, d.upperR * 2.35),
        panelMat
      )
      shroud.position.copy(knee)
      shroud.position.y += d.upperR * 0.22
      shroud.rotation.y = Math.atan2(sx * (foot.x - knee.x), sz * (foot.z - knee.z)) * 0.35
      shadow(shroud)
      this.object3d.add(shroud)

      const kneeMesh = new THREE.Mesh(
        new THREE.SphereGeometry((d.upperR + d.lowerR) * 0.52, 10, 8),
        jointMat
      )
      kneeMesh.position.copy(knee)
      shadow(kneeMesh)
      this.object3d.add(kneeMesh)

      const lower = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1), jointMat)
      orientCylinder(lower, knee, foot, d.lowerR)
      shadow(lower)
      this.object3d.add(lower)

      const strutA = knee.clone().lerp(foot, 0.38)
      strutA.y += d.lowerR * 0.55
      const strutB = foot.clone()
      strutB.y += d.footH * 0.7
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1), panelMat)
      orientCylinder(strut, strutA, strutB, d.lowerR * 0.36)
      shadow(strut)
      this.object3d.add(strut)

      const heel = new THREE.Mesh(
        new THREE.BoxGeometry(d.footW * 1.02, d.footH, d.footD * 0.62),
        hullMat
      )
      heel.position.set(foot.x, foot.y, foot.z - sz * d.footD * 0.08)
      shadow(heel)
      this.object3d.add(heel)

      const toe = new THREE.Mesh(
        new THREE.BoxGeometry(d.footW * 0.58, d.footH * 0.9, d.footD * 0.4),
        panelMat
      )
      toe.position.set(foot.x, foot.y + d.footH * 0.04, foot.z + sz * d.footD * 0.36)
      shadow(toe)
      this.object3d.add(toe)
    }
  }

  /** Reserved for future animation; dormant models are static for now. */
  update(_dt: number) {}
}