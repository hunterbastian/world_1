import * as THREE from 'three'
export type CameraRigParams = {
  fov: number
  yaw: number
  pitch: number
}

/**
 * First-person camera rig — Destiny / Helsby boxing-style feel.
 *
 * Design pillars (from Bungie GDC 2015):
 *  - Head leads every action, then over-corrects to settle (boxing).
 *  - Aim point sits below screen center → more peripheral vision above.
 *  - Bob is minimal and heavy (slow sway, not bouncy). ≤10% nausea target.
 *  - No mouse acceleration — raw 1:1 input. Smoothness comes from
 *    animation weight, not filtering.
 *  - Every state transition has anticipation → lead → settle.
 */
export class CameraRig {
  private readonly camera: THREE.PerspectiveCamera

  private yaw: number
  private pitch: number

  // Lowered aim point — Destiny places crosshair below center so the
  // world opens up above and to the sides (simulates peripheral vision).
  // ~3.5° down ≈ 0.06 rad.
  private readonly aimPitchOffset = -0.06

  // Eye height (critically damped spring — softer omega for weight)
  private eyeHeightTarget = 1.65
  private eyeHeightCurrent = 1.65
  private eyeHeightVel = 0

  // Weighted sway bob — lower freq/amp than a typical FPS bounce.
  // Figure-8-ish: vertical is 2× frequency of horizontal for a
  // natural head-transfer pattern.
  private bobPhase = 0
  private bobIntensity = 0
  private bobIntensitySmooth = 0
  private bobFrequency = 2.4
  private time = 0

  // Landing dip (under-damped spring for overshoot → settle)
  private landingDip = 0
  private landingVel = 0

  // Sprint FOV
  private readonly fovBase: number
  private fovTarget: number
  private fovCurrent: number

  // Momentum lean — camera pitches/rolls into acceleration
  private leanPitch = 0
  private leanPitchVel = 0
  private leanRoll = 0
  private leanRollVel = 0
  private prevSpeed = 0
  // (strafe sign comes in per-frame via setMovementState)

  // Slide roll
  private rollTarget = 0
  private rollCurrent = 0

  // Footstep shake (kept very subtle in FP)
  private shakeT = 0
  private shakeAmp = 0

  // Idle breathing
  private breathePhase = 0

  constructor(camera: THREE.PerspectiveCamera, params: CameraRigParams) {
    this.camera = camera
    this.yaw = params.yaw
    this.pitch = params.pitch
    this.fovBase = params.fov
    this.fovTarget = params.fov
    this.fovCurrent = params.fov
  }

  getYaw() {
    return this.yaw
  }

  addOrbitDelta(dx: number, dy: number) {
    const sens = 0.0022
    this.yaw -= dx * sens
    this.pitch -= dy * sens
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.4, 1.4)
  }

  setMovementState(speed: number, maxSpeed: number, sprinting: boolean, sliding: boolean, strafeSign = 0) {
    const targetIntensity = this.isGrounded() ? Math.min(1, speed / Math.max(0.1, maxSpeed)) : 0
    this.bobIntensity = targetIntensity

    // Slower, heavier bob — walk ~2.4 Hz, sprint ~2.8 Hz
    this.bobFrequency = sprinting ? 2.8 : 2.4

    this.fovTarget = sprinting ? this.fovBase + 4 : this.fovBase

    this.rollTarget = sliding ? 0.08 : 0

    // Momentum lean tracking
    const accelSign = speed - this.prevSpeed
    this.prevSpeed = speed

    // Forward lean: accelerating → lean into it, decelerating → pull back
    const leanPitchTarget = THREE.MathUtils.clamp(accelSign * 0.008, -0.015, 0.015)
    const leanOmega = 6
    const leanPitchAccel = -leanOmega * leanOmega * (this.leanPitch - leanPitchTarget)
      - 2 * leanOmega * this.leanPitchVel
    this.leanPitchVel += leanPitchAccel * 0.016
    this.leanPitch += this.leanPitchVel * 0.016

    // Strafe lean: tilt into the turn direction
    const leanRollTarget = -strafeSign * 0.012 * Math.min(1, speed / Math.max(0.1, maxSpeed))
    const rollOmega = 5
    const leanRollAccel = -rollOmega * rollOmega * (this.leanRoll - leanRollTarget)
      - 2 * rollOmega * this.leanRollVel
    this.leanRollVel += leanRollAccel * 0.016
    this.leanRoll += this.leanRollVel * 0.016
  }

  setEyeHeight(h: number) {
    this.eyeHeightTarget = h
  }

  impulseFootstep(intensity: number) {
    this.shakeT = 0
    this.shakeAmp = Math.max(this.shakeAmp, intensity * 0.15)
  }

  impulseLanding(intensity: number) {
    this.landingDip = -intensity * 0.25
    this.landingVel = 0
  }

  private isGrounded(): boolean {
    return Math.abs(this.landingDip) < 0.3
  }

  update(dt: number, playerPos: THREE.Vector3) {
    this.time += dt

    // --- Eye height spring (critically damped, softer ω for weight) ---
    const heightOmega = 7
    const heightAccel = -heightOmega * heightOmega * (this.eyeHeightCurrent - this.eyeHeightTarget)
      - 2 * heightOmega * this.eyeHeightVel
    this.eyeHeightVel += heightAccel * dt
    this.eyeHeightCurrent += this.eyeHeightVel * dt

    // --- Landing dip (under-damped for overshoot → settle) ---
    const landOmega = 7
    const landDamping = 1.6
    const landAccel = -landOmega * landOmega * this.landingDip - landDamping * landOmega * this.landingVel
    this.landingVel += landAccel * dt
    this.landingDip += this.landingVel * dt
    if (Math.abs(this.landingDip) < 0.0005 && Math.abs(this.landingVel) < 0.005) {
      this.landingDip = 0
      this.landingVel = 0
    }

    // --- Weighted sway bob ---
    // Smooth the bob intensity — faster response for snappy feel, still no instant snap
    this.bobIntensitySmooth += (this.bobIntensity - this.bobIntensitySmooth) * (1 - Math.exp(-6 * dt))

    this.bobPhase += dt * this.bobFrequency * Math.max(0.01, this.bobIntensitySmooth)
    const amp = this.bobIntensitySmooth

    // Vertical: gentle, reduced amplitude. Head nods, doesn't bounce.
    const vertBob = Math.sin(this.bobPhase * Math.PI * 2) * 0.022 * amp
    // Horizontal: half-frequency figure-8 sway. Head transfers weight side to side.
    const horizBob = Math.sin(this.bobPhase * Math.PI) * 0.010 * amp

    // Idle breathing — slow diaphragm cycle, more noticeable when still
    this.breathePhase += dt * 0.55
    const breatheAmt = 1 - amp
    const breatheY = Math.sin(this.breathePhase * Math.PI * 2) * 0.006 * breatheAmt
    const breathePitch = Math.sin(this.breathePhase * Math.PI * 2 + 0.4) * 0.002 * breatheAmt

    // --- FOV (spring-like for smooth sprint transitions) ---
    this.fovCurrent += (this.fovTarget - this.fovCurrent) * (1 - Math.exp(-3 * dt))
    if (Math.abs(this.fovCurrent - this.camera.fov) > 0.02) {
      this.camera.fov = this.fovCurrent
      this.camera.updateProjectionMatrix()
    }

    // --- Roll (slide tilt + strafe lean) ---
    this.rollCurrent += (this.rollTarget - this.rollCurrent) * (1 - Math.exp(-5 * dt))

    // --- Footstep shake (very subtle — just enough to feel steps) ---
    this.shakeT += dt
    const shakeDecay = Math.exp(-this.shakeT * 16)
    const shake = this.shakeAmp * shakeDecay
    if (shake < 0.0003) this.shakeAmp = 0
    const shakeY = Math.abs(Math.sin(this.shakeT * 40)) * 0.02 * shake

    // --- Compose final camera position ---
    const eyeY = playerPos.y + this.eyeHeightCurrent + vertBob + breatheY + this.landingDip + shakeY

    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw))
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x)

    this.camera.position.set(
      playerPos.x + right.x * horizBob,
      eyeY,
      playerPos.z + right.z * horizBob
    )

    // --- Look direction: yaw + pitch + lowered aim point + momentum lean ---
    const effectivePitch = this.pitch + this.aimPitchOffset + this.leanPitch + breathePitch

    const lookDir = new THREE.Vector3()
    lookDir.x = Math.sin(this.yaw) * Math.cos(effectivePitch)
    lookDir.y = Math.sin(effectivePitch)
    lookDir.z = Math.cos(this.yaw) * Math.cos(effectivePitch)

    const lookTarget = this.camera.position.clone().add(lookDir)
    this.camera.lookAt(lookTarget)

    // Apply roll layers: slide tilt + strafe lean
    const totalRoll = this.rollCurrent + this.leanRoll
    if (Math.abs(totalRoll) > 0.0005) {
      this.camera.rotateZ(totalRoll)
    }
  }
}
