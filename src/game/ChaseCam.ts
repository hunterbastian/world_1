import * as THREE from 'three'

export type ChaseCamConfig = {
  distance: number
  heightOffset: number
  fov: number
}

/**
 * Third-person chase camera for piloting Walkers.
 *
 * Orbits freely around the target (Halo vehicle camera — orbit yaw is
 * independent of walker facing). Heavy cinematic lerp for weight.
 * Includes a smooth mount transition that pulls the camera from its
 * current FP position out to the chase position over ~1.5s.
 */
export class ChaseCam {
  private readonly camera: THREE.PerspectiveCamera
  private readonly distance: number
  private readonly heightOffset: number
  private readonly fov: number

  private orbitYaw = 0
  private orbitPitch = 0.15

  // Smooth follow position
  private readonly currentPos = new THREE.Vector3()
  private readonly currentLookAt = new THREE.Vector3()
  private initialized = false

  // Mount transition: lerps from FP position to chase position
  private transitionT = 1
  private readonly transitionFrom = new THREE.Vector3()
  private readonly transitionLookFrom = new THREE.Vector3()
  private readonly transitionDuration = 1.5

  // Stomp shake
  private shakeAmp = 0
  private shakeT = 0

  constructor(camera: THREE.PerspectiveCamera, config: ChaseCamConfig) {
    this.camera = camera
    this.distance = config.distance
    this.heightOffset = config.heightOffset
    this.fov = config.fov
  }

  enterTransition() {
    this.transitionFrom.copy(this.camera.position)
    const lookDir = new THREE.Vector3()
    this.camera.getWorldDirection(lookDir)
    this.transitionLookFrom.copy(this.camera.position).add(lookDir.multiplyScalar(5))
    this.transitionT = 0
    this.initialized = false
  }

  addOrbitDelta(dx: number, dy: number) {
    const sens = 0.0022
    this.orbitYaw -= dx * sens
    this.orbitPitch -= dy * sens
    this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch, -0.7, 0.5)
  }

  impulseShake(intensity: number) {
    this.shakeAmp = Math.max(this.shakeAmp, intensity * 0.15)
    this.shakeT = 0
  }

  update(dt: number, target: THREE.Object3D) {
    const targetPos = target.position.clone()
    targetPos.y += this.heightOffset * 0.5

    // Ideal camera position: behind target at orbit angles
    const idealPos = new THREE.Vector3()
    idealPos.x = targetPos.x + Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch) * this.distance
    idealPos.y = targetPos.y + this.heightOffset + Math.sin(this.orbitPitch) * this.distance * 0.5
    idealPos.z = targetPos.z + Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch) * this.distance

    if (!this.initialized) {
      this.currentPos.copy(idealPos)
      this.currentLookAt.copy(targetPos)
      this.initialized = true
    }

    // Heavy cinematic follow — low lerp factor for weight
    const followK = 1 - Math.exp(-2.5 * dt)
    this.currentPos.lerp(idealPos, followK)
    this.currentLookAt.lerp(targetPos, followK)

    // Mount transition: smooth pull-back from FP to chase
    this.transitionT = Math.min(1, this.transitionT + dt / this.transitionDuration)
    const easeT = this.transitionT < 1
      ? 1 - Math.pow(1 - this.transitionT, 3)
      : 1

    const camPos = new THREE.Vector3()
    const lookAtPos = new THREE.Vector3()

    if (easeT < 1) {
      camPos.lerpVectors(this.transitionFrom, this.currentPos, easeT)
      lookAtPos.lerpVectors(this.transitionLookFrom, this.currentLookAt, easeT)
    } else {
      camPos.copy(this.currentPos)
      lookAtPos.copy(this.currentLookAt)
    }

    // Stomp shake
    this.shakeT += dt
    const shakeDecay = Math.exp(-this.shakeT * 10)
    const shake = this.shakeAmp * shakeDecay
    if (shake < 0.0003) this.shakeAmp = 0
    camPos.y += Math.sin(this.shakeT * 35) * 0.08 * shake

    this.camera.position.copy(camPos)
    this.camera.lookAt(lookAtPos)

    // FOV transition
    if (Math.abs(this.camera.fov - this.fov) > 0.1) {
      this.camera.fov += (this.fov - this.camera.fov) * (1 - Math.exp(-3 * dt))
      this.camera.updateProjectionMatrix()
    }
  }
}
