export type QualityTier = 'high' | 'medium' | 'low'

export type PerformanceManagerOptions = {
  /**
   * EMA half-life in seconds. Larger = smoother, slower response.
   * For cinematic stability, we bias toward smooth (default ~2.5s).
   */
  emaHalfLifeSec?: number

  /** Degrade from high -> medium if EMA stays above this (ms). */
  degradeToMediumMs?: number

  /** Degrade from medium -> low if EMA stays above this (ms). */
  degradeToLowMs?: number

  /** Upgrade from medium -> high if EMA stays below this (ms). */
  upgradeToHighMs?: number

  /** Upgrade from low -> medium if EMA stays below this (ms). */
  upgradeToMediumMs?: number

  /** Seconds over threshold before degrading. */
  degradeSustainSec?: number

  /** Seconds under threshold before upgrading. */
  upgradeSustainSec?: number

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
  private readonly degradeToMediumMs: number
  private readonly degradeToLowMs: number
  private readonly upgradeToHighMs: number
  private readonly upgradeToMediumMs: number
  private readonly degradeSustainSec: number
  private readonly upgradeSustainSec: number
  private readonly cooldownSec: number

  private overFor = 0
  private underFor = 0
  private cooldown = 0

  constructor(opts: PerformanceManagerOptions = {}) {
    // Defaults tuned to be “sticky to high” for cinematic feel:
    // - Slow EMA so micro-stutters don't trigger downgrades.
    // - Medium is allowed briefly; low only under real sustained stress.
    this.halfLifeSec = opts.emaHalfLifeSec ?? 2.0

    this.degradeToMediumMs = opts.degradeToMediumMs ?? 21.5
    this.degradeToLowMs = opts.degradeToLowMs ?? 24.0

    this.upgradeToHighMs = opts.upgradeToHighMs ?? 18.2
    this.upgradeToMediumMs = opts.upgradeToMediumMs ?? 20.0

    this.degradeSustainSec = opts.degradeSustainSec ?? 1.6
    this.upgradeSustainSec = opts.upgradeSustainSec ?? 2.8

    this.cooldownSec = opts.cooldownSec ?? 3.0
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

    const degradeMs = this.tier === 'high' ? this.degradeToMediumMs : this.degradeToLowMs
    const upgradeMs = this.tier === 'low' ? this.upgradeToMediumMs : this.upgradeToHighMs

    if (this.emaMs > degradeMs) {
      this.overFor += dtSec
      this.underFor = 0
    } else if (this.emaMs < upgradeMs) {
      this.underFor += dtSec
      this.overFor = 0
    } else {
      // In the “good band”: decay timers so tiny excursions don’t accumulate forever.
      this.overFor = Math.max(0, this.overFor - dtSec * 0.8)
      this.underFor = Math.max(0, this.underFor - dtSec * 0.8)
    }

    let next: QualityTier = this.tier
    if (this.overFor >= this.degradeSustainSec) {
      next = this.tier === 'high' ? 'medium' : 'low'
    } else if (this.underFor >= this.upgradeSustainSec) {
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

