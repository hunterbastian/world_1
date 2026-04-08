import * as THREE from 'three'

const M = {
  hull: () => new THREE.MeshStandardMaterial({ color: 0x3c3e48, roughness: 0.80, metalness: 0.35 }),
  hullWorn: () => new THREE.MeshStandardMaterial({ color: 0x34363e, roughness: 0.92, metalness: 0.20 }),
  panel: () => new THREE.MeshStandardMaterial({ color: 0x484a55, roughness: 0.78, metalness: 0.38 }),
  panelDark: () => new THREE.MeshStandardMaterial({ color: 0x2a2c34, roughness: 0.85, metalness: 0.30 }),
  frame: () => new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.88, metalness: 0.42 }),
  undersuit: () => new THREE.MeshStandardMaterial({ color: 0x1e2028, roughness: 0.94, metalness: 0.10 }),
  rubber: () => new THREE.MeshStandardMaterial({ color: 0x181a1e, roughness: 0.97, metalness: 0.05 }),
  cloth: () => new THREE.MeshStandardMaterial({ color: 0x1a1c26, roughness: 0.93, metalness: 0.0, side: THREE.DoubleSide }),
  visor: () => new THREE.MeshStandardMaterial({ color: 0x0a0c14, emissive: 0x1a4a6a, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.15 }),
  glow: () => new THREE.MeshStandardMaterial({ color: 0x14283a, emissive: 0x1a5878, emissiveIntensity: 0.45, roughness: 0.4, metalness: 0.10 }),
  glowDim: () => new THREE.MeshStandardMaterial({ color: 0x182430, emissive: 0x164058, emissiveIntensity: 0.25, roughness: 0.5, metalness: 0.08 }),
  accent: () => new THREE.MeshStandardMaterial({ color: 0x506068, roughness: 0.70, metalness: 0.48 }),
}

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
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2), 0, Math.PI * 2, 0, Math.PI * arc), mat)
}
function at(mesh: THREE.Mesh, x: number, y: number, z: number): THREE.Mesh {
  mesh.position.set(x, y, z)
  return mesh
}

export function buildKnightModel(): { root: THREE.Group; limbs: KnightLimbs } {
  const root = new THREE.Group()
  root.name = 'KnightModel'

  const hl = M.hull()
  const hw = M.hullWorn()
  const pn = M.panel()
  const pd = M.panelDark()
  const fr = M.frame()
  const us = M.undersuit()
  const rb = M.rubber()
  const cl = M.cloth()
  const glowMats: THREE.MeshStandardMaterial[] = []

  function glowNode(w: number, h: number, d: number): THREE.Mesh {
    const mat = M.glow()
    glowMats.push(mat)
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  }

  function glowStrip(w: number, h: number, d: number): THREE.Mesh {
    const mat = M.glowDim()
    glowMats.push(mat)
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  }

  // =========================================================================
  //  BODY — pivot at waist (y=0.86)
  // =========================================================================
  const body = new THREE.Group()
  body.name = 'Body'
  body.position.set(0, 0.86, 0)

  // Core chassis / undersuit
  body.add(at(box(0.42, 0.16, 0.24, us), 0, 0.08, 0))

  // Upper torso — angular plates
  body.add(at(box(0.48, 0.28, 0.25, hl), 0, 0.28, 0))
  // Chest panel (front face)
  body.add(at(box(0.36, 0.20, 0.05, pn), 0, 0.32, -0.15))
  // Center seam strip
  body.add(at(box(0.03, 0.24, 0.035, fr), 0, 0.30, -0.17))
  // Chest glow seam
  body.add(at(glowStrip(0.20, 0.015, 0.04), 0, 0.38, -0.155))
  // Upper collar plate
  body.add(at(box(0.44, 0.045, 0.22, pd), 0, 0.44, 0))
  // Side panels
  body.add(at(box(0.055, 0.22, 0.18, pd), -0.245, 0.28, 0))
  body.add(at(box(0.055, 0.22, 0.18, pd), 0.245, 0.28, 0))
  // Side glow indicators
  body.add(at(glowNode(0.02, 0.04, 0.03), -0.275, 0.32, -0.04))
  body.add(at(glowNode(0.02, 0.04, 0.03), 0.275, 0.32, -0.04))
  // Back plate
  body.add(at(box(0.40, 0.24, 0.04, hw), 0, 0.30, 0.15))
  // Back vent grille
  body.add(at(box(0.16, 0.10, 0.025, fr), 0, 0.34, 0.165))

  // Waist / tactical belt
  body.add(at(box(0.50, 0.065, 0.28, fr), 0, 0.0, 0))
  // Belt segments
  body.add(at(box(0.12, 0.05, 0.035, pd), -0.14, 0.0, -0.155))
  body.add(at(box(0.12, 0.05, 0.035, pd), 0.14, 0.0, -0.155))
  // Belt buckle (tech)
  body.add(at(glowNode(0.06, 0.04, 0.03), 0, 0.0, -0.16))
  // Utility pouches
  body.add(at(box(0.065, 0.055, 0.055, pd), -0.19, -0.02, -0.12))
  body.add(at(box(0.055, 0.045, 0.05, pd), 0.21, -0.01, -0.11))

  // Segmented lower plates (replaces chainmail)
  body.add(at(box(0.48, 0.07, 0.28, hl), 0, -0.06, 0))
  body.add(at(box(0.46, 0.06, 0.27, hw), 0, -0.13, 0))
  body.add(at(box(0.44, 0.05, 0.26, pd), 0, -0.19, 0))
  // Front tasset plates
  body.add(at(box(0.13, 0.14, 0.035, pn), -0.11, -0.18, -0.15))
  body.add(at(box(0.13, 0.14, 0.035, pn), 0.11, -0.18, -0.15))
  body.add(at(box(0.09, 0.16, 0.03, hl), 0, -0.19, -0.155))
  // Rear plate
  body.add(at(box(0.34, 0.10, 0.035, hw), 0, -0.18, 0.16))

  // Tabard (tech fabric hanging from front)
  const tabardGeo = new THREE.PlaneGeometry(0.24, 0.40, 3, 8)
  const tabard = new THREE.Mesh(tabardGeo, cl)
  tabard.name = 'Tabard'
  tabard.position.set(0, -0.30, -0.15)
  body.add(tabard)
  // Tabard edge glow strip
  body.add(at(glowStrip(0.03, 0.34, 0.005), 0, -0.28, -0.153))

  root.add(body)

  // =========================================================================
  //  HEAD — pivot at neck (y=1.36)
  // =========================================================================
  const head = new THREE.Group()
  head.name = 'Head'
  head.position.set(0, 1.36, 0)

  // Neck ring / collar
  head.add(at(cyl(0.09, 0.10, 0.06, 8, fr), 0, 0.03, 0))
  // Neck undersuit
  head.add(at(cyl(0.075, 0.085, 0.08, 8, us), 0, 0.06, 0))

  // Helmet — angular barrel shape
  head.add(at(cyl(0.14, 0.15, 0.26, 8, hl), 0, 0.24, 0))
  // Helmet dome (slightly angular)
  head.add(at(halfSphere(0.145, 8, pn, 0.48), 0, 0.37, 0))
  // Sensor fin (replaces crest)
  head.add(at(box(0.025, 0.12, 0.16, fr), 0, 0.44, 0))
  // Fin tip glow
  head.add(at(glowNode(0.018, 0.03, 0.018), 0, 0.50, 0))
  // Brow ridge (angular)
  head.add(at(box(0.30, 0.025, 0.14, pd), 0, 0.31, -0.04))

  // Face plate (angular)
  head.add(at(box(0.20, 0.17, 0.04, pn), 0, 0.16, -0.15))
  // Visor slit (wider, brighter)
  const visorMat = M.visor()
  glowMats.push(visorMat)
  head.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.028, 0.06), visorMat), 0, 0.21, -0.14))
  // Nose bridge (angular vertical)
  head.add(at(box(0.022, 0.10, 0.04, fr), 0, 0.17, -0.165))
  // Jaw plate
  head.add(at(box(0.18, 0.05, 0.055, pd), 0, 0.08, -0.13))
  // Cheek vents
  head.add(at(box(0.025, 0.06, 0.06, fr), -0.10, 0.15, -0.11))
  head.add(at(box(0.025, 0.06, 0.06, fr), 0.10, 0.15, -0.11))
  // Side panels
  head.add(at(box(0.04, 0.14, 0.10, hw), -0.13, 0.18, 0))
  head.add(at(box(0.04, 0.14, 0.10, hw), 0.13, 0.18, 0))
  // Ear nodes (small sensor bumps)
  head.add(at(glowNode(0.025, 0.025, 0.02), -0.155, 0.22, 0))
  head.add(at(glowNode(0.025, 0.025, 0.02), 0.155, 0.22, 0))
  // Rear neck guard
  head.add(at(box(0.18, 0.08, 0.04, pd), 0, 0.08, 0.12))

  // Neck drape (tech fabric)
  const neckDrape = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.16, 3, 3), cl)
  neckDrape.position.set(0, 0.04, 0.14)
  neckDrape.rotation.x = 0.25
  head.add(neckDrape)

  root.add(head)

  // =========================================================================
  //  LEFT ARM — pivot at shoulder (y=1.30, x=-0.27)
  // =========================================================================
  const armL = new THREE.Group()
  armL.name = 'ArmL'
  armL.position.set(-0.27, 1.30, 0)

  // Shoulder plate (angular, not round)
  armL.add(at(box(0.18, 0.06, 0.14, pn), -0.02, 0.04, 0))
  // Shoulder plate lower
  armL.add(at(box(0.16, 0.045, 0.12, pd), -0.02, -0.01, 0))
  // Shoulder glow
  armL.add(at(glowNode(0.04, 0.015, 0.03), -0.02, 0.07, -0.04))
  // Shoulder mount ring
  armL.add(at(cyl(0.065, 0.065, 0.02, 7, fr), 0, -0.03, 0))

  // Upper arm
  armL.add(at(cyl(0.058, 0.052, 0.22, 7, us), 0, -0.15, 0))
  // Upper arm plate
  armL.add(at(box(0.065, 0.14, 0.055, hl), 0, -0.12, -0.02))
  // Elbow joint
  armL.add(at(sphere(0.055, 7, fr), 0, -0.27, 0))
  // Elbow guard (angular)
  armL.add(at(box(0.05, 0.055, 0.065, pd), 0, -0.27, -0.04))

  // Forearm
  armL.add(at(cyl(0.052, 0.046, 0.20, 7, us), 0, -0.38, 0))
  // Forearm armor
  armL.add(at(box(0.075, 0.16, 0.06, pn), 0, -0.36, -0.02))
  // Forearm glow strip
  armL.add(at(glowStrip(0.015, 0.10, 0.02), 0, -0.36, -0.055))

  // Gauntlet
  armL.add(at(box(0.085, 0.035, 0.10, pd), 0, -0.48, 0))
  armL.add(at(box(0.09, 0.02, 0.11, fr), 0, -0.46, 0))
  armL.add(at(box(0.065, 0.035, 0.055, pd), 0, -0.52, -0.02))

  root.add(armL)

  // =========================================================================
  //  RIGHT ARM — mirror
  // =========================================================================
  const armR = new THREE.Group()
  armR.name = 'ArmR'
  armR.position.set(0.27, 1.30, 0)

  armR.add(at(box(0.18, 0.06, 0.14, pn), 0.02, 0.04, 0))
  armR.add(at(box(0.16, 0.045, 0.12, pd), 0.02, -0.01, 0))
  armR.add(at(glowNode(0.04, 0.015, 0.03), 0.02, 0.07, -0.04))
  armR.add(at(cyl(0.065, 0.065, 0.02, 7, fr), 0, -0.03, 0))

  armR.add(at(cyl(0.058, 0.052, 0.22, 7, us), 0, -0.15, 0))
  armR.add(at(box(0.065, 0.14, 0.055, hl), 0, -0.12, -0.02))
  armR.add(at(sphere(0.055, 7, fr), 0, -0.27, 0))
  armR.add(at(box(0.05, 0.055, 0.065, pd), 0, -0.27, -0.04))

  armR.add(at(cyl(0.052, 0.046, 0.20, 7, us), 0, -0.38, 0))
  armR.add(at(box(0.075, 0.16, 0.06, pn), 0, -0.36, -0.02))
  armR.add(at(glowStrip(0.015, 0.10, 0.02), 0, -0.36, -0.055))

  armR.add(at(box(0.085, 0.035, 0.10, pd), 0, -0.48, 0))
  armR.add(at(box(0.09, 0.02, 0.11, fr), 0, -0.46, 0))
  armR.add(at(box(0.065, 0.035, 0.055, pd), 0, -0.52, -0.02))

  root.add(armR)

  // =========================================================================
  //  LEFT LEG — pivot at hip (y=0.76, x=-0.11)
  // =========================================================================
  const legL = new THREE.Group()
  legL.name = 'LegL'
  legL.position.set(-0.11, 0.76, 0)

  // Thigh undersuit
  legL.add(at(cyl(0.082, 0.072, 0.28, 7, us), 0, -0.14, 0))
  // Thigh front plate
  legL.add(at(box(0.095, 0.20, 0.05, pn), 0, -0.11, -0.05))
  // Thigh side plate
  legL.add(at(box(0.04, 0.16, 0.075, pd), -0.055, -0.13, 0))
  // Thigh glow strip
  legL.add(at(glowStrip(0.012, 0.12, 0.015), 0, -0.11, -0.078))

  // Knee
  legL.add(at(sphere(0.07, 7, fr), 0, -0.28, -0.01))
  // Knee cap (angular)
  legL.add(at(box(0.075, 0.06, 0.055, pd), 0, -0.28, -0.055))
  // Knee point
  const kpL = box(0.035, 0.035, 0.035, fr)
  kpL.rotation.z = Math.PI / 4
  kpL.position.set(0, -0.31, -0.065)
  legL.add(kpL)

  // Greave (lower leg)
  legL.add(at(cyl(0.068, 0.07, 0.30, 7, hl), 0, -0.45, 0))
  // Shin plate
  legL.add(at(box(0.065, 0.22, 0.045, pn), 0, -0.43, -0.05))
  // Shin panel line
  legL.add(at(box(0.04, 0.18, 0.01, fr), 0, -0.43, -0.075))
  // Calf plate
  legL.add(at(box(0.055, 0.16, 0.035, hw), 0, -0.44, 0.05))

  // Ankle ring
  legL.add(at(cyl(0.072, 0.076, 0.035, 7, fr), 0, -0.61, 0))
  // Boot (angular, mech-like)
  legL.add(at(box(0.13, 0.055, 0.20, pd), 0, -0.65, -0.025))
  // Toe cap
  legL.add(at(box(0.11, 0.045, 0.055, fr), 0, -0.65, -0.13))
  // Heel
  legL.add(at(box(0.08, 0.04, 0.05, fr), 0, -0.66, 0.09))
  // Sole
  legL.add(at(box(0.14, 0.02, 0.22, rb), 0, -0.69, -0.02))

  root.add(legL)

  // =========================================================================
  //  RIGHT LEG — mirror
  // =========================================================================
  const legR = new THREE.Group()
  legR.name = 'LegR'
  legR.position.set(0.11, 0.76, 0)

  legR.add(at(cyl(0.082, 0.072, 0.28, 7, us), 0, -0.14, 0))
  legR.add(at(box(0.095, 0.20, 0.05, pn), 0, -0.11, -0.05))
  legR.add(at(box(0.04, 0.16, 0.075, pd), 0.055, -0.13, 0))
  legR.add(at(glowStrip(0.012, 0.12, 0.015), 0, -0.11, -0.078))

  legR.add(at(sphere(0.07, 7, fr), 0, -0.28, -0.01))
  legR.add(at(box(0.075, 0.06, 0.055, pd), 0, -0.28, -0.055))
  const kpR = box(0.035, 0.035, 0.035, fr)
  kpR.rotation.z = Math.PI / 4
  kpR.position.set(0, -0.31, -0.065)
  legR.add(kpR)

  legR.add(at(cyl(0.068, 0.07, 0.30, 7, hl), 0, -0.45, 0))
  legR.add(at(box(0.065, 0.22, 0.045, pn), 0, -0.43, -0.05))
  legR.add(at(box(0.04, 0.18, 0.01, fr), 0, -0.43, -0.075))
  legR.add(at(box(0.055, 0.16, 0.035, hw), 0, -0.44, 0.05))

  legR.add(at(cyl(0.072, 0.076, 0.035, 7, fr), 0, -0.61, 0))
  legR.add(at(box(0.13, 0.055, 0.20, pd), 0, -0.65, -0.025))
  legR.add(at(box(0.11, 0.045, 0.055, fr), 0, -0.65, -0.13))
  legR.add(at(box(0.08, 0.04, 0.05, fr), 0, -0.66, 0.09))
  legR.add(at(box(0.14, 0.02, 0.22, rb), 0, -0.69, -0.02))

  root.add(legR)

  // =========================================================================
  //  CAPE — tattered tech-fabric
  // =========================================================================
  const capeGeo = new THREE.PlaneGeometry(0.48, 1.10, 6, 14)
  const capeMesh = new THREE.Mesh(capeGeo, cl)
  capeMesh.name = 'Cape'
  capeMesh.position.set(0, 0.86, 0.17)
  root.add(capeMesh)

  return {
    root,
    limbs: { body, head, armL, armR, legL, legR, cape: capeMesh, tabard, glowMats },
  }
}

// =========================================================================
//  ANIMATION
// =========================================================================

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

  // === IDLE ===
  const idleBob = Math.sin(_t * 1.1) * 0.005 * idleBlend
  const idleSway = Math.sin(_t * 0.55) * 0.006 * idleBlend
  const idleArmDrift = Math.sin(_t * 0.7) * 0.02 * idleBlend
  const idleHeadTilt = Math.sin(_t * 0.85) * 0.01 * idleBlend
  const idleBreath = Math.sin(_t * 1.6) * 0.004 * idleBlend

  // === WALK / RUN ===
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

  // Glow pulse (slow, subtle, like dormant tech)
  const glowPulse = 0.85 + 0.15 * Math.sin(_t * 1.8)
  for (const mat of limbs.glowMats) {
    mat.emissiveIntensity = mat === limbs.glowMats[0]
      ? glowPulse * 0.45
      : glowPulse * (mat.emissiveIntensity > 0.3 ? 0.45 : 0.25)
  }
}
