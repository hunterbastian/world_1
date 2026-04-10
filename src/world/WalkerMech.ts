import * as THREE from 'three'
import { addOutlineShell } from '../render/OutlineShell'

export type WalkerTier = 'scout' | 'assault'

type TierDims = {
  bodyR: number
  bodySquashY: number
  bodyStretchZ: number
  collarH: number
  bellyH: number
  headW: number
  headH: number
  headD: number
  pylonLen: number
  barrelR: number
  barrelLen: number
  hipY: number
  hipXSpread: number
  hipZSpread: number
  upperLen: number
  upperR: number
  lowerLen: number
  lowerR: number
  footW: number
  footD: number
  footH: number
  toeLen: number
  toeW: number
  hullColor: number
  armorColor: number
  jointColor: number
}

function tierDims(tier: WalkerTier): TierDims {
  if (tier === 'scout') {
    return {
      bodyR: 1.05,
      bodySquashY: 0.62,
      bodyStretchZ: 1.08,
      collarH: 0.12,
      bellyH: 0.14,
      headW: 0.48,
      headH: 0.34,
      headD: 0.38,
      pylonLen: 0.32,
      barrelR: 0.055,
      barrelLen: 0.80,
      hipY: 1.90,
      hipXSpread: 0.88,
      hipZSpread: 0.58,
      upperLen: 1.10,
      upperR: 0.115,
      lowerLen: 1.0,
      lowerR: 0.085,
      footW: 0.28,
      footD: 0.30,
      footH: 0.065,
      toeLen: 0.20,
      toeW: 0.048,
      hullColor: 0x9a8868,    // weathered brass
      armorColor: 0xc4b08a,   // light bronze plate
      jointColor: 0x3e3228,   // dark corroded bronze
    }
  }
  return {
    bodyR: 1.78,
    bodySquashY: 0.58,
    bodyStretchZ: 1.12,
    collarH: 0.20,
    bellyH: 0.22,
    headW: 0.78,
    headH: 0.52,
    headD: 0.56,
    pylonLen: 0.50,
    barrelR: 0.092,
    barrelLen: 1.38,
    hipY: 3.0,
    hipXSpread: 1.45,
    hipZSpread: 0.95,
    upperLen: 1.65,
    upperR: 0.21,
    lowerLen: 1.50,
    lowerR: 0.155,
    footW: 0.50,
    footD: 0.52,
    footH: 0.12,
    toeLen: 0.34,
    toeW: 0.085,
    hullColor: 0x7a6848,     // darker weathered brass
    armorColor: 0xb09870,    // bronze plate
    jointColor: 0x2e2418,    // dark corroded bronze
  }
}

function shadeColor(hex: number, mult: number) {
  const c = new THREE.Color(hex)
  c.multiplyScalar(mult)
  return c.getHex()
}

function shadow(mesh: THREE.Mesh) {
  mesh.castShadow = true
  mesh.receiveShadow = true
}

/* ── Limb references for animation ─────────────────────────────── */

export type LegLimb = {
  upper: THREE.Group
  lower: THREE.Group
  foot: THREE.Group
  restUpperX: number
  restUpperZ: number
  restLowerX: number
  restFootX: number
  isFront: boolean
}

export type WalkerLimbs = {
  hull: THREE.Group
  head: THREE.Group
  weaponL: THREE.Group
  weaponR: THREE.Group
  legs: LegLimb[]
  restHullY: number
}

/* ── Walker model ──────────────────────────────────────────────── */

export type WalkerStompEvent = {
  position: THREE.Vector3
  intensity: number // 0-1, based on tier and movement
}

export class WalkerMech {
  public readonly object3d: THREE.Group
  public readonly tier: WalkerTier
  public readonly name: string
  public readonly limbs: WalkerLimbs
  public readonly stompListeners = new Set<(e: WalkerStompEvent) => void>()

  // Stomp phase tracking
  private stompPhase = 0
  private prevStompSin = 0

  // Activation state
  public activated = false
  private readonly activationListeners = new Set<(mech: WalkerMech) => void>()

  onActivation(cb: (mech: WalkerMech) => void) {
    this.activationListeners.add(cb)
    return () => this.activationListeners.delete(cb)
  }

  activate() {
    if (this.activated) return
    this.activated = true
    for (const cb of this.activationListeners) cb(this)
  }

  onStomp(cb: (e: WalkerStompEvent) => void) {
    this.stompListeners.add(cb)
    return () => this.stompListeners.delete(cb)
  }

  constructor(tier: WalkerTier, name: string) {
    this.tier = tier
    this.name = name
    this.object3d = new THREE.Group()
    this.object3d.name = `WalkerMech:${name}`

    const d = tierDims(tier)

    const hullMat = new THREE.MeshStandardMaterial({ color: d.hullColor, roughness: 0.62, metalness: 0.72 })
    const armorMat = new THREE.MeshStandardMaterial({ color: d.armorColor, roughness: 0.55, metalness: 0.68 })
    const jointMat = new THREE.MeshStandardMaterial({ color: d.jointColor, roughness: 0.78, metalness: 0.55 })
    const panelMat = new THREE.MeshStandardMaterial({
      color: shadeColor(d.hullColor, 0.72), roughness: 0.88, metalness: 0.25,
    })
    // Vex cyclops eye — glowing red-orange
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x220800, emissive: 0xff4400, emissiveIntensity: 2.5, roughness: 0.2, metalness: 0.0,
    })
    // Radiolaria glow — milky white energy in joints/seams
    const radiolariaMat = new THREE.MeshStandardMaterial({
      color: 0xe8e0d0, emissive: 0xf0e8d0, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.0,
    })

    /* ============ HULL (dome body) ============ */

    const hull = new THREE.Group()
    hull.name = 'Hull'

    const dome = new THREE.Mesh(new THREE.SphereGeometry(d.bodyR, 24, 16), hullMat)
    dome.scale.set(1.0, d.bodySquashY, d.bodyStretchZ)
    dome.position.y = d.hipY
    shadow(dome)
    hull.add(dome)

    const belly = new THREE.Mesh(
      new THREE.BoxGeometry(d.bodyR * 1.52, d.bellyH, d.bodyR * d.bodyStretchZ * 1.42),
      armorMat,
    )
    belly.position.y = d.hipY - d.bodyR * d.bodySquashY * 0.56
    shadow(belly)
    hull.add(belly)

    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(d.bodyR * 1.06, d.bodyR * 1.10, d.collarH, 24),
      armorMat,
    )
    collar.scale.z = d.bodyStretchZ
    collar.position.y = d.hipY + d.bodyR * d.bodySquashY * 0.18
    shadow(collar)
    hull.add(collar)

    const panelHeights = [-0.28, 0.0, 0.28]
    for (const hFrac of panelHeights) {
      const yOff = d.bodyR * d.bodySquashY * hFrac
      const sliceR = d.bodyR * Math.sqrt(Math.max(0.01, 1 - hFrac * hFrac))
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(sliceR * 2.08, 0.028, 0.048),
        panelMat,
      )
      strip.position.set(0, d.hipY + yOff, 0)
      shadow(strip)
      hull.add(strip)
    }

    const bustle = new THREE.Mesh(
      new THREE.BoxGeometry(d.bodyR * 0.62, d.bodyR * d.bodySquashY * 0.40, d.bodyR * 0.38),
      panelMat,
    )
    bustle.position.set(0, d.hipY - d.bodyR * d.bodySquashY * 0.08, d.bodyR * d.bodyStretchZ * 0.80)
    bustle.rotation.x = -0.15
    shadow(bustle)
    hull.add(bustle)

    // Radiolaria core — glowing orb visible through belly
    const coreR = d.bodyR * 0.28
    const core = new THREE.Mesh(new THREE.SphereGeometry(coreR, 16, 12), radiolariaMat)
    core.position.set(0, d.hipY - d.bodyR * d.bodySquashY * 0.45, 0)
    shadow(core)
    hull.add(core)

    // Core housing ring
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(coreR * 1.3, coreR * 0.15, 8, 20),
      jointMat,
    )
    coreRing.position.copy(core.position)
    coreRing.rotation.x = Math.PI / 2
    shadow(coreRing)
    hull.add(coreRing)

    // Decorative seam lines on hull (Vex geometric patterns)
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, d.bodyR * d.bodySquashY * 1.4, 0.02),
        radiolariaMat,
      )
      seam.position.set(
        Math.cos(angle) * d.bodyR * 0.95,
        d.hipY,
        Math.sin(angle) * d.bodyR * d.bodyStretchZ * 0.95,
      )
      shadow(seam)
      hull.add(seam)
    }

    /* ============ HEAD (sensor turret) ============ */

    const head = new THREE.Group()
    head.name = 'Head'

    const neckRing = new THREE.Mesh(
      new THREE.TorusGeometry(d.headW * 0.55, Math.max(0.025, d.headW * 0.065), 8, 20),
      jointMat,
    )
    neckRing.rotation.x = Math.PI / 2
    shadow(neckRing)
    head.add(neckRing)

    const headBlock = new THREE.Mesh(
      new THREE.BoxGeometry(d.headW, d.headH, d.headD),
      armorMat,
    )
    headBlock.position.y = d.headH * 0.5 + 0.02
    shadow(headBlock)
    head.add(headBlock)

    const headCap = new THREE.Mesh(
      new THREE.BoxGeometry(d.headW * 0.75, d.headH * 0.25, d.headD * 0.80),
      hullMat,
    )
    headCap.position.y = d.headH + 0.02
    shadow(headCap)
    head.add(headCap)

    // Vex cyclops eye — single glowing orb
    const eyeR = d.headW * 0.22
    const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 12, 8), eyeMat)
    eye.position.set(0, d.headH * 0.48, -d.headD * 0.48)
    shadow(eye)
    head.add(eye)

    // Eye socket ring
    const socketRing = new THREE.Mesh(
      new THREE.TorusGeometry(eyeR * 1.25, eyeR * 0.18, 8, 16),
      jointMat,
    )
    socketRing.position.copy(eye.position)
    socketRing.position.z -= 0.01
    shadow(socketRing)
    head.add(socketRing)

    // Radiolaria vein lines on head
    for (const sx of [-1, 1]) {
      const vein = new THREE.Mesh(
        new THREE.BoxGeometry(d.headW * 0.04, d.headH * 0.6, 0.015),
        radiolariaMat,
      )
      vein.position.set(sx * d.headW * 0.32, d.headH * 0.45, -d.headD * 0.505)
      shadow(vein)
      head.add(vein)
    }

    // Side sensor nubs
    const sensorR = Math.max(0.022, d.headW * 0.06)
    const sensorGeo = new THREE.SphereGeometry(sensorR, 6, 4)
    for (const sx of [-1, 1]) {
      const sensor = new THREE.Mesh(sensorGeo, radiolariaMat)
      sensor.position.set(sx * d.headW * 0.48, d.headH * 0.32, -d.headD * 0.25)
      shadow(sensor)
      head.add(sensor)
    }

    head.position.set(
      0,
      d.hipY + d.bodyR * d.bodySquashY + 0.04,
      -d.bodyR * d.bodyStretchZ * 0.10,
    )
    hull.add(head)

    /* ============ SIDE WEAPONS ============ */

    const buildPylon = (side: number): THREE.Group => {
      const wpn = new THREE.Group()
      wpn.name = side < 0 ? 'WeaponL' : 'WeaponR'

      const pylonR = d.upperR * 0.48
      const pylon = new THREE.Mesh(
        new THREE.CylinderGeometry(pylonR, pylonR * 0.90, d.pylonLen, 10),
        jointMat,
      )
      pylon.rotation.z = side * Math.PI / 2
      pylon.position.x = side * d.pylonLen * 0.5
      shadow(pylon)
      wpn.add(pylon)

      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(d.barrelR, d.barrelR * 0.88, d.barrelLen, 12),
        jointMat,
      )
      barrel.rotation.x = Math.PI / 2
      barrel.position.set(side * d.pylonLen, 0, -d.barrelLen * 0.48)
      shadow(barrel)
      wpn.add(barrel)

      const muzzleLen = d.barrelLen * 0.09
      const muzzle = new THREE.Mesh(
        new THREE.CylinderGeometry(d.barrelR * 1.35, d.barrelR * 1.15, muzzleLen, 10),
        jointMat,
      )
      muzzle.rotation.x = Math.PI / 2
      muzzle.position.set(side * d.pylonLen, 0, -d.barrelLen - muzzleLen * 0.42)
      shadow(muzzle)
      wpn.add(muzzle)

      wpn.position.set(
        side * d.bodyR * 0.78,
        d.hipY + d.bodyR * d.bodySquashY * 0.06,
        -d.bodyR * d.bodyStretchZ * 0.28,
      )
      return wpn
    }

    const weaponL = buildPylon(-1)
    const weaponR = buildPylon(1)
    hull.add(weaponL)
    hull.add(weaponR)

    this.object3d.add(hull)

    /* ============ LEGS (4x nested group chain) ============ */

    const legConfigs: Array<{ sx: 1 | -1; sz: 1 | -1; label: string; isFront: boolean }> = [
      { sx: -1, sz: -1, label: 'FL', isFront: true },
      { sx: 1, sz: -1, label: 'FR', isFront: true },
      { sx: -1, sz: 1, label: 'RL', isFront: false },
      { sx: 1, sz: 1, label: 'RR', isFront: false },
    ]

    const legs: LegLimb[] = []

    for (const cfg of legConfigs) {
      const { sx, sz, isFront } = cfg

      const hipX = sx * d.hipXSpread
      const hipZ = sz * d.hipZSpread
      const hipAttachY = d.hipY - d.bodyR * d.bodySquashY * 0.18

      const legGroup = new THREE.Group()
      legGroup.name = `Leg_${cfg.label}`
      legGroup.position.set(hipX, hipAttachY, hipZ)

      const hipBall = new THREE.Mesh(
        new THREE.SphereGeometry(d.upperR * 1.45, 10, 8),
        jointMat,
      )
      shadow(hipBall)
      legGroup.add(hipBall)

      // Radiolaria glow ring at hip
      const hipGlow = new THREE.Mesh(
        new THREE.TorusGeometry(d.upperR * 1.2, d.upperR * 0.12, 6, 16),
        radiolariaMat,
      )
      hipGlow.rotation.x = Math.PI / 2
      shadow(hipGlow)
      legGroup.add(hipGlow)

      const restSplayZ = sx * 0.48
      const restLeanX = isFront ? -0.18 : 0.18
      const restKneeBend = 0.88
      const restFootAngle = -(restLeanX + restKneeBend)

      /* -- upper leg -- */

      const upperGroup = new THREE.Group()
      upperGroup.name = `Upper_${cfg.label}`
      upperGroup.rotation.z = restSplayZ
      upperGroup.rotation.x = restLeanX

      const upperMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(d.upperR, d.upperR * 0.82, d.upperLen, 12),
        jointMat,
      )
      upperMesh.position.y = -d.upperLen * 0.5
      shadow(upperMesh)
      upperGroup.add(upperMesh)

      const upperPanel = new THREE.Mesh(
        new THREE.BoxGeometry(d.upperR * 2.4, d.upperLen * 0.52, d.upperR * 0.55),
        panelMat,
      )
      upperPanel.position.set(sx * d.upperR * 0.15, -d.upperLen * 0.30, 0)
      shadow(upperPanel)
      upperGroup.add(upperPanel)

      /* -- knee -- */

      const kneeR = (d.upperR + d.lowerR) * 0.56
      const kneeBall = new THREE.Mesh(
        new THREE.SphereGeometry(kneeR, 10, 8),
        jointMat,
      )
      kneeBall.position.y = -d.upperLen
      shadow(kneeBall)
      upperGroup.add(kneeBall)

      // Radiolaria glow ring at knee
      const kneeGlow = new THREE.Mesh(
        new THREE.TorusGeometry(kneeR * 0.9, kneeR * 0.15, 6, 16),
        radiolariaMat,
      )
      kneeGlow.position.y = -d.upperLen
      kneeGlow.rotation.x = Math.PI / 2
      shadow(kneeGlow)
      upperGroup.add(kneeGlow)

      const kneeShroud = new THREE.Mesh(
        new THREE.BoxGeometry(d.upperR * 2.3, d.upperR * 1.7, d.upperR * 2.1),
        panelMat,
      )
      kneeShroud.position.y = -d.upperLen + d.upperR * 0.08
      shadow(kneeShroud)
      upperGroup.add(kneeShroud)

      /* -- lower leg -- */

      const lowerGroup = new THREE.Group()
      lowerGroup.name = `Lower_${cfg.label}`
      lowerGroup.position.y = -d.upperLen
      lowerGroup.rotation.x = restKneeBend

      const lowerMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(d.lowerR, d.lowerR * 0.78, d.lowerLen, 12),
        jointMat,
      )
      lowerMesh.position.y = -d.lowerLen * 0.5
      shadow(lowerMesh)
      lowerGroup.add(lowerMesh)

      const lowerPanel = new THREE.Mesh(
        new THREE.BoxGeometry(d.lowerR * 2.2, d.lowerLen * 0.42, d.lowerR * 0.45),
        panelMat,
      )
      lowerPanel.position.set(0, -d.lowerLen * 0.38, sx * -d.lowerR * 0.2)
      shadow(lowerPanel)
      lowerGroup.add(lowerPanel)

      /* -- ankle -- */

      const ankleBall = new THREE.Mesh(
        new THREE.SphereGeometry(d.lowerR * 0.85, 10, 8),
        jointMat,
      )
      ankleBall.position.y = -d.lowerLen
      shadow(ankleBall)
      lowerGroup.add(ankleBall)

      // Radiolaria glow at ankle
      const ankleGlow = new THREE.Mesh(
        new THREE.TorusGeometry(d.lowerR * 0.7, d.lowerR * 0.12, 6, 12),
        radiolariaMat,
      )
      ankleGlow.position.y = -d.lowerLen
      ankleGlow.rotation.x = Math.PI / 2
      shadow(ankleGlow)
      lowerGroup.add(ankleGlow)

      /* -- foot + toes -- */

      const footGroup = new THREE.Group()
      footGroup.name = `Foot_${cfg.label}`
      footGroup.position.y = -d.lowerLen
      footGroup.rotation.x = restFootAngle

      const heel = new THREE.Mesh(
        new THREE.BoxGeometry(d.footW, d.footH, d.footD * 0.55),
        hullMat,
      )
      heel.position.y = -d.footH * 0.5
      shadow(heel)
      footGroup.add(heel)

      const toeCfg = [
        { tx: 0, angle: 0 },
        { tx: -d.footW * 0.36, angle: -0.25 },
        { tx: d.footW * 0.36, angle: 0.25 },
      ]
      for (const tc of toeCfg) {
        const toe = new THREE.Mesh(
          new THREE.BoxGeometry(d.toeW, d.footH * 0.72, d.toeLen),
          panelMat,
        )
        toe.position.set(tc.tx, -d.footH * 0.42, -d.toeLen * 0.44 - d.footD * 0.18)
        toe.rotation.y = tc.angle
        shadow(toe)
        footGroup.add(toe)
      }

      lowerGroup.add(footGroup)
      upperGroup.add(lowerGroup)
      legGroup.add(upperGroup)
      this.object3d.add(legGroup)

      legs.push({
        upper: upperGroup,
        lower: lowerGroup,
        foot: footGroup,
        restUpperX: restLeanX,
        restUpperZ: restSplayZ,
        restLowerX: restKneeBend,
        restFootX: restFootAngle,
        isFront,
      })
    }

    this.limbs = { hull, head, weaponL, weaponR, legs, restHullY: 0 }

    const outlineThick = tier === 'scout' ? 0.04 : 0.06
    addOutlineShell(this.object3d, { thickness: outlineThick, color: 0x06060c, alpha: 0.65 })
  }

  update(dt: number) {
    // Even dormant walkers have idle animation stomp detection
    // The idle bob creates subtle ground contact events
    this.stompPhase += dt * 0.45 // matches idle breathing frequency
    const stompSin = Math.sin(this.stompPhase * Math.PI * 2)

    // Detect downward zero-crossing (foot hitting ground)
    if (this.prevStompSin > 0 && stompSin <= 0) {
      const intensity = this.tier === 'assault' ? 0.4 : 0.25 // idle stomps are subtle
      for (const cb of this.stompListeners) {
        cb({ position: this.object3d.position, intensity })
      }
    }
    this.prevStompSin = stompSin
  }
}

/* ── Procedural animation — heavy, mechanical, weighty ────────── */

const _walkerStride = { phase: 0 }

export function animateWalker(
  limbs: WalkerLimbs,
  dt: number,
  speed: number,
  phase: number,
) {
  const walkBlend = THREE.MathUtils.smoothstep(speed, 0.3, 2.0)
  const idleBlend = 1 - walkBlend

  _walkerStride.phase = (_walkerStride.phase + dt) % 600
  const t = _walkerStride.phase
  const p = phase * Math.PI * 2

  /* ---- idle: heavy machine at rest, hydraulic hum ---- */
  // Slow, heavy breathing — these are massive machines
  const idleBob = Math.sin(t * 0.45) * 0.025 * idleBlend
  const idleRock = Math.sin(t * 0.3) * 0.006 * idleBlend
  const idleHeadScan = Math.sin(t * 0.22) * 0.035 * idleBlend // slow head scan
  const idleHeadNod = Math.sin(t * 0.55) * 0.012 * idleBlend

  // Weapons drift slowly, as if tracking
  limbs.weaponL.rotation.x = Math.sin(t * 0.25) * 0.018 * idleBlend
  limbs.weaponR.rotation.x = Math.sin(t * 0.25 + 0.8) * 0.018 * idleBlend
  // Slight weapon droop under gravity
  limbs.weaponL.rotation.z = 0.015 * idleBlend
  limbs.weaponR.rotation.z = -0.015 * idleBlend

  /* ---- walk / trot: heavy stomping gait ---- */
  // More exaggerated leg swing — these legs carry real weight
  const legSwing = 0.24 * walkBlend
  const kneeExtra = 0.35 * walkBlend
  // Heavy footfall: sharp down, slow lift (asymmetric bob)
  const rawBob = Math.sin(p * 2)
  const footfallBob = (rawBob > 0
    ? rawBob * 0.015  // slow lift phase
    : rawBob * rawBob * -0.045  // sharp impact phase — squared for punch
  ) * walkBlend
  const bodyRoll = 0.024 * walkBlend
  const bodyPitch = 0.012 * walkBlend
  const headCounter = 0.018 * walkBlend

  // Weapon recoil/sway during walk — they have mass
  const weaponWalkSway = Math.sin(p) * 0.022 * walkBlend
  limbs.weaponL.rotation.x += weaponWalkSway
  limbs.weaponR.rotation.x += -weaponWalkSway * 0.7
  limbs.weaponL.rotation.z += Math.sin(p * 2) * 0.008 * walkBlend
  limbs.weaponR.rotation.z -= Math.sin(p * 2) * 0.008 * walkBlend

  for (let i = 0; i < limbs.legs.length; i++) {
    const leg = limbs.legs[i]
    // Diagonal gait: FL+RR together, FR+RL together (like a real quadruped)
    const pairPhase = (i === 0 || i === 3) ? p : p + Math.PI
    const fwdSign = leg.isFront ? 1 : -1

    const idleMicro = Math.sin(t * 0.4 + i * 1.8) * 0.012 * idleBlend
    // Idle weight shift — legs subtly adjust under body mass
    const idleWeightShift = Math.sin(t * 0.18 + i * Math.PI * 0.5) * 0.008 * idleBlend

    // Leg swing with asymmetric timing — fast forward, slow back (power stroke)
    const swingRaw = Math.sin(pairPhase)
    const powerStroke = swingRaw > 0
      ? swingRaw * 0.7  // forward: slower
      : swingRaw * 1.3  // back: faster push
    leg.upper.rotation.x = leg.restUpperX
      + powerStroke * legSwing * fwdSign
      + idleMicro + idleWeightShift
    leg.upper.rotation.z = leg.restUpperZ
      + Math.cos(pairPhase) * 0.035 * walkBlend

    // Knee: high lift, sharp plant — like a horse's gait
    const liftRaw = Math.max(0, Math.sin(pairPhase))
    const lift = liftRaw * liftRaw // squared for sharper lift-plant curve
    leg.lower.rotation.x = leg.restLowerX
      + lift * kneeExtra
      - idleMicro * 0.35

    // Foot: compensate to stay roughly flat, with toe-plant on landing
    const toePlant = Math.max(0, -Math.sin(pairPhase)) * 0.08 * walkBlend
    leg.foot.rotation.x = leg.restFootX
      - powerStroke * legSwing * fwdSign * 0.5
      - lift * kneeExtra * 0.35
      + toePlant
  }

  /* ---- hull dynamics: heavy mass transfer ---- */
  limbs.hull.position.y = limbs.restHullY
    + footfallBob
    + idleBob
  // Roll into each step (weight transfer side to side)
  limbs.hull.rotation.z = Math.sin(p) * bodyRoll + idleRock
  // Pitch: nose dips slightly on each footfall
  limbs.hull.rotation.x = -Math.abs(Math.sin(p * 0.5)) * bodyPitch + Math.sin(t * 0.3) * 0.004 * idleBlend

  /* ---- head: counter-stabilization like a bird ---- */
  // Head counters hull motion to stay level — looks intelligent
  limbs.head.rotation.x = -Math.sin(p) * headCounter + idleHeadNod
  limbs.head.rotation.y = idleHeadScan // slow scanning when idle
  limbs.head.rotation.z = -Math.sin(p) * bodyRoll * 0.4
}
