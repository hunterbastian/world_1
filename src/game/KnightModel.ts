import * as THREE from 'three'

const armor = () => new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.84, metalness: 0.28 })
const armorDark = () => new THREE.MeshStandardMaterial({ color: 0x2c2c34, roughness: 0.88, metalness: 0.22 })
const chainmail = () => new THREE.MeshStandardMaterial({ color: 0x4a4a54, roughness: 0.75, metalness: 0.40 })
const leather = () => new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.95, metalness: 0.05 })
const cloth = () => new THREE.MeshStandardMaterial({ color: 0x1e1e28, roughness: 0.92, metalness: 0.0, side: THREE.DoubleSide })
const visorMat = () => new THREE.MeshStandardMaterial({ color: 0x0a0a0e, emissive: 0x1a2a4a, emissiveIntensity: 0.25, roughness: 0.5, metalness: 0.0 })

export type KnightLimbs = {
  body: THREE.Group
  head: THREE.Group
  armL: THREE.Group
  armR: THREE.Group
  legL: THREE.Group
  legR: THREE.Group
  cape: THREE.Mesh
  tabard: THREE.Mesh
}

export function buildKnightModel(): { root: THREE.Group; limbs: KnightLimbs } {
  const root = new THREE.Group()
  root.name = 'KnightModel'

  const a = armor()
  const ad = armorDark()
  const cm = chainmail()
  const lth = leather()
  const cl = cloth()

  // === BODY (pivot at waist center y=0.88) ===
  const body = new THREE.Group()
  body.name = 'Body'
  body.position.set(0, 0.88, 0)

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.26), a)
  torso.position.set(0, 0.28, 0)
  body.add(torso)

  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.20, 0.05), ad)
  chestPlate.position.set(0, 0.34, -0.155)
  body.add(chestPlate)

  const chestRidge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.04), a)
  chestRidge.position.set(0, 0.30, -0.175)
  body.add(chestRidge)

  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.04), ad)
  backPlate.position.set(0, 0.32, 0.15)
  body.add(backPlate)

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.28), lth)
  belt.position.set(0, 0.02, 0)
  body.add(belt)

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.04), a)
  buckle.position.set(0, 0.02, -0.16)
  body.add(buckle)

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.22, 0.30), cm)
  skirt.position.set(0, -0.13, 0)
  body.add(skirt)

  const skirtFlap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.10, 0.04), lth)
  skirtFlap.position.set(0, -0.20, -0.17)
  body.add(skirtFlap)

  const tabard = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.50, 3, 6), cl)
  tabard.name = 'Tabard'
  tabard.position.set(0, -0.27, -0.15)
  body.add(tabard)

  root.add(body)

  // === HEAD (pivot at neck base y=1.38) ===
  const head = new THREE.Group()
  head.name = 'Head'
  head.position.set(0, 1.38, 0)

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.10, 7), cm)
  neck.position.set(0, 0.05, 0)
  head.add(neck)

  const coif = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.08, 7), cm)
  coif.position.set(0, 0.10, 0)
  head.add(coif)

  const helmetBase = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.145, 0.24, 8), a)
  helmetBase.position.set(0, 0.22, 0)
  head.add(helmetBase)

  const helmetDome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), a)
  helmetDome.position.set(0, 0.34, 0)
  head.add(helmetDome)

  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.18), ad)
  crest.position.set(0, 0.38, 0)
  head.add(crest)

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.07), visorMat())
  visor.position.set(0, 0.18, -0.125)
  head.add(visor)

  const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.035), a)
  facePlate.position.set(0, 0.14, -0.15)
  head.add(facePlate)

  const chinGuard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.06), ad)
  chinGuard.position.set(0, 0.06, -0.13)
  head.add(chinGuard)

  root.add(head)

  // === LEFT ARM (pivot at shoulder y=1.32, x=-0.26) ===
  const armL = new THREE.Group()
  armL.name = 'ArmL'
  armL.position.set(-0.26, 1.32, 0)

  const pauldronOuterL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), a)
  pauldronOuterL.position.set(-0.02, 0.04, 0)
  pauldronOuterL.scale.set(1.2, 0.65, 1.1)
  armL.add(pauldronOuterL)

  const pauldronInnerL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5), ad)
  pauldronInnerL.position.set(-0.02, 0.0, 0)
  pauldronInnerL.scale.set(1.1, 0.55, 1.0)
  armL.add(pauldronInnerL)

  const upperArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.26, 7), cm)
  upperArmL.position.set(0, -0.16, 0)
  armL.add(upperArmL)

  const elbowL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), a)
  elbowL.position.set(0, -0.30, 0)
  armL.add(elbowL)

  const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.22, 7), cm)
  forearmL.position.set(0, -0.42, 0)
  armL.add(forearmL)

  const vambraceL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.08), a)
  vambraceL.position.set(0, -0.40, -0.02)
  armL.add(vambraceL)

  const gauntletL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.12), ad)
  gauntletL.position.set(0, -0.56, 0)
  armL.add(gauntletL)

  root.add(armL)

  // === RIGHT ARM (mirror) ===
  const armR = new THREE.Group()
  armR.name = 'ArmR'
  armR.position.set(0.26, 1.32, 0)

  const pauldronOuterR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), a)
  pauldronOuterR.position.set(0.02, 0.04, 0)
  pauldronOuterR.scale.set(1.2, 0.65, 1.1)
  armR.add(pauldronOuterR)

  const pauldronInnerR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5), ad)
  pauldronInnerR.position.set(0.02, 0.0, 0)
  pauldronInnerR.scale.set(1.1, 0.55, 1.0)
  armR.add(pauldronInnerR)

  const upperArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.26, 7), cm)
  upperArmR.position.set(0, -0.16, 0)
  armR.add(upperArmR)

  const elbowR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), a)
  elbowR.position.set(0, -0.30, 0)
  armR.add(elbowR)

  const forearmR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.22, 7), cm)
  forearmR.position.set(0, -0.42, 0)
  armR.add(forearmR)

  const vambraceR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.08), a)
  vambraceR.position.set(0, -0.40, -0.02)
  armR.add(vambraceR)

  const gauntletR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.12), ad)
  gauntletR.position.set(0, -0.56, 0)
  armR.add(gauntletR)

  root.add(armR)

  // === LEFT LEG (pivot at hip y=0.78, x=-0.11) ===
  const legL = new THREE.Group()
  legL.name = 'LegL'
  legL.position.set(-0.11, 0.78, 0)

  const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.34, 7), cm)
  thighL.position.set(0, -0.17, 0)
  legL.add(thighL)

  const thighPlateL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.06), a)
  thighPlateL.position.set(0, -0.14, -0.05)
  legL.add(thighPlateL)

  const kneeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), a)
  kneeL.position.set(0, -0.34, -0.02)
  legL.add(kneeL)

  const kneeCapL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.05), ad)
  kneeCapL.position.set(0, -0.34, -0.06)
  legL.add(kneeCapL)

  const greaveL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.36, 7), a)
  greaveL.position.set(0, -0.54, 0)
  legL.add(greaveL)

  const shinGuardL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.05), ad)
  shinGuardL.position.set(0, -0.50, -0.05)
  legL.add(shinGuardL)

  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.26), lth)
  bootL.position.set(0, -0.74, -0.02)
  legL.add(bootL)

  const solePlateL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.22), ad)
  solePlateL.position.set(0, -0.79, -0.02)
  legL.add(solePlateL)

  root.add(legL)

  // === RIGHT LEG (mirror) ===
  const legR = new THREE.Group()
  legR.name = 'LegR'
  legR.position.set(0.11, 0.78, 0)

  const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.34, 7), cm)
  thighR.position.set(0, -0.17, 0)
  legR.add(thighR)

  const thighPlateR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.06), a)
  thighPlateR.position.set(0, -0.14, -0.05)
  legR.add(thighPlateR)

  const kneeR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), a)
  kneeR.position.set(0, -0.34, -0.02)
  legR.add(kneeR)

  const kneeCapR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.05), ad)
  kneeCapR.position.set(0, -0.34, -0.06)
  legR.add(kneeCapR)

  const greaveR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.36, 7), a)
  greaveR.position.set(0, -0.54, 0)
  legR.add(greaveR)

  const shinGuardR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.05), ad)
  shinGuardR.position.set(0, -0.50, -0.05)
  legR.add(shinGuardR)

  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.26), lth)
  bootR.position.set(0, -0.74, -0.02)
  legR.add(bootR)

  const solePlateR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.22), ad)
  solePlateR.position.set(0, -0.79, -0.02)
  legR.add(solePlateR)

  root.add(legR)

  // === CAPE (attached at shoulders, hangs down back) ===
  const capeGeo = new THREE.PlaneGeometry(0.44, 1.0, 5, 12)
  const capeMesh = new THREE.Mesh(capeGeo, cl)
  capeMesh.name = 'Cape'
  capeMesh.position.set(0, 0.88, 0.16)
  root.add(capeMesh)

  return {
    root,
    limbs: { body, head, armL, armR, legL, legR, cape: capeMesh, tabard },
  }
}

const _stride = { phase: 0 }

export function animateKnight(
  limbs: KnightLimbs,
  dt: number,
  speed: number,
  phase: number,
) {
  const walkBlend = THREE.MathUtils.smoothstep(speed, 0.3, 2.0)
  const runBlend = THREE.MathUtils.smoothstep(speed, 6.5, 9.5)
  _stride.phase += dt

  const t = _stride.phase

  const p = phase * Math.PI * 2

  // --- IDLE (always running, faded by walkBlend) ---
  const idleBlend = 1 - walkBlend
  const idleBodyBob = Math.sin(t * 1.2) * 0.006 * idleBlend
  const idleArmSway = Math.sin(t * 0.8) * 0.025 * idleBlend
  const idleHeadNod = Math.sin(t * 0.9) * 0.012 * idleBlend
  const idleBodySway = Math.sin(t * 0.6) * 0.008 * idleBlend

  // --- WALK ---
  const legSwing = THREE.MathUtils.lerp(0.32, 0.52, runBlend) * walkBlend
  const armSwing = THREE.MathUtils.lerp(0.22, 0.38, runBlend) * walkBlend
  const bodyBob = THREE.MathUtils.lerp(0.03, 0.055, runBlend) * walkBlend
  const bodyLean = THREE.MathUtils.lerp(0.018, 0.035, runBlend) * walkBlend
  const headCounter = THREE.MathUtils.lerp(0.015, 0.025, runBlend) * walkBlend

  // Weighty delay: legs lead, body follows with slight lag
  const legPhase = p
  const bodyPhase = p - 0.15
  const armPhase = p + Math.PI - 0.1

  // Legs: forward/back swing with slight outward kick
  limbs.legL.rotation.x = Math.sin(legPhase) * legSwing
  limbs.legR.rotation.x = Math.sin(legPhase + Math.PI) * legSwing
  limbs.legL.rotation.z = Math.abs(Math.sin(legPhase)) * 0.02 * walkBlend
  limbs.legR.rotation.z = -Math.abs(Math.sin(legPhase + Math.PI)) * 0.02 * walkBlend

  // Arms: counter-swing to legs, heavier at run speed
  limbs.armL.rotation.x = Math.sin(armPhase + Math.PI) * armSwing + idleArmSway
  limbs.armR.rotation.x = Math.sin(armPhase) * armSwing - idleArmSway
  limbs.armL.rotation.z = 0.08 + Math.sin(armPhase + Math.PI) * 0.03 * walkBlend
  limbs.armR.rotation.z = -0.08 - Math.sin(armPhase) * 0.03 * walkBlend

  // Body: vertical bob on double-frequency (two steps per cycle), plus lean
  const bob = Math.abs(Math.sin(bodyPhase)) * bodyBob + idleBodyBob
  limbs.body.position.y = 0.88 + bob
  limbs.body.rotation.z = Math.sin(bodyPhase) * bodyLean + idleBodySway
  limbs.body.rotation.x = -Math.abs(Math.sin(bodyPhase * 0.5)) * 0.012 * walkBlend

  // Head: slight counter-rotation for weight
  limbs.head.rotation.x = -Math.sin(bodyPhase) * headCounter + idleHeadNod
  limbs.head.rotation.z = -Math.sin(bodyPhase) * bodyLean * 0.3

  // Cape position follows body
  limbs.cape.position.y = 0.88 + bob

  // Tabard slight swing
  limbs.tabard.rotation.x = Math.sin(legPhase * 0.5) * 0.06 * walkBlend
}
