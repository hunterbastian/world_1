import * as THREE from 'three'
import type { WalkerLimbs } from './WalkerMechModel'

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
  const idleBob = Math.sin(t * 0.45) * 0.025 * idleBlend
  const idleRock = Math.sin(t * 0.3) * 0.006 * idleBlend
  const idleHeadScan = Math.sin(t * 0.22) * 0.035 * idleBlend
  const idleHeadNod = Math.sin(t * 0.55) * 0.012 * idleBlend

  limbs.weaponL.rotation.x = Math.sin(t * 0.25) * 0.018 * idleBlend
  limbs.weaponR.rotation.x = Math.sin(t * 0.25 + 0.8) * 0.018 * idleBlend
  limbs.weaponL.rotation.z = 0.015 * idleBlend
  limbs.weaponR.rotation.z = -0.015 * idleBlend

  /* ---- walk / trot: heavy stomping gait ---- */
  const legSwing = 0.24 * walkBlend
  const kneeExtra = 0.35 * walkBlend
  const rawBob = Math.sin(p * 2)
  const footfallBob = (rawBob > 0
    ? rawBob * 0.015
    : rawBob * rawBob * -0.045
  ) * walkBlend
  const bodyRoll = 0.024 * walkBlend
  const bodyPitch = 0.012 * walkBlend
  const headCounter = 0.018 * walkBlend

  const weaponWalkSway = Math.sin(p) * 0.022 * walkBlend
  limbs.weaponL.rotation.x += weaponWalkSway
  limbs.weaponR.rotation.x += -weaponWalkSway * 0.7
  limbs.weaponL.rotation.z += Math.sin(p * 2) * 0.008 * walkBlend
  limbs.weaponR.rotation.z -= Math.sin(p * 2) * 0.008 * walkBlend

  for (let i = 0; i < limbs.legs.length; i++) {
    const leg = limbs.legs[i]
    const pairPhase = (i === 0 || i === 3) ? p : p + Math.PI
    const fwdSign = leg.isFront ? 1 : -1

    const idleMicro = Math.sin(t * 0.4 + i * 1.8) * 0.012 * idleBlend
    const idleWeightShift = Math.sin(t * 0.18 + i * Math.PI * 0.5) * 0.008 * idleBlend

    const swingRaw = Math.sin(pairPhase)
    const powerStroke = swingRaw > 0
      ? swingRaw * 0.7
      : swingRaw * 1.3
    leg.upper.rotation.x = leg.restUpperX
      + powerStroke * legSwing * fwdSign
      + idleMicro + idleWeightShift
    leg.upper.rotation.z = leg.restUpperZ
      + Math.cos(pairPhase) * 0.035 * walkBlend

    const liftRaw = Math.max(0, Math.sin(pairPhase))
    const lift = liftRaw * liftRaw
    leg.lower.rotation.x = leg.restLowerX
      + lift * kneeExtra
      - idleMicro * 0.35

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
  limbs.hull.rotation.z = Math.sin(p) * bodyRoll + idleRock
  limbs.hull.rotation.x = -Math.abs(Math.sin(p * 0.5)) * bodyPitch + Math.sin(t * 0.3) * 0.004 * idleBlend

  /* ---- head: counter-stabilization like a bird ---- */
  limbs.head.rotation.x = -Math.sin(p) * headCounter + idleHeadNod
  limbs.head.rotation.y = idleHeadScan
  limbs.head.rotation.z = -Math.sin(p) * bodyRoll * 0.4
}
