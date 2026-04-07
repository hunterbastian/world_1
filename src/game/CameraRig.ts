import * as THREE from 'three'

export type CameraRigParams = {
  distance: number
  height: number
  yaw: number
  pitch: number
}

export class CameraRig {
  private readonly camera: THREE.PerspectiveCamera
  private readonly target = new THREE.Vector3()

  private yaw: number
  private pitch: number

  private distance: number
  private height: number
  private desiredDistance: number
  private desiredHeight: number

  // Cinematic lag (spring-ish smoothing).
  private pos = new THREE.Vector3()
  private vel = new THREE.Vector3()

  // Footstep shake
  private shakeT = 0
  private shakeAmp = 0

  constructor(camera: THREE.PerspectiveCamera, params: CameraRigParams) {
    this.camera = camera
    this.distance = params.distance
    this.height = params.height
    this.desiredDistance = params.distance
    this.desiredHeight = params.height
    this.yaw = params.yaw
    this.pitch = params.pitch

    this.pos.copy(camera.position)
  }

  getYaw() {
    return this.yaw
  }

  setDesired(distance: number, height: number) {
    this.desiredDistance = distance
    this.desiredHeight = height
  }

  addOrbitDelta(dx: number, dy: number) {
    const sens = 0.0022
    this.yaw -= dx * sens
    this.pitch -= dy * sens
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.55, 0.85)
  }

  impulseFootstep(intensity: number) {
    // short impulse; intensity ~ [0..1]
    this.shakeT = 0
    this.shakeAmp = Math.max(this.shakeAmp, intensity)
  }

  update(dt: number, targetPos: THREE.Vector3) {
    // Smooth camera framing params for cinematic moves (like spawn zoom).
    const k = 1 - Math.exp(-dt * 3.5)
    this.distance = THREE.MathUtils.lerp(this.distance, this.desiredDistance, k)
    this.height = THREE.MathUtils.lerp(this.height, this.desiredHeight, k)

    this.target.copy(targetPos)
    this.target.y += this.height

    const offset = new THREE.Vector3(0, 0, this.distance)
    const rot = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')
    offset.applyEuler(rot)

    const desired = this.target.clone().add(offset)

    // Critically damped spring toward desired.
    const omega = 10.0 // higher = snappier, lower = more lag
    const x = this.pos.clone().sub(desired)
    const accel = x.multiplyScalar(-omega * omega).add(this.vel.clone().multiplyScalar(-2 * omega))
    this.vel.addScaledVector(accel, dt)
    this.pos.addScaledVector(this.vel, dt)

    // Shake (damped)
    this.shakeT += dt
    const shakeDecay = Math.exp(-this.shakeT * 10)
    const shake = this.shakeAmp * shakeDecay
    if (shake < 0.001) this.shakeAmp = 0

    const shakeVec = new THREE.Vector3(
      (Math.sin(this.shakeT * 50) * 0.15 + Math.sin(this.shakeT * 27) * 0.08) * shake,
      Math.abs(Math.sin(this.shakeT * 60)) * 0.12 * shake,
      0
    )

    this.camera.position.copy(this.pos).add(shakeVec)
    this.camera.lookAt(this.target)
  }
}

