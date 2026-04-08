import * as THREE from 'three'

/* ── Materials — BotW wanderer (matte, warm, painterly) ────────── */

const M = {
  tunic: () => new THREE.MeshStandardMaterial({ color: 0x5a9ab8, roughness: 0.82, metalness: 0.0 }),
  tunicDark: () => new THREE.MeshStandardMaterial({ color: 0x4a8098, roughness: 0.85, metalness: 0.0 }),
  leather: () => new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.82, metalness: 0.05 }),
  leatherDark: () => new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.85, metalness: 0.03 }),
  cloth: () => new THREE.MeshStandardMaterial({ color: 0x3a6a88, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide }),
  clothWarm: () => new THREE.MeshStandardMaterial({ color: 0x6a5848, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide }),
  skin: () => new THREE.MeshStandardMaterial({ color: 0xe8c0a0, roughness: 0.72, metalness: 0.0 }),
  hair: () => new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.78, metalness: 0.0 }),
  boot: () => new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.84, metalness: 0.04 }),
  steel: () => new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.50, metalness: 0.25 }),
  eye: () => new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.5, metalness: 0.0 }),
}

/* ── Limb handle type ──────────────────────────────────────────── */

export type KnightLimbs = {
  body: THREE.Group
  head: THREE.Group
  armL: THREE.Group
  armR: THREE.Group
  legL: THREE.Group
  legR: THREE.Group
  cape: THREE.Mesh
  tabard: THREE.Mesh
  glowMats: THREE.MeshStandardMaterial[]
}

/* ── Geometry helpers ──────────────────────────────────────────── */

function cyl(rt: number, rb: number, h: number, seg: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)
}
function sph(r: number, seg: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 1)), mat)
}
function halfSph(r: number, seg: number, mat: THREE.Material, arc = 0.5): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, seg, Math.max(6, seg - 1), 0, Math.PI * 2, 0, Math.PI * arc),
    mat,
  )
}
function box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
}
function at(mesh: THREE.Mesh, x: number, y: number, z: number): THREE.Mesh {
  mesh.position.set(x, y, z)
  return mesh
}

/* ── Build model ───────────────────────────────────────────────── */

export function buildKnightModel(): { root: THREE.Group; limbs: KnightLimbs } {
  const root = new THREE.Group()
  root.name = 'KnightModel'

  const tn = M.tunic()
  const td = M.tunicDark()
  const lt = M.leather()
  const ld = M.leatherDark()
  const cl = M.cloth()
  const cw = M.clothWarm()
  const sk = M.skin()
  const hr = M.hair()
  const bt = M.boot()
  const st = M.steel()
  const ey = M.eye()

  // =========================================================================
  //  BODY — pivot at waist (y=0.88)
  // =========================================================================
  const body = new THREE.Group()
  body.name = 'Body'
  body.position.set(0, 0.88, 0)

  // Torso core: tapered cylinder (wider at shoulders, narrower at waist)
  body.add(at(cyl(0.20, 0.16, 0.36, 10, tn), 0, 0.24, 0))

  // Chest volume (slightly squished sphere for organic shape)
  const chest = sph(0.18, 10, tn)
  chest.scale.set(1.2, 0.85, 0.9)
  chest.position.set(0, 0.32, -0.02)
  body.add(chest)

  // Tunic front panel overlay
  body.add(at(cyl(0.17, 0.15, 0.28, 8, td), 0, 0.24, -0.04))

  // Leather chest strap (diagonal)
  const strap = cyl(0.015, 0.015, 0.34, 5, lt)
  strap.rotation.z = 0.45
  strap.position.set(-0.06, 0.28, -0.14)
  body.add(strap)

  // Collar (soft roll)
  body.add(at(cyl(0.17, 0.19, 0.04, 10, td), 0, 0.44, 0))

  // Back tunic
  const back = cyl(0.18, 0.15, 0.30, 8, td)
  back.position.set(0, 0.24, 0.04)
  body.add(back)

  // Leather belt (cylinder ring)
  body.add(at(cyl(0.18, 0.18, 0.05, 10, lt), 0, 0.02, 0))
  // Belt buckle (small box, only detail)
  body.add(at(box(0.05, 0.04, 0.025, st), 0, 0.02, -0.18))
  // Side pouches
  body.add(at(box(0.05, 0.045, 0.04, ld), -0.16, 0.0, -0.08))
  body.add(at(box(0.04, 0.04, 0.045, ld), 0.17, 0.0, -0.06))

  // Tunic skirt (flares outward, layered cylinders)
  body.add(at(cyl(0.19, 0.22, 0.08, 10, tn), 0, -0.06, 0))
  body.add(at(cyl(0.22, 0.24, 0.07, 10, td), 0, -0.12, 0))
  body.add(at(cyl(0.24, 0.25, 0.06, 10, tn), 0, -0.17, 0))

  // Front tunic flap (3D, not flat plane)
  const tunicFlap = box(0.22, 0.38, 0.025, tn)
  tunicFlap.name = 'TunicFlap'
  tunicFlap.position.set(0, -0.28, -0.12)
  body.add(tunicFlap)
  // Flap trim
  body.add(at(box(0.24, 0.015, 0.03, td), 0, -0.10, -0.12))
  body.add(at(box(0.24, 0.015, 0.03, td), 0, -0.46, -0.12))

  // Back tunic flap (3D volume, not plane)
  const tabard = box(0.20, 0.32, 0.025, td)
  tabard.name = 'Tabard'
  tabard.position.set(0, -0.26, 0.12)
  body.add(tabard)

  // Travel pack on back (replaces cape, gives the silhouette depth)
  const pack = sph(0.08, 8, lt)
  pack.scale.set(1.0, 1.2, 0.8)
  pack.position.set(0, 0.10, 0.16)
  body.add(pack)
  // Pack flap
  body.add(at(box(0.12, 0.06, 0.04, ld), 0, 0.16, 0.18))
  // Rolled blanket on top of pack
  body.add(at(cyl(0.035, 0.035, 0.16, 7, cw), 0, 0.22, 0.17))

  // Side pouches / water skin
  const waterskin = cyl(0.02, 0.018, 0.10, 6, lt)
  waterskin.rotation.z = 0.25
  waterskin.position.set(0.20, 0.06, 0.04)
  body.add(waterskin)

  root.add(body)

  // =========================================================================
  //  HEAD — pivot at neck (y=1.38), 1.1x scale for BotW stylized read
  // =========================================================================
  const head = new THREE.Group()
  head.name = 'Head'
  head.position.set(0, 1.38, 0)
  head.scale.setScalar(1.10)

  // Neck (tapered cylinder, skin)
  head.add(at(cyl(0.055, 0.065, 0.08, 8, sk), 0, 0.02, 0))

  // Head sphere (the core shape -- NOT a box)
  const skull = sph(0.115, 10, sk)
  skull.scale.set(1.0, 1.05, 0.95)
  skull.position.set(0, 0.14, 0)
  head.add(skull)

  // Hair: layered shells for volume
  const hairBack = halfSph(0.128, 10, hr, 0.68)
  hairBack.rotation.x = -0.12
  hairBack.position.set(0, 0.17, 0.02)
  head.add(hairBack)

  // Hair top (fluffy volume)
  const hairTop = sph(0.11, 10, hr)
  hairTop.scale.set(1.15, 0.50, 1.05)
  hairTop.position.set(0, 0.24, 0.0)
  head.add(hairTop)

  // Side tufts (cylindrical locks)
  head.add(at(cyl(0.032, 0.018, 0.12, 6, hr), -0.10, 0.08, -0.03))
  head.add(at(cyl(0.032, 0.018, 0.12, 6, hr), 0.10, 0.08, -0.03))

  // Back ponytail nub
  const tail = cyl(0.025, 0.015, 0.08, 6, hr)
  tail.rotation.x = 0.5
  tail.position.set(0, 0.12, 0.12)
  head.add(tail)

  // Fringe bangs
  const fringe = box(0.16, 0.035, 0.06, hr)
  fringe.position.set(0, 0.20, -0.10)
  fringe.rotation.x = 0.15
  head.add(fringe)
  // Second fringe layer (messier)
  const fringe2 = box(0.12, 0.025, 0.05, hr)
  fringe2.position.set(0.02, 0.18, -0.105)
  fringe2.rotation.x = 0.25
  fringe2.rotation.z = 0.08
  head.add(fringe2)

  // Eyes (small colored spheres, recessed)
  head.add(at(sph(0.018, 6, ey), -0.038, 0.145, -0.098))
  head.add(at(sph(0.018, 6, ey), 0.038, 0.145, -0.098))

  // Nose (tiny cylinder)
  head.add(at(cyl(0.012, 0.008, 0.025, 5, sk), 0, 0.12, -0.11))

  // Ears (slightly pointed, BotW-style)
  const earGeo = new THREE.ConeGeometry(0.025, 0.06, 4)
  const earL = new THREE.Mesh(earGeo, sk)
  earL.rotation.z = Math.PI / 2 + 0.3
  earL.position.set(-0.115, 0.14, -0.01)
  head.add(earL)
  const earR = new THREE.Mesh(earGeo, sk)
  earR.rotation.z = -(Math.PI / 2 + 0.3)
  earR.position.set(0.115, 0.14, -0.01)
  head.add(earR)

  // Cowl/scarf bunched at neck
  head.add(at(cyl(0.10, 0.12, 0.05, 8, cw), 0, -0.01, 0))

  root.add(head)

  // =========================================================================
  //  ARM BUILDER (shared for L/R)
  // =========================================================================
  function buildArm(side: -1 | 1): THREE.Group {
    const arm = new THREE.Group()
    arm.name = side < 0 ? 'ArmL' : 'ArmR'
    arm.position.set(side * 0.24, 1.32, 0)

    // Shoulder (rounded sphere, tunic puff)
    const shoulder = sph(0.065, 8, tn)
    shoulder.scale.set(1.1, 0.8, 1.0)
    shoulder.position.set(side * 0.01, 0.0, 0)
    arm.add(shoulder)

    // Upper arm (tapered cylinder, tunic sleeve)
    arm.add(at(cyl(0.052, 0.044, 0.18, 8, tn), 0, -0.12, 0))

    // Elbow (sphere joint)
    arm.add(at(sph(0.038, 7, sk), 0, -0.22, 0))

    // Forearm (skin, tapered)
    arm.add(at(cyl(0.038, 0.032, 0.17, 8, sk), 0, -0.32, 0))

    // Leather bracer (cylinder wrap)
    arm.add(at(cyl(0.042, 0.040, 0.08, 8, lt), 0, -0.30, 0))

    // Wrist
    arm.add(at(cyl(0.030, 0.028, 0.03, 6, sk), 0, -0.41, 0))

    // Hand (rounded box-ish, but with spheres)
    const hand = sph(0.028, 6, sk)
    hand.scale.set(1.2, 0.7, 1.4)
    hand.position.set(0, -0.45, -0.01)
    arm.add(hand)

    return arm
  }

  const armL = buildArm(-1)
  const armR = buildArm(1)
  root.add(armL)
  root.add(armR)

  // =========================================================================
  //  LEG BUILDER (shared for L/R)
  // =========================================================================
  function buildLeg(side: -1 | 1): THREE.Group {
    const leg = new THREE.Group()
    leg.name = side < 0 ? 'LegL' : 'LegR'
    leg.position.set(side * 0.08, 0.78, 0)

    // Thigh (cloth trousers, tapered cylinder)
    leg.add(at(cyl(0.065, 0.055, 0.28, 8, cl), 0, -0.14, 0))

    // Knee (sphere joint with leather wrap)
    leg.add(at(sph(0.048, 7, lt), 0, -0.28, -0.01))

    // Shin (tapered cylinder, cloth wraps)
    leg.add(at(cyl(0.050, 0.042, 0.24, 8, cl), 0, -0.42, 0))

    // Shin leather strap
    leg.add(at(cyl(0.052, 0.050, 0.03, 7, lt), 0, -0.36, 0))

    // Ankle (narrowing)
    leg.add(at(cyl(0.040, 0.044, 0.04, 7, bt), 0, -0.56, 0))

    // Boot (rounded cylinder + sphere toe)
    leg.add(at(cyl(0.052, 0.058, 0.07, 8, bt), 0, -0.60, 0))

    // Foot (extended forward, rounded)
    const foot = sph(0.042, 7, bt)
    foot.scale.set(1.2, 0.55, 1.8)
    foot.position.set(0, -0.645, -0.025)
    leg.add(foot)

    // Sole
    const sole = box(0.10, 0.012, 0.16, ld)
    sole.position.set(0, -0.665, -0.02)
    leg.add(sole)

    return leg
  }

  const legL = buildLeg(-1)
  const legR = buildLeg(1)
  root.add(legL)
  root.add(legR)

  // Short shoulder drape (3D volume, not a flat billboard)
  const drapeL = box(0.12, 0.14, 0.06, cl)
  drapeL.position.set(-0.22, 1.28, 0.06)
  drapeL.rotation.z = 0.15
  root.add(drapeL)
  const drapeR = box(0.12, 0.14, 0.06, cl)
  drapeR.position.set(0.22, 1.28, 0.06)
  drapeR.rotation.z = -0.15
  root.add(drapeR)
  // Back drape connecting shoulders
  root.add(at(box(0.32, 0.12, 0.035, cl), 0, 1.24, 0.14))
  root.add(at(box(0.28, 0.08, 0.03, td), 0, 1.16, 0.14))

  // Hidden cape placeholder for animation reference
  const capeMesh = new THREE.Mesh(new THREE.BufferGeometry(), cl)
  capeMesh.visible = false
  capeMesh.position.set(0, 0.88, 0.16)
  root.add(capeMesh)

  return {
    root,
    limbs: { body, head, armL, armR, legL, legR, cape: capeMesh, tabard, glowMats: [] },
  }
}

/* ── Animation ─────────────────────────────────────────────────── */

let _t = 0

export function animateKnight(
  limbs: KnightLimbs,
  dt: number,
  speed: number,
  phase: number,
) {
  _t += dt

  const walkBlend = THREE.MathUtils.smoothstep(speed, 0.15, 2.0)
  const runBlend = THREE.MathUtils.smoothstep(speed, 5.5, 9.0)
  const idleBlend = 1 - walkBlend

  const p = phase * Math.PI * 2

  const legP = p
  const bodyP = p - 0.20
  const armP = p + Math.PI - 0.14
  const headP = p - 0.28

  // === IDLE (breathing, subtle weight shifts) ===
  const idleBob = Math.sin(_t * 1.0) * 0.006 * idleBlend
  const idleSway = Math.sin(_t * 0.45) * 0.008 * idleBlend
  const idleArmDrift = Math.sin(_t * 0.6) * 0.025 * idleBlend
  const idleHeadTilt = Math.sin(_t * 0.75) * 0.012 * idleBlend
  const idleBreath = Math.sin(_t * 1.4) * 0.005 * idleBlend

  // === WALK / RUN (fluid, BotW-style weight) ===
  const legAmp = THREE.MathUtils.lerp(0.32, 0.58, runBlend) * walkBlend
  const armAmp = THREE.MathUtils.lerp(0.22, 0.42, runBlend) * walkBlend
  const bobAmp = THREE.MathUtils.lerp(0.028, 0.055, runBlend) * walkBlend
  const leanAmp = THREE.MathUtils.lerp(0.018, 0.038, runBlend) * walkBlend
  const headCtr = THREE.MathUtils.lerp(0.014, 0.026, runBlend) * walkBlend
  const fwdLean = THREE.MathUtils.lerp(0.012, 0.032, runBlend) * walkBlend

  const legSinL = Math.sin(legP)
  const legSinR = Math.sin(legP + Math.PI)

  limbs.legL.rotation.x = legSinL * legAmp
  limbs.legR.rotation.x = legSinR * legAmp
  limbs.legL.rotation.z = Math.abs(legSinL) * 0.02 * walkBlend
  limbs.legR.rotation.z = -Math.abs(legSinR) * 0.02 * walkBlend

  limbs.armL.rotation.x = Math.sin(armP + Math.PI) * armAmp + idleArmDrift
  limbs.armR.rotation.x = Math.sin(armP) * armAmp - idleArmDrift
  const armOutBase = 0.08 + runBlend * 0.05
  limbs.armL.rotation.z = armOutBase + Math.sin(armP + Math.PI) * 0.03 * walkBlend
  limbs.armR.rotation.z = -armOutBase - Math.sin(armP) * 0.03 * walkBlend

  const bodySin = Math.sin(bodyP)
  const bob = Math.abs(Math.sin(bodyP)) * bobAmp + idleBob + idleBreath
  limbs.body.position.y = 0.88 + bob
  limbs.body.rotation.z = bodySin * leanAmp + idleSway
  limbs.body.rotation.x = -fwdLean - Math.abs(Math.sin(bodyP * 0.5)) * 0.010 * walkBlend

  limbs.head.rotation.x = -Math.sin(headP) * headCtr + idleHeadTilt
  limbs.head.rotation.z = -bodySin * leanAmp * 0.4

  limbs.cape.position.y = 0.88 + bob

  limbs.tabard.rotation.x = Math.sin(legP * 0.5) * 0.06 * walkBlend

  for (const mat of limbs.glowMats) {
    mat.emissiveIntensity = 0.85 + 0.15 * Math.sin(_t * 1.8)
  }
}
