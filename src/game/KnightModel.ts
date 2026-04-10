import * as THREE from 'three'

/* ── Materials — Dark Souls medieval palette ────────────────────── */

const M = {
  steel: () => new THREE.MeshStandardMaterial({ color: 0x7a7f88, roughness: 0.52, metalness: 0.58 }),
  steelDark: () => new THREE.MeshStandardMaterial({ color: 0x4e525a, roughness: 0.62, metalness: 0.48 }),
  steelWorn: () => new THREE.MeshStandardMaterial({ color: 0x606468, roughness: 0.70, metalness: 0.40 }),
  chainmail: () => new THREE.MeshStandardMaterial({ color: 0x5a5e66, roughness: 0.58, metalness: 0.52 }),
  leather: () => new THREE.MeshStandardMaterial({ color: 0x3e2818, roughness: 0.92, metalness: 0.05 }),
  leatherDark: () => new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.95, metalness: 0.03 }),
  cloth: () => new THREE.MeshStandardMaterial({ color: 0x1c1e28, roughness: 0.94, metalness: 0.0, side: THREE.DoubleSide }),
  clothBrown: () => new THREE.MeshStandardMaterial({ color: 0x342a1e, roughness: 0.90, metalness: 0.0, side: THREE.DoubleSide }),
  visor: () => new THREE.MeshStandardMaterial({ color: 0x080a0e, emissive: 0x14202e, emissiveIntensity: 0.12, roughness: 0.4, metalness: 0.2 }),
  trim: () => new THREE.MeshStandardMaterial({ color: 0x8a7a52, roughness: 0.55, metalness: 0.60 }),
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

function box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
}
function cyl(rt: number, rb: number, h: number, seg: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)
}
function sphere(r: number, seg: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), mat)
}
function halfSphere(r: number, seg: number, mat: THREE.Material, arc = 0.55): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2), 0, Math.PI * 2, 0, Math.PI * arc),
    mat,
  )
}
function at(mesh: THREE.Mesh, x: number, y: number, z: number): THREE.Mesh {
  mesh.position.set(x, y, z)
  return mesh
}

/* ── Build model ───────────────────────────────────────────────── */

export function buildKnightModel(): { root: THREE.Group; limbs: KnightLimbs } {
  const root = new THREE.Group()
  root.name = 'KnightModel'

  const st = M.steel()
  const sd = M.steelDark()
  const sw = M.steelWorn()
  const cm = M.chainmail()
  const lt = M.leather()
  const ld = M.leatherDark()
  const cl = M.cloth()
  const cb = M.clothBrown()
  const tr = M.trim()

  // =========================================================================
  //  BODY — pivot at waist (y=0.86)
  // =========================================================================
  const body = new THREE.Group()
  body.name = 'Body'
  body.position.set(0, 0.86, 0)

  // Chainmail base layer (visible at gaps)
  body.add(at(box(0.43, 0.42, 0.24, cm), 0, 0.20, 0))

  // Breastplate — overlapping left/right plates
  body.add(at(box(0.24, 0.26, 0.06, st), -0.05, 0.30, -0.13))
  body.add(at(box(0.24, 0.26, 0.06, st), 0.05, 0.30, -0.13))
  // Center seam strip
  body.add(at(box(0.025, 0.22, 0.04, sd), 0, 0.30, -0.155))
  // Upper chest ridge
  body.add(at(box(0.38, 0.035, 0.20, sd), 0, 0.44, 0))
  // Collar plate
  body.add(at(cyl(0.22, 0.24, 0.04, 10, sw), 0, 0.46, 0))

  // Side plates (flared at top)
  body.add(at(box(0.06, 0.24, 0.20, sw), -0.24, 0.28, 0))
  body.add(at(box(0.06, 0.24, 0.20, sw), 0.24, 0.28, 0))

  // Back plate
  body.add(at(box(0.38, 0.26, 0.05, sw), 0, 0.30, 0.14))

  // Leather belt
  body.add(at(box(0.50, 0.07, 0.28, lt), 0, 0.0, 0))
  // Belt buckle
  body.add(at(box(0.08, 0.05, 0.035, tr), 0, 0.0, -0.16))
  // Belt pouches
  body.add(at(box(0.07, 0.06, 0.06, ld), -0.18, -0.02, -0.12))
  body.add(at(box(0.06, 0.05, 0.055, ld), 0.20, -0.01, -0.11))
  // Back pouch (satchel)
  body.add(at(box(0.10, 0.08, 0.06, lt), 0.14, -0.01, 0.16))

  // Leather cross-straps
  const strap = box(0.04, 0.34, 0.015, lt)
  strap.rotation.z = 0.35
  strap.position.set(-0.08, 0.22, -0.165)
  body.add(strap)
  const strap2 = box(0.04, 0.34, 0.015, lt)
  strap2.rotation.z = -0.35
  strap2.position.set(0.08, 0.22, -0.165)
  body.add(strap2)

  // Fauld (lower armor segments)
  body.add(at(box(0.48, 0.06, 0.27, st), 0, -0.06, 0))
  body.add(at(box(0.46, 0.055, 0.26, sw), 0, -0.12, 0))
  body.add(at(box(0.44, 0.05, 0.25, sd), 0, -0.17, 0))

  // Tasset plates (front, hanging)
  body.add(at(box(0.12, 0.15, 0.04, st), -0.11, -0.19, -0.14))
  body.add(at(box(0.12, 0.15, 0.04, st), 0.11, -0.19, -0.14))
  body.add(at(box(0.08, 0.17, 0.035, sw), 0, -0.20, -0.15))
  // Trim on tassets
  body.add(at(box(0.14, 0.015, 0.04, tr), -0.11, -0.12, -0.145))
  body.add(at(box(0.14, 0.015, 0.04, tr), 0.11, -0.12, -0.145))
  // Rear plate
  body.add(at(box(0.34, 0.10, 0.04, sw), 0, -0.18, 0.15))

  // Tabard (cloth hanging from front)
  const tabardGeo = new THREE.PlaneGeometry(0.24, 0.42, 3, 8)
  const tabard = new THREE.Mesh(tabardGeo, cb)
  tabard.name = 'Tabard'
  tabard.position.set(0, -0.30, -0.15)
  body.add(tabard)

  root.add(body)

  // =========================================================================
  //  HEAD — pivot at neck (y=1.36)
  // =========================================================================
  const head = new THREE.Group()
  head.name = 'Head'
  head.position.set(0, 1.36, 0)

  // Neck chainmail coif
  head.add(at(cyl(0.085, 0.10, 0.08, 10, cm), 0, 0.04, 0))

  // Brown cowl/drape (like the reference)
  const cowl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.18, 4, 3), cb)
  cowl.position.set(0, 0.06, 0.10)
  cowl.rotation.x = 0.3
  head.add(cowl)
  const cowlFront = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.12, 3, 2), cb)
  cowlFront.position.set(0, 0.08, -0.08)
  cowlFront.rotation.x = -0.2
  head.add(cowlFront)

  // Helmet barrel base
  head.add(at(cyl(0.14, 0.152, 0.26, 10, st), 0, 0.24, 0))
  // Helmet dome
  head.add(at(halfSphere(0.145, 10, st, 0.50), 0, 0.37, 0))

  // Horizontal ridges (segmented look like reference)
  head.add(at(cyl(0.155, 0.155, 0.02, 10, sd), 0, 0.14, 0))
  head.add(at(cyl(0.152, 0.152, 0.015, 10, sd), 0, 0.20, 0))
  head.add(at(cyl(0.148, 0.148, 0.015, 10, sd), 0, 0.30, 0))

  // Brow ridge
  head.add(at(box(0.30, 0.03, 0.13, sd), 0, 0.30, -0.04))

  // Face plate
  head.add(at(box(0.20, 0.18, 0.04, sw), 0, 0.16, -0.15))
  // Visor slit
  head.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.022, 0.05), M.visor()), 0, 0.21, -0.14))
  // Nose ridge
  head.add(at(box(0.02, 0.10, 0.035, sd), 0, 0.16, -0.165))
  // Chin guard
  head.add(at(box(0.16, 0.05, 0.05, sw), 0, 0.08, -0.13))
  // Cheek plates
  head.add(at(box(0.04, 0.12, 0.08, sw), -0.12, 0.16, -0.04))
  head.add(at(box(0.04, 0.12, 0.08, sw), 0.12, 0.16, -0.04))

  // Rear neck guard (aventail)
  head.add(at(box(0.20, 0.10, 0.04, sw), 0, 0.08, 0.12))
  head.add(at(box(0.18, 0.06, 0.035, cm), 0, 0.02, 0.11))

  root.add(head)

  // =========================================================================
  //  LEFT ARM — pivot at shoulder (y=1.30, x=-0.27)
  // =========================================================================
  const armL = new THREE.Group()
  armL.name = 'ArmL'
  armL.position.set(-0.27, 1.30, 0)

  // Pauldron — overlapping rounded shells (like reference)
  const pL1 = halfSphere(0.12, 8, st, 0.52)
  pL1.scale.set(1.2, 0.60, 1.1)
  pL1.position.set(-0.02, 0.06, 0)
  armL.add(pL1)
  const pL2 = halfSphere(0.10, 8, sw, 0.50)
  pL2.scale.set(1.15, 0.55, 1.05)
  pL2.position.set(-0.02, 0.01, 0)
  armL.add(pL2)
  const pL3 = halfSphere(0.085, 7, sd, 0.48)
  pL3.scale.set(1.1, 0.50, 1.0)
  pL3.position.set(-0.02, -0.03, 0)
  armL.add(pL3)
  // Pauldron ridges
  armL.add(at(cyl(0.10, 0.11, 0.012, 8, sd), -0.02, 0.04, 0))
  armL.add(at(cyl(0.09, 0.10, 0.010, 8, sd), -0.02, 0.0, 0))
  // Shoulder joint ring
  armL.add(at(cyl(0.065, 0.065, 0.025, 8, sd), 0, -0.05, 0))

  // Upper arm (chainmail visible)
  armL.add(at(cyl(0.058, 0.052, 0.22, 8, cm), 0, -0.16, 0))
  // Upper arm plate (rerebrace)
  armL.add(at(box(0.07, 0.14, 0.055, sw), 0, -0.12, -0.02))

  // Elbow (rounded)
  armL.add(at(sphere(0.056, 8, sd), 0, -0.28, 0))
  // Elbow cop (pointed)
  const elbowCopL = box(0.04, 0.04, 0.04, st)
  elbowCopL.rotation.z = Math.PI / 4
  elbowCopL.position.set(0, -0.28, -0.045)
  armL.add(elbowCopL)

  // Forearm (chainmail base)
  armL.add(at(cyl(0.053, 0.047, 0.20, 8, cm), 0, -0.39, 0))
  // Vambrace (forearm plate)
  armL.add(at(box(0.075, 0.15, 0.06, st), 0, -0.37, -0.02))
  // Vambrace ridges
  armL.add(at(box(0.08, 0.012, 0.065, sd), 0, -0.32, -0.02))
  armL.add(at(box(0.08, 0.012, 0.065, sd), 0, -0.42, -0.02))

  // Gauntlet
  armL.add(at(box(0.085, 0.035, 0.10, st), 0, -0.49, 0))
  armL.add(at(cyl(0.048, 0.042, 0.03, 7, sd), 0, -0.47, 0))
  // Finger plates
  armL.add(at(box(0.07, 0.03, 0.06, sw), 0, -0.53, -0.02))

  root.add(armL)

  // =========================================================================
  //  RIGHT ARM — mirror
  // =========================================================================
  const armR = new THREE.Group()
  armR.name = 'ArmR'
  armR.position.set(0.27, 1.30, 0)

  const pR1 = halfSphere(0.12, 8, st, 0.52)
  pR1.scale.set(1.2, 0.60, 1.1)
  pR1.position.set(0.02, 0.06, 0)
  armR.add(pR1)
  const pR2 = halfSphere(0.10, 8, sw, 0.50)
  pR2.scale.set(1.15, 0.55, 1.05)
  pR2.position.set(0.02, 0.01, 0)
  armR.add(pR2)
  const pR3 = halfSphere(0.085, 7, sd, 0.48)
  pR3.scale.set(1.1, 0.50, 1.0)
  pR3.position.set(0.02, -0.03, 0)
  armR.add(pR3)
  armR.add(at(cyl(0.10, 0.11, 0.012, 8, sd), 0.02, 0.04, 0))
  armR.add(at(cyl(0.09, 0.10, 0.010, 8, sd), 0.02, 0.0, 0))
  armR.add(at(cyl(0.065, 0.065, 0.025, 8, sd), 0, -0.05, 0))

  armR.add(at(cyl(0.058, 0.052, 0.22, 8, cm), 0, -0.16, 0))
  armR.add(at(box(0.07, 0.14, 0.055, sw), 0, -0.12, -0.02))

  armR.add(at(sphere(0.056, 8, sd), 0, -0.28, 0))
  const elbowCopR = box(0.04, 0.04, 0.04, st)
  elbowCopR.rotation.z = Math.PI / 4
  elbowCopR.position.set(0, -0.28, -0.045)
  armR.add(elbowCopR)

  armR.add(at(cyl(0.053, 0.047, 0.20, 8, cm), 0, -0.39, 0))
  armR.add(at(box(0.075, 0.15, 0.06, st), 0, -0.37, -0.02))
  armR.add(at(box(0.08, 0.012, 0.065, sd), 0, -0.32, -0.02))
  armR.add(at(box(0.08, 0.012, 0.065, sd), 0, -0.42, -0.02))

  armR.add(at(box(0.085, 0.035, 0.10, st), 0, -0.49, 0))
  armR.add(at(cyl(0.048, 0.042, 0.03, 7, sd), 0, -0.47, 0))
  armR.add(at(box(0.07, 0.03, 0.06, sw), 0, -0.53, -0.02))

  root.add(armR)

  // =========================================================================
  //  LEFT LEG — pivot at hip (y=0.76, x=-0.11)
  // =========================================================================
  const legL = new THREE.Group()
  legL.name = 'LegL'
  legL.position.set(-0.11, 0.76, 0)

  // Thigh chainmail base
  legL.add(at(cyl(0.082, 0.072, 0.28, 8, cm), 0, -0.14, 0))
  // Cuisse (thigh plate — front)
  legL.add(at(box(0.095, 0.20, 0.05, st), 0, -0.11, -0.05))
  // Side plate
  legL.add(at(box(0.04, 0.16, 0.07, sw), -0.055, -0.13, 0))
  // Cuisse ridges
  legL.add(at(box(0.10, 0.012, 0.055, sd), 0, -0.04, -0.05))
  legL.add(at(box(0.10, 0.012, 0.055, sd), 0, -0.18, -0.05))

  // Knee — rounded cop with point
  legL.add(at(sphere(0.072, 8, sd), 0, -0.28, -0.01))
  // Knee cap (segmented, like reference)
  legL.add(at(box(0.078, 0.04, 0.06, st), 0, -0.26, -0.055))
  legL.add(at(box(0.07, 0.035, 0.055, sw), 0, -0.295, -0.055))
  // Knee point
  const kpL = box(0.032, 0.032, 0.032, st)
  kpL.rotation.z = Math.PI / 4
  kpL.position.set(0, -0.32, -0.06)
  legL.add(kpL)

  // Greave (lower leg — steel plate)
  legL.add(at(cyl(0.068, 0.072, 0.30, 8, st), 0, -0.45, 0))
  // Shin plate (overlapping)
  legL.add(at(box(0.068, 0.14, 0.045, sw), 0, -0.38, -0.05))
  legL.add(at(box(0.065, 0.12, 0.04, sd), 0, -0.48, -0.05))
  // Greave ridges
  legL.add(at(box(0.075, 0.012, 0.05, sd), 0, -0.34, -0.05))
  legL.add(at(box(0.072, 0.012, 0.05, sd), 0, -0.44, -0.05))
  legL.add(at(box(0.068, 0.012, 0.05, sd), 0, -0.54, -0.05))
  // Calf plate
  legL.add(at(box(0.055, 0.18, 0.035, sw), 0, -0.44, 0.05))

  // Ankle ring
  legL.add(at(cyl(0.074, 0.078, 0.03, 8, sd), 0, -0.61, 0))
  // Sabaton (boot armor)
  legL.add(at(box(0.13, 0.05, 0.18, st), 0, -0.65, -0.02))
  // Toe cap (rounded via cylinder)
  legL.add(at(cyl(0.055, 0.06, 0.06, 7, sw), 0, -0.65, -0.12))
  // Heel
  legL.add(at(box(0.07, 0.04, 0.05, sd), 0, -0.66, 0.08))
  // Sole (leather)
  legL.add(at(box(0.14, 0.018, 0.22, ld), 0, -0.69, -0.02))

  root.add(legL)

  // =========================================================================
  //  RIGHT LEG — mirror
  // =========================================================================
  const legR = new THREE.Group()
  legR.name = 'LegR'
  legR.position.set(0.11, 0.76, 0)

  legR.add(at(cyl(0.082, 0.072, 0.28, 8, cm), 0, -0.14, 0))
  legR.add(at(box(0.095, 0.20, 0.05, st), 0, -0.11, -0.05))
  legR.add(at(box(0.04, 0.16, 0.07, sw), 0.055, -0.13, 0))
  legR.add(at(box(0.10, 0.012, 0.055, sd), 0, -0.04, -0.05))
  legR.add(at(box(0.10, 0.012, 0.055, sd), 0, -0.18, -0.05))

  legR.add(at(sphere(0.072, 8, sd), 0, -0.28, -0.01))
  legR.add(at(box(0.078, 0.04, 0.06, st), 0, -0.26, -0.055))
  legR.add(at(box(0.07, 0.035, 0.055, sw), 0, -0.295, -0.055))
  const kpR = box(0.032, 0.032, 0.032, st)
  kpR.rotation.z = Math.PI / 4
  kpR.position.set(0, -0.32, -0.06)
  legR.add(kpR)

  legR.add(at(cyl(0.068, 0.072, 0.30, 8, st), 0, -0.45, 0))
  legR.add(at(box(0.068, 0.14, 0.045, sw), 0, -0.38, -0.05))
  legR.add(at(box(0.065, 0.12, 0.04, sd), 0, -0.48, -0.05))
  legR.add(at(box(0.075, 0.012, 0.05, sd), 0, -0.34, -0.05))
  legR.add(at(box(0.072, 0.012, 0.05, sd), 0, -0.44, -0.05))
  legR.add(at(box(0.068, 0.012, 0.05, sd), 0, -0.54, -0.05))
  legR.add(at(box(0.055, 0.18, 0.035, sw), 0, -0.44, 0.05))

  legR.add(at(cyl(0.074, 0.078, 0.03, 8, sd), 0, -0.61, 0))
  legR.add(at(box(0.13, 0.05, 0.18, st), 0, -0.65, -0.02))
  legR.add(at(cyl(0.055, 0.06, 0.06, 7, sw), 0, -0.65, -0.12))
  legR.add(at(box(0.07, 0.04, 0.05, sd), 0, -0.66, 0.08))
  legR.add(at(box(0.14, 0.018, 0.22, ld), 0, -0.69, -0.02))

  root.add(legR)

  // =========================================================================
  //  CAPE — tattered cloth
  // =========================================================================
  const capeGeo = new THREE.PlaneGeometry(0.48, 1.10, 6, 14)
  const capeMesh = new THREE.Mesh(capeGeo, cl)
  capeMesh.name = 'Cape'
  capeMesh.position.set(0, 0.86, 0.17)
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

  const walkBlend = THREE.MathUtils.smoothstep(speed, 0.2, 2.5)
  const runBlend = THREE.MathUtils.smoothstep(speed, 6.0, 9.5)
  const idleBlend = 1 - walkBlend

  const p = phase * Math.PI * 2

  const legP = p
  const bodyP = p - 0.18
  const armP = p + Math.PI - 0.12
  const headP = p - 0.25

  const idleBob = Math.sin(_t * 1.1) * 0.005 * idleBlend
  const idleSway = Math.sin(_t * 0.55) * 0.006 * idleBlend
  const idleArmDrift = Math.sin(_t * 0.7) * 0.02 * idleBlend
  const idleHeadTilt = Math.sin(_t * 0.85) * 0.01 * idleBlend
  const idleBreath = Math.sin(_t * 1.6) * 0.004 * idleBlend

  const legAmp = THREE.MathUtils.lerp(0.30, 0.55, runBlend) * walkBlend
  const armAmp = THREE.MathUtils.lerp(0.20, 0.40, runBlend) * walkBlend
  const bobAmp = THREE.MathUtils.lerp(0.025, 0.050, runBlend) * walkBlend
  const leanAmp = THREE.MathUtils.lerp(0.015, 0.032, runBlend) * walkBlend
  const headCtr = THREE.MathUtils.lerp(0.012, 0.022, runBlend) * walkBlend
  const fwdLean = THREE.MathUtils.lerp(0.008, 0.025, runBlend) * walkBlend

  const legSinL = Math.sin(legP)
  const legSinR = Math.sin(legP + Math.PI)

  limbs.legL.rotation.x = legSinL * legAmp
  limbs.legR.rotation.x = legSinR * legAmp
  limbs.legL.rotation.z = Math.abs(legSinL) * 0.018 * walkBlend
  limbs.legR.rotation.z = -Math.abs(legSinR) * 0.018 * walkBlend

  limbs.armL.rotation.x = Math.sin(armP + Math.PI) * armAmp + idleArmDrift
  limbs.armR.rotation.x = Math.sin(armP) * armAmp - idleArmDrift
  const armOutBase = 0.06 + runBlend * 0.04
  limbs.armL.rotation.z = armOutBase + Math.sin(armP + Math.PI) * 0.025 * walkBlend
  limbs.armR.rotation.z = -armOutBase - Math.sin(armP) * 0.025 * walkBlend

  const bodySin = Math.sin(bodyP)
  const bob = Math.abs(Math.sin(bodyP)) * bobAmp + idleBob + idleBreath
  limbs.body.position.y = 0.86 + bob
  limbs.body.rotation.z = bodySin * leanAmp + idleSway
  limbs.body.rotation.x = -fwdLean - Math.abs(Math.sin(bodyP * 0.5)) * 0.008 * walkBlend

  limbs.head.rotation.x = -Math.sin(headP) * headCtr + idleHeadTilt
  limbs.head.rotation.z = -bodySin * leanAmp * 0.35

  limbs.cape.position.y = 0.86 + bob

  limbs.tabard.rotation.x = Math.sin(legP * 0.5) * 0.05 * walkBlend

  for (const mat of limbs.glowMats) {
    mat.emissiveIntensity = 0.85 + 0.15 * Math.sin(_t * 1.8)
  }
}
