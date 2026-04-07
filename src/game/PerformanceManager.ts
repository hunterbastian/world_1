export type QualityTier = 'high' | 'medium' | 'low'

export type PerformanceManagerOptions = {
  /**
   * EMA half-life in seconds. Larger = smoother, slower response.
   * For cinematic stability, we bias toward smooth (default ~2.5s).
   */
  emaHalfLifeSec?: number

  /** Degrade if EMA frame time stays above this (seconds). */
  degradeMs?: number

  /** Upgrade if EMA frame time stays below this (seconds). */
  upgradeMs?: number

  /** Seconds over/under threshold before changing tier. */
  sustainSec?: number

  /** Extra delay after any tier change (seconds). Prevents oscillation. */
  cooldownSec?: number
}

function emaAlpha(dt: number, halfLifeSec: number) {
  // Exponential decay such that value halves every halfLifeSec.
  // alpha = 1 - exp(-ln(2) * dt / halfLifeSec)
  return 1 - Math.exp((-Math.LN2 * dt) / Math.max(1e-4, halfLifeSec))
}

export class PerformanceManager {
  public tier: QualityTier = 'high'

  /** Smoothed frame time in ms (EMA). */
  public emaMs = 16.7

  private readonly halfLifeSec: number
  private readonly degradeMs: number
  private readonly upgradeMs: number
  private readonly sustainSec: number
  private readonly cooldownSec: number

  private overFor = 0
  private underFor = 0
  private cooldown = 0

  constructor(opts: PerformanceManagerOptions = {}) {
    this.halfLifeSec = opts.emaHalfLifeSec ?? 2.5
    this.degradeMs = opts.degradeMs ?? 20.5
    this.upgradeMs = opts.upgradeMs ?? 17.0
    this.sustainSec = opts.sustainSec ?? 1.8
    this.cooldownSec = opts.cooldownSec ?? 2.5
  }

  update(dtSec: number) {
    const ms = dtSec * 1000
    const a = emaAlpha(dtSec, this.halfLifeSec)
    this.emaMs = this.emaMs + (ms - this.emaMs) * a

    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - dtSec)
      this.overFor = 0
      this.underFor = 0
      return { changed: false as const, tier: this.tier, emaMs: this.emaMs }
    }

    if (this.emaMs > this.degradeMs) {
      this.overFor += dtSec
      this.underFor = 0
    } else if (this.emaMs < this.upgradeMs) {
      this.underFor += dtSec
      this.overFor = 0
    } else {
      // In the “good band”: decay timers so tiny excursions don’t accumulate forever.
      this.overFor = Math.max(0, this.overFor - dtSec * 0.8)
      this.underFor = Math.max(0, this.underFor - dtSec * 0.8)
    }

    let next: QualityTier = this.tier
    if (this.overFor >= this.sustainSec) {
      next = this.tier === 'high' ? 'medium' : 'low'
    } else if (this.underFor >= this.sustainSec * 1.4) {
      next = this.tier === 'low' ? 'medium' : 'high'
    }

    if (next !== this.tier) {
      this.tier = next
      this.cooldown = this.cooldownSec
      this.overFor = 0
      this.underFor = 0
      return { changed: true as const, tier: this.tier, emaMs: this.emaMs }
    }

    return { changed: false as const, tier: this.tier, emaMs: this.emaMs }
  }
}

