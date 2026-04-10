import * as THREE from 'three'
export type CameraRigParams = {
  fov: number
  yaw: number
  pitch: number
}

/**
 * First-person camera rig with Destiny-inspired feel.
 *
 * Camera sits at the player's eye height. Yaw drives player facing.
 * Pitch is camera-only. Bob, landing dip, FOV shifts, and slide roll
 * are layered on top for movement feel.
 */
export class CameraRig {
  private readonly camera: THREE.PerspectiveCamera

  private yaw: number
  private pitch: number

  // Eye height (springs toward target)
  private eyeHeightTarget = 1.65
  private eyeHeightCurrent = 1.65
  private eyeHeightVel = 0

  // Camera bob
  private bobPhase = 0
  private bobIntensity = 0
  private bobFrequency = 3.5
  private time = 0

  // Landing dip (critically damped spring)
  private landingDip = 0
  private landingVel = 0

  // Sprint FOV
  private readonly fovBase: number
  private fovTarget: number
  private fovCurrent: number

  // Slide roll
  private rollTarget = 0
  private rollCurrent = 0

  // Footstep shake (kept subtle for FP)
  private shakeT = 0
  private shakeAmp = 0

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
    // Full vertical range: see feet to sky
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.4, 1.4)
  }

  /** Called each frame with player movement info. */
  setMovementState(speed: number, maxSpeed: number, sprinting: boolean, sliding: boolean) {
    // Bob intensity tracks speed ratio
    const targetIntensity = this.isGrounded() ? Math.min(1, speed / Math.max(0.1, maxSpeed)) : 0
    this.bobIntensity += (targetIntensity - this.bobIntensity) * (1 - Math.exp(-8 * 0.016))

    // Bob frequency: faster when sprinting
    this.bobFrequency = sprinting ? 4.2 : 3.5

    // FOV: widen slightly when sprinting
    this.fovTarget = sprinting ? this.fovBase + 4 : this.fovBase

    // Slide roll — dramatic tilt
    this.rollTarget = sliding ? 0.08 : 0
  }

  /** Set the eye height target (changes per movement state). */
  setEyeHeight(h: number) {
    this.eyeHeightTarget = h
  }

  /** Short camera impulse on footstep (subtle in FP). */
  impulseFootstep(intensity: number) {
    this.shakeT = 0
    this.shakeAmp = Math.max(this.shakeAmp, intensity * 0.3) // reduced for FP
  }

  /** Downward camera dip on landing. */
  impulseLanding(intensity: number) {
    this.landingDip = -intensity * 0.2
    this.landingVel = 0
  }

  private isGrounded(): boolean {
    // Infer from landing dip settling
    return Math.abs(this.landingDip) < 0.3
  }

  update(dt: number, playerPos: THREE.Vector3) {
    this.time += dt

    // --- Eye height spring (critically damped) ---
    const heightOmega = 10
    const heightAccel = -heightOmega * heightOmega * (this.eyeHeightCurrent - this.eyeHeightTarget)
      - 2 * heightOmega * this.eyeHeightVel
    this.eyeHeightVel += heightAccel * dt
    this.eyeHeightCurrent += this.eyeHeightVel * dt

    // --- Landing dip spring ---
    const landOmega = 12
    const landAccel = -landOmega * landOmega * this.landingDip - 2 * landOmega * this.landingVel
    this.landingVel += landAccel * dt
    this.landingDip += this.landingVel * dt
    if (Math.abs(this.landingDip) < 0.001 && Math.abs(this.landingVel) < 0.01) {
      this.landingDip = 0
      this.landingVel = 0
    }

    // --- Camera bob ---
    this.bobPhase += dt * this.bobFrequency * Math.max(0.01, this.bobIntensity)
    const bobAmp = this.bobIntensity
    const vertBob = Math.sin(this.bobPhase * Math.PI * 2) * 0.05 * bobAmp
    const horizBob = Math.sin(this.bobPhase * Math.PI) * 0.025 * bobAmp
    // Idle breathing when still
    const breathe = Math.sin(this.time * 0.6 * Math.PI * 2) * 0.008 * (1 - bobAmp)

    // --- FOV ---
    this.fovCurrent += (this.fovTarget - this.fovCurrent) * (1 - Math.exp(-4 * dt))
    if (Math.abs(this.fovCurrent - this.camera.fov) > 0.05) {
      this.camera.fov = this.fovCurrent
      this.camera.updateProjectionMatrix()
    }

    // --- Roll ---
    this.rollCurrent += (this.rollTarget - this.rollCurrent) * (1 - Math.exp(-6 * dt))

    // --- Footstep shake (damped) ---
    this.shakeT += dt
    const shakeDecay = Math.exp(-this.shakeT * 12)
    const shake = this.shakeAmp * shakeDecay
    if (shake < 0.0005) this.shakeAmp = 0
    const shakeY = Math.abs(Math.sin(this.shakeT * 55)) * 0.04 * shake

    // --- Compose final camera position ---
    const eyeY = playerPos.y + this.eyeHeightCurrent + vertBob + breathe + this.landingDip + shakeY

    // Camera position at player XZ + horizontal bob
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw))
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x)

    this.camera.position.set(
      playerPos.x + right.x * horizBob,
      eyeY,
      playerPos.z + right.z * horizBob
    )

    // Look direction from yaw + pitch
    const lookDir = new THREE.Vector3()
    lookDir.x = Math.sin(this.yaw) * Math.cos(this.pitch)
    lookDir.y = Math.sin(this.pitch)
    lookDir.z = Math.cos(this.yaw) * Math.cos(this.pitch)

    const lookTarget = this.camera.position.clone().add(lookDir)
    this.camera.lookAt(lookTarget)

    // Apply roll
    if (Math.abs(this.rollCurrent) > 0.001) {
      this.camera.rotateZ(this.rollCurrent)
    }
  }
}
