import { createNoise2D } from 'simplex-noise'

export type Noise2D = (x: number, y: number) => number

// Deterministic 32-bit hash -> [0,1)
function hash01(seed: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 0xffffffff
}

export function makeNoise2D(seed: string): Noise2D {
  // simplex-noise accepts a random function; provide deterministic RNG from seed
  let s = Math.floor(hash01(seed) * 0x7fffffff) || 1
  const rand = () => {
    // LCG
    s = (Math.imul(48271, s) % 0x7fffffff) >>> 0
    return s / 0x7fffffff
  }
  return createNoise2D(rand)
}

export function fbm2(noise: Noise2D, x: number, y: number, octaves: number, lacunarity = 2, gain = 0.5) {
  let amp = 1
  let freq = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq)
    norm += amp
    amp *= gain
    freq *= lacunarity
  }
  return sum / Math.max(1e-6, norm)
}

export function ridge2(n: number) {
  return 1 - Math.abs(n)
}

