import { LAYOUT } from './layout'
import { rng } from './prng'
import type { Cell, Grid } from './types'

const ENERGY_BY_LEVEL = [0, 1, 2, 4, 7] as const

export interface EcosystemStats {
  activeDays: number
  totalEnergy: number
  energyDensity: number
  consistency: number
  burstiness: number
  recentEnergy: number
}

export interface LilyPadSpec {
  x: number
  y: number
  radius: number
  notchDeg: number
  duration: number
}

export function cellEnergy(cell: Pick<Cell, 'level'>): number {
  return ENERGY_BY_LEVEL[cell.level]
}

export function ecosystemStats(grid: Grid): EcosystemStats {
  const active = grid.cells.filter(cell => cell.level > 0)
  const energies = active.map(cellEnergy)
  const totalEnergy = energies.reduce((sum, energy) => sum + energy, 0)
  const energyDensity = active.length === 0 ? 0 : totalEnergy / active.length
  const consistency = grid.cells.length === 0 ? 0 : active.length / grid.cells.length

  const mean = energyDensity
  const variance =
    energies.length === 0 ? 0 : energies.reduce((sum, energy) => sum + (energy - mean) ** 2, 0) / energies.length
  const burstiness = mean === 0 ? 0 : Math.min(1, Math.sqrt(variance) / mean)

  const recent = [...grid.cells]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .reduce((sum, cell) => sum + cellEnergy(cell), 0)

  return {
    activeDays: active.length,
    totalEnergy,
    energyDensity,
    consistency,
    burstiness,
    recentEnergy: Math.min(1, recent / (30 * ENERGY_BY_LEVEL[4])),
  }
}

export function desiredPopulation(stats: EcosystemStats): number {
  const carryingCapacity = stats.activeDays + stats.totalEnergy * 0.18 + stats.recentEnergy * 42
  return Math.max(1, Math.min(4, 1 + Math.floor(carryingCapacity / 130)))
}

export function lilyPadLayout(width: number, seed: string): LilyPadSpec[] {
  const r = rng(`lilies:${seed}`)
  const positions: [number, number, number][] = [
    [46 + r() * 14, 22 + r() * 8, 12 + r() * 3],
    [78 + r() * 10, 40 + r() * 8, 8 + r() * 2.5],
    [width - 58 - r() * 12, LAYOUT.height - 32 - r() * 8, 13 + r() * 3],
    [width - 96 - r() * 10, LAYOUT.height - 52, 7.5 + r() * 2],
  ]

  return positions.map(([x, y, radius], index) => ({
    x,
    y,
    radius,
    notchDeg: r() * 360,
    duration: 5.5 + index * 0.9 + r() * 2,
  }))
}
