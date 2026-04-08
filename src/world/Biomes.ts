export type BiomeId = 'grassy_plains' | 'deep_forest' | 'snowy_mountains'

export const BiomeOrder: readonly BiomeId[] = ['grassy_plains', 'deep_forest', 'snowy_mountains'] as const

export function biomeIndex(biome: BiomeId): number {
  return BiomeOrder.indexOf(biome)
}

export function biomeFromIndex(index: number): BiomeId {
  const i = Math.max(0, Math.min(BiomeOrder.length - 1, Math.floor(index)))
  return BiomeOrder[i]!
}

export type BiomeParams = {
  baseColor: number
  treeDensity: number
}

export const Biome: Record<BiomeId, BiomeParams> = {
  grassy_plains: {
    baseColor: 0x5da847,
    treeDensity: 0.06,
  },
  deep_forest: {
    baseColor: 0x2e6b3a,
    treeDensity: 0.40,
  },
  snowy_mountains: {
    baseColor: 0xe7eef6,
    treeDensity: 0.02,
  },
}

