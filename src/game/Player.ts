import * as THREE from 'three'
import type { InputState } from './Input'
import type { Terrain } from '../world/Terrain'

export type PlayerStepEvent = {
  intensity: number
}

export type PlayerLandingEvent = {
  intensity: number
}

export type MoveState = 'idle' | 'walking' | 'sprinting' | 'crouching' | 'sliding' | 'airborne'

export type PlayerOptions = {
  terrain: Terrain
  start: THREE.Vector3
}

export class Player {
  public readonly object3d: THREE.Object3D
  public readonly position = new THREE.Vector3()
  public readonly velocity = new THREE.Vector3()
  public readonly facing = new THREE.Vector3(0, 0, -1)

  public stamina = 1
  public speed = 0
  public moveState: MoveState = 'idle'

  private readonly terrain: Terrain
  private stepPhase = 0
  private readonly stepListeners = new Set<(e: PlayerStepEvent) => void>()
  private readonly landingListeners = new Set<(e: PlayerLandingEvent) => void>()

  // Movement constants (Destiny-tuned)
  private readonly walkSpeed = 5.5
  private readonly runSpeed = 7.0
  private readonly crouchSpeed = 2.8
  private readonly strafeMultiplier = 0.85
  private readonly accel = 12.0
  private readonly decel = 8.0
  private readonly airControl = 0.3

  // Jump physics
  private readonly jumpVelocity = 7.5
  private readonly gravity = 22.0
  private verticalVel = 0
  private grounded = true

  // Landing detection
  private prevY = 0
  private fallDistance = 0

  // Sprint transition
  private sprintBlend = 0

  // Stamina timing
  private sprintTime = 0
  private timeSinceSprint = Infinity

  // Slide
  private slideTimer = 0
  private slideCooldown = 0
  private slideDir = new THREE.Vector3()

  // Crouch
  private crouchActive = false

  // Step / stride
  private animSpeed = 0
  private readonly maxStepUp = 0.85
  private readonly maxClimbSlope = 0.78

  // Eye heights for camera
  public readonly standingEyeHeight = 1.65
  public readonly crouchingEyeHeight = 1.0
  public readonly slidingEyeHeight = 0.65

  constructor(opts: PlayerOptions) {
    this.terrain = opts.terrain
    this.object3d = new THREE.Group()
    this.object3d.name = 'Player'

    // No visible model in first-person
    this.position.copy(opts.start)
    this.object3d.position.copy(this.position)
    this.prevY = this.position.y
  }

  onStep(cb: (e: PlayerStepEvent) => void) {
    this.stepListeners.add(cb)
    return () => this.stepListeners.delete(cb)
  }

  onLanding(cb: (e: PlayerLandingEvent) => void) {
    this.landingListeners.add(cb)
    return () => this.landingListeners.delete(cb)
  }

  get eyeHeight(): number {
    if (this.moveState === 'sliding') return this.slidingEyeHeight
    if (this.moveState === 'crouching') return this.crouchingEyeHeight
    return this.standingEyeHeight
  }

  get sprinting(): boolean {
    return this.moveState === 'sprinting'
  }

  get sliding(): boolean {
    return this.moveState === 'sliding'
  }

  update(dt: number, input: InputState, cameraYaw: number) {
    this.slideCooldown = Math.max(0, this.slideCooldown - dt)

    // Facing driven by camera yaw in FP
    this.facing.set(Math.sin(cameraYaw), 0, Math.cos(cameraYaw))

    // Build movement direction from input
    const move = new THREE.Vector3(-input.right, 0, input.forward)
    if (move.lengthSq() > 1) move.normalize()
    const yawRot = new THREE.Euler(0, cameraYaw, 0)
    move.applyEuler(yawRot)
    const wantsMove = move.lengthSq() > 1e-4

    // Strafe penalty: reduce speed when moving sideways
    let strafeFactor = 1.0
    if (Math.abs(input.right) > 0 && Math.abs(input.forward) === 0) {
      strafeFactor = this.strafeMultiplier
    } else if (Math.abs(input.right) > 0 && Math.abs(input.forward) > 0) {
      strafeFactor = THREE.MathUtils.lerp(1.0, this.strafeMultiplier, 0.5)
    }

    // --- State machine ---
    const prevState = this.moveState

    if (!this.grounded) {
      // Airborne state
      this.moveState = 'airborne'
      this.updateAirborne(dt, move, wantsMove, strafeFactor)
    } else if (this.moveState === 'sliding') {
      this.updateSliding(dt, input)
    } else {
      // Grounded movement
      // Jump check
      if (input.jump && this.grounded) {
        this.verticalVel = this.jumpVelocity
        this.grounded = false
        this.moveState = 'airborne'
        this.updateAirborne(dt, move, wantsMove, strafeFactor)
      } else {
        // Slide check: crouch while sprinting
        if (input.crouch && this.moveState === 'sprinting' && this.speed > 4.5 && this.slideCooldown <= 0) {
          this.enterSlide()
        }
        // Crouch toggle
        else if (input.crouch) {
          this.crouchActive = !this.crouchActive
        }

        this.updateGrounded(dt, input, move, wantsMove, strafeFactor)
      }
    }

    // Vertical physics (gravity + ground snap)
    this.updateVertical(dt)

    // Update object3d
    this.object3d.position.copy(this.position)
    const yaw = Math.atan2(this.facing.x, this.facing.z)
    this.object3d.rotation.y = yaw

    // Speed for external systems
    this.speed = Math.hypot(this.velocity.x, this.velocity.z)

    // Step/stride tracking (for footstep audio)
    this.updateStride(dt, prevState)
  }

  private updateGrounded(dt: number, input: InputState, move: THREE.Vector3, wantsMove: boolean, strafeFactor: number) {
    const wantsSprint = input.sprint && wantsMove && this.stamina > 0.06 && !this.crouchActive
    const isCrouching = this.crouchActive

    // Smooth sprint blend
    const targetBlend = wantsSprint ? 1 : 0
    this.sprintBlend += (targetBlend - this.sprintBlend) * (1 - Math.exp(-3.3 * dt))

    const baseSpeed = isCrouching
      ? this.crouchSpeed
      : THREE.MathUtils.lerp(this.walkSpeed, this.runSpeed, this.sprintBlend)
    const maxSpeed = baseSpeed * strafeFactor

    // Stamina
    if (wantsSprint) {
      this.sprintTime += dt
      this.timeSinceSprint = 0
      if (this.sprintTime > 0.5) {
        this.stamina = Math.max(0, this.stamina - dt * 0.24)
      }
    } else {
      this.sprintTime = 0
      this.timeSinceSprint += dt
      if (this.timeSinceSprint > 0.8) {
        this.stamina = Math.min(1, this.stamina + dt * 0.18)
      }
    }

    // Apply acceleration
    const desiredVel = move.clone().multiplyScalar(maxSpeed)
    const currentXZ = new THREE.Vector2(this.velocity.x, this.velocity.z)
    const desiredXZ = new THREE.Vector2(desiredVel.x, desiredVel.z)
    const diff = desiredXZ.clone().sub(currentXZ)
    const diffLen = diff.length()

    const a = wantsMove ? this.accel : this.decel
    const maxDelta = a * dt
    if (diffLen > maxDelta) diff.multiplyScalar(maxDelta / diffLen)
    currentXZ.add(diff)

    this.velocity.x = currentXZ.x
    this.velocity.z = currentXZ.y

    // Terrain collision
    this.applyTerrainCollision(dt)

    // Determine state
    if (isCrouching) {
      this.moveState = wantsMove ? 'crouching' : 'crouching'
    } else if (this.sprintBlend > 0.5 && wantsMove) {
      this.moveState = 'sprinting'
    } else if (wantsMove) {
      this.moveState = 'walking'
    } else {
      this.moveState = 'idle'
      this.crouchActive = false // stand up when idle
    }
  }

  private updateAirborne(dt: number, move: THREE.Vector3, wantsMove: boolean, strafeFactor: number) {
    // Reduced air control
    if (wantsMove) {
      const airMaxSpeed = this.walkSpeed * strafeFactor
      const desiredVel = move.clone().multiplyScalar(airMaxSpeed)
      const currentXZ = new THREE.Vector2(this.velocity.x, this.velocity.z)
      const desiredXZ = new THREE.Vector2(desiredVel.x, desiredVel.z)
      const diff = desiredXZ.clone().sub(currentXZ)
      const diffLen = diff.length()
      const maxDelta = this.accel * this.airControl * dt
      if (diffLen > maxDelta) diff.multiplyScalar(maxDelta / diffLen)
      currentXZ.add(diff)
      this.velocity.x = currentXZ.x
      this.velocity.z = currentXZ.y
    }

    // Horizontal terrain collision (even in air, for walls/slopes)
    this.applyTerrainCollision(dt)
    this.crouchActive = false
  }

  private enterSlide() {
    this.moveState = 'sliding'
    this.slideTimer = 0
    this.slideCooldown = 0.5
    this.slideDir.set(this.velocity.x, 0, this.velocity.z).normalize()
    // Speed boost on slide entry — feels punchy
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z)
    const boostedSpeed = Math.max(hSpeed, this.runSpeed) * 1.15
    this.velocity.x = this.slideDir.x * boostedSpeed
    this.velocity.z = this.slideDir.z * boostedSpeed
    this.crouchActive = false
  }

  private updateSliding(dt: number, input: InputState) {
    this.slideTimer += dt

    // Slower deceleration for longer, more dramatic slide
    const slideDecel = 5.5
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z)
    const newSpeed = Math.max(0, hSpeed - slideDecel * dt)

    this.velocity.x = this.slideDir.x * newSpeed
    this.velocity.z = this.slideDir.z * newSpeed

    this.applyTerrainCollision(dt)

    // Exit slide conditions — longer max time
    const minSlideSpeed = 1.5
    const maxSlideTime = 1.6
    if (newSpeed < minSlideSpeed || this.slideTimer > maxSlideTime) {
      if (input.sprint) {
        this.moveState = 'walking'
        this.sprintBlend = 0.3
      } else {
        this.crouchActive = true
        this.moveState = 'crouching'
      }
    }

    // Jump out of slide (slide-jump combo)
    if (input.jump) {
      this.verticalVel = this.jumpVelocity * 1.05 // slight boost from slide momentum
      this.grounded = false
      this.moveState = 'airborne'
    }
  }

  private updateVertical(dt: number) {
    if (!this.grounded) {
      this.verticalVel -= this.gravity * dt
      this.position.y += this.verticalVel * dt
    }

    const groundY = this.terrain.heightAtXZ(this.position.x, this.position.z)

    if (this.position.y <= groundY) {
      // Landing
      const wasAirborne = !this.grounded
      this.position.y = groundY
      this.grounded = true

      if (wasAirborne && this.verticalVel < -2) {
        const intensity = THREE.MathUtils.clamp(Math.abs(this.verticalVel) / 15, 0.1, 1.0)
        for (const cb of this.landingListeners) cb({ intensity })
      }

      this.verticalVel = 0
    } else if (this.grounded) {
      // Snap to ground when walking downhill (if close)
      const dropDist = this.position.y - groundY
      if (dropDist < 0.5) {
        this.position.y = groundY
      } else {
        // Walked off edge
        this.grounded = false
        this.verticalVel = 0
      }
    }

    // Fall distance tracking
    const dy = this.position.y - this.prevY
    if (dy < -0.05) {
      this.fallDistance += Math.abs(dy)
    } else {
      this.fallDistance = 0
    }
    this.prevY = this.position.y
  }

  private applyTerrainCollision(dt: number) {
    const px = this.position.x
    const pz = this.position.z
    const h0 = this.terrain.heightAtXZ(px, pz)
    const dx = this.velocity.x * dt
    const dz = this.velocity.z * dt

    const tryStep = (sx: number, sz: number): boolean => {
      if (Math.abs(sx) < 1e-6 && Math.abs(sz) < 1e-6) return false
      const nx = px + sx
      const nz = pz + sz
      const h1 = this.terrain.heightAtXZ(nx, nz)
      const climb = h1 - h0
      if (climb > this.maxStepUp) return false
      const slope = this.terrain.slopeAtXZ(nx, nz)
      if (climb > 0.08 && slope > this.maxClimbSlope) return false
      this.position.x = nx
      this.position.z = nz
      return true
    }

    if (!tryStep(dx, dz)) {
      if (!tryStep(dx, 0) && !tryStep(0, dz)) {
        this.velocity.x *= 0.35
        this.velocity.z *= 0.35
      }
    }
  }

  private updateStride(dt: number, _prevState: MoveState) {
    const speed = this.speed
    const animTarget = speed
    const animRate = speed > this.animSpeed ? 8.0 : 3.2
    this.animSpeed += (animTarget - this.animSpeed) * (1 - Math.exp(-animRate * dt))
    if (this.animSpeed < 0.05) this.animSpeed = 0

    // No footsteps when airborne or sliding
    if (!this.grounded || this.moveState === 'sliding') return

    const strideHz = THREE.MathUtils.clamp(this.animSpeed / 2.6, 0, 4.0)
    const prevPhase = this.stepPhase
    this.stepPhase = (this.stepPhase + dt * strideHz) % 1

    if (strideHz > 0.25 && this.stepPhase < prevPhase) {
      const intensity = THREE.MathUtils.clamp(speed / this.runSpeed, 0.2, 1.0)
      for (const cb of this.stepListeners) cb({ intensity })
    }
  }

  setWind(_dirXZ: THREE.Vector2) {
    // No-op in FP (was for cape flutter)
  }
}
