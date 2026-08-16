import type { PondEnvironment, PondSeason } from '../environment'

export interface KoiVariantColors {
  base: string
  patch: string
  fin: string
  eye: string
}

export interface Theme {
  key: 'light' | 'dark'
  waterTop: string
  waterMid: string
  waterBottom: string
  floorBlotch: string
  sheen: string
  ray: string | null
  deep: string
  vignette: string
  plankton: readonly [string, string, string, string]
  halo: string | null
  ripple: string
  koi: readonly KoiVariantColors[]
  minnow: readonly string[]
  fishFilter: string
  lily: string
  lilyLight: string
  lilyVein: string
  lotusOuter: string
  lotusInner: string
  lotusHeart: string
  pebbles: readonly string[]
  mote: string
  caustics: boolean
  night: number
  turtleShell: string
  turtleSkin: string
  turtleRing: string
}

export const THEMES: Record<'light' | 'dark', Theme> = {
  light: {
    key: 'light',
    waterTop: '#a8e4ee',
    waterMid: '#5fb6cb',
    waterBottom: '#4193ab',
    floorBlotch: '#287c94',
    sheen: 'rgba(255,255,255,0.55)',
    ray: '#ffffff',
    deep: 'rgba(8,58,76,0.17)',
    vignette: 'rgba(4,44,58,0.14)',
    plankton: ['#a9ecb6', '#4cd476', '#1fa34b', '#147639'],
    halo: null,
    ripple: '#f2feff',
    koi: [
      { base: '#fdf9f0', patch: '#ef5a1d', fin: 'rgba(253,249,240,0.7)', eye: '#2b2622' },
      { base: '#f6b23e', patch: '#e07d1f', fin: 'rgba(252,242,222,0.65)', eye: '#2b2622' },
      { base: '#f9f4ea', patch: '#d8452c', fin: 'rgba(253,249,240,0.7)', eye: '#2b2622' },
    ],
    minnow: ['#5f879c', '#e0704d', '#6f9c56'],
    fishFilter: `<filter id="fx" filterUnits="userSpaceOnUse" x="-70" y="-70" width="240%" height="240%"><feDropShadow dx="0.8" dy="2.8" stdDeviation="3.4" flood-color="#063340" flood-opacity="0.18"/></filter>`,
    lily: '#35855c',
    lilyLight: 'rgba(255,255,255,0.22)',
    lilyVein: 'rgba(10,60,40,0.28)',
    lotusOuter: '#f299c0',
    lotusInner: '#f8cddd',
    lotusHeart: '#f5cf5f',
    pebbles: ['#5d96a8', '#4c869c', '#74a7b6'],
    mote: '#ffffff',
    caustics: true,
    night: 0.4,
    turtleShell: '#549647',
    turtleSkin: '#86bb71',
    turtleRing: 'rgba(20,60,30,0.38)',
  },
  dark: {
    key: 'dark',
    waterTop: '#0d2c42',
    waterMid: '#071c2e',
    waterBottom: '#010810',
    floorBlotch: '#0e2c3d',
    sheen: 'rgba(125,211,252,0.14)',
    ray: null,
    deep: 'rgba(0,0,0,0.5)',
    vignette: 'rgba(0,0,0,0.45)',
    plankton: ['#1d7183', '#1295af', '#13c3e2', '#8df7ff'],
    halo: '#22d3ee',
    ripple: '#38e0f8',
    koi: [
      { base: 'rgba(215,242,250,0.95)', patch: 'rgba(167,139,250,0.95)', fin: 'rgba(170,228,248,0.5)', eye: '#0b2231' },
      { base: 'rgba(188,233,248,0.93)', patch: 'rgba(244,114,182,0.9)', fin: 'rgba(170,228,248,0.5)', eye: '#0b2231' },
      { base: 'rgba(226,244,252,0.95)', patch: 'rgba(74,222,128,0.9)', fin: 'rgba(170,228,248,0.5)', eye: '#0b2231' },
    ],
    minnow: ['rgba(125,211,252,0.9)', 'rgba(167,139,250,0.85)', 'rgba(94,234,212,0.85)'],
    fishFilter: `<filter id="fx" filterUnits="userSpaceOnUse" x="-70" y="-70" width="240%" height="240%"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#22d3ee" flood-opacity="0.8"/></filter>`,
    lily: '#166154',
    lilyLight: 'rgba(160,240,250,0.16)',
    lilyVein: 'rgba(120,220,230,0.22)',
    lotusOuter: '#9be9f7',
    lotusInner: '#c9f4fb',
    lotusHeart: '#a78bfa',
    pebbles: ['#183349', '#213d57', '#122940'],
    mote: '#7dd3fc',
    caustics: false,
    night: 0.24,
    turtleShell: '#176853',
    turtleSkin: '#238a72',
    turtleRing: 'rgba(127,243,255,0.3)',
  },
}

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

interface SeasonTint {
  waterTop: string
  waterMid: string
  waterBottom: string
  floorBlotch: string
  plankton: readonly [string, string, string, string]
  lily: string
  lotusOuter: string
  lotusInner: string
  accent: string
}

const SEASON_TINTS: Record<PondSeason, SeasonTint> = {
  spring: {
    waterTop: '#a8e4ee',
    waterMid: '#5fb6cb',
    waterBottom: '#4193ab',
    floorBlotch: '#287c94',
    plankton: ['#a9ecb6', '#4cd476', '#1fa34b', '#147639'],
    lily: '#35855c',
    lotusOuter: '#f299c0',
    lotusInner: '#f8cddd',
    accent: '#f5cf5f',
  },
  summer: {
    waterTop: '#9fdfe7',
    waterMid: '#55b2c2',
    waterBottom: '#36899d',
    floorBlotch: '#2f7f82',
    plankton: ['#b3ef9b', '#61d663', '#2aa249', '#176f3d'],
    lily: '#2f7d4f',
    lotusOuter: '#ee8cad',
    lotusInner: '#f5c6d3',
    accent: '#f0cb52',
  },
  autumn: {
    waterTop: '#b0d6d2',
    waterMid: '#719fa5',
    waterBottom: '#527d89',
    floorBlotch: '#697b67',
    plankton: ['#c4dc8c', '#91bd58', '#678d42', '#47672f'],
    lily: '#718052',
    lotusOuter: '#d48468',
    lotusInner: '#e7b28d',
    accent: '#ddb25e',
  },
  winter: {
    waterTop: '#c4dde2',
    waterMid: '#86aeb9',
    waterBottom: '#587b8b',
    floorBlotch: '#637c7d',
    plankton: ['#c9e3d8', '#8fbfb3', '#5e958e', '#3d6d70'],
    lily: '#657d72',
    lotusOuter: '#c2d3d7',
    lotusInner: '#e1ebed',
    accent: '#b9d6de',
  },
}

const parseColor = (value: string): Rgba => {
  if (value.startsWith('#')) {
    const hex = value.slice(1)
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      }
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    }
  }
  const parts = value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]
  return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts[3] ?? 1 }
}

const formatColor = ({ r, g, b, a }: Rgba) =>
  `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${Number(a.toFixed(3))})`

const mixColor = (from: string, to: string, amount: number) => {
  const a = parseColor(from)
  const b = parseColor(to)
  return formatColor({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
    a: a.a + (b.a - a.a) * amount,
  })
}

const mixNumber = (from: number, to: number, amount: number) => from + (to - from) * amount

const weightedSeasonColor = (environment: PondEnvironment, pick: (tint: SeasonTint) => string) => {
  let value: Rgba = { r: 0, g: 0, b: 0, a: 0 }
  for (const season of Object.keys(SEASON_TINTS) as PondSeason[]) {
    const source = parseColor(pick(SEASON_TINTS[season]))
    const weight = environment.seasonWeights[season]
    value = {
      r: value.r + source.r * weight,
      g: value.g + source.g * weight,
      b: value.b + source.b * weight,
      a: value.a + source.a * weight,
    }
  }
  return formatColor(value)
}

function blendTheme(from: Theme, to: Theme, amount: number): Theme {
  const mixKoi = (index: number): KoiVariantColors => ({
    base: mixColor(from.koi[index].base, to.koi[index].base, amount),
    patch: mixColor(from.koi[index].patch, to.koi[index].patch, amount),
    fin: mixColor(from.koi[index].fin, to.koi[index].fin, amount),
    eye: mixColor(from.koi[index].eye, to.koi[index].eye, amount),
  })
  return {
    key: amount >= 0.46 ? 'light' : 'dark',
    waterTop: mixColor(from.waterTop, to.waterTop, amount),
    waterMid: mixColor(from.waterMid, to.waterMid, amount),
    waterBottom: mixColor(from.waterBottom, to.waterBottom, amount),
    floorBlotch: mixColor(from.floorBlotch, to.floorBlotch, amount),
    sheen: mixColor(from.sheen, to.sheen, amount),
    ray: amount > 0.08 ? mixColor('rgba(255,255,255,0)', to.ray ?? '#ffffff', amount) : null,
    deep: mixColor(from.deep, to.deep, amount),
    vignette: mixColor(from.vignette, to.vignette, amount),
    plankton: [
      mixColor(from.plankton[0], to.plankton[0], amount),
      mixColor(from.plankton[1], to.plankton[1], amount),
      mixColor(from.plankton[2], to.plankton[2], amount),
      mixColor(from.plankton[3], to.plankton[3], amount),
    ],
    halo: amount < 0.82 ? mixColor(from.halo ?? 'rgba(34,211,238,0)', 'rgba(34,211,238,0)', amount) : null,
    ripple: mixColor(from.ripple, to.ripple, amount),
    koi: from.koi.map((_, index) => mixKoi(index)) as Theme['koi'],
    minnow: from.minnow.map((color, index) => mixColor(color, to.minnow[index], amount)) as Theme['minnow'],
    fishFilter: amount >= 0.46 ? to.fishFilter : from.fishFilter,
    lily: mixColor(from.lily, to.lily, amount),
    lilyLight: mixColor(from.lilyLight, to.lilyLight, amount),
    lilyVein: mixColor(from.lilyVein, to.lilyVein, amount),
    lotusOuter: mixColor(from.lotusOuter, to.lotusOuter, amount),
    lotusInner: mixColor(from.lotusInner, to.lotusInner, amount),
    lotusHeart: mixColor(from.lotusHeart, to.lotusHeart, amount),
    pebbles: from.pebbles.map((color, index) => mixColor(color, to.pebbles[index], amount)) as Theme['pebbles'],
    mote: mixColor(from.mote, to.mote, amount),
    caustics: amount > 0.24,
    night: mixNumber(from.night, to.night, amount),
    turtleShell: mixColor(from.turtleShell, to.turtleShell, amount),
    turtleSkin: mixColor(from.turtleSkin, to.turtleSkin, amount),
    turtleRing: mixColor(from.turtleRing, to.turtleRing, amount),
  }
}

export function themeForEnvironment(environment: PondEnvironment): Theme {
  const theme = blendTheme(THEMES.dark, THEMES.light, environment.daylight)
  const seasonAmount = 0.08 + environment.daylight * 0.18
  const seasonColor = (pick: (tint: SeasonTint) => string) => weightedSeasonColor(environment, pick)
  theme.waterTop = mixColor(theme.waterTop, seasonColor(tint => tint.waterTop), seasonAmount)
  theme.waterMid = mixColor(theme.waterMid, seasonColor(tint => tint.waterMid), seasonAmount)
  theme.waterBottom = mixColor(theme.waterBottom, seasonColor(tint => tint.waterBottom), seasonAmount)
  theme.floorBlotch = mixColor(theme.floorBlotch, seasonColor(tint => tint.floorBlotch), seasonAmount)
  theme.lily = mixColor(theme.lily, seasonColor(tint => tint.lily), seasonAmount * 1.25)
  theme.lotusOuter = mixColor(theme.lotusOuter, seasonColor(tint => tint.lotusOuter), seasonAmount * 1.2)
  theme.lotusInner = mixColor(theme.lotusInner, seasonColor(tint => tint.lotusInner), seasonAmount)
  theme.lotusHeart = mixColor(theme.lotusHeart, seasonColor(tint => tint.accent), seasonAmount)
  theme.plankton = [
    mixColor(theme.plankton[0], weightedSeasonColor(environment, tint => tint.plankton[0]), seasonAmount * 0.72),
    mixColor(theme.plankton[1], weightedSeasonColor(environment, tint => tint.plankton[1]), seasonAmount * 0.72),
    mixColor(theme.plankton[2], weightedSeasonColor(environment, tint => tint.plankton[2]), seasonAmount * 0.72),
    mixColor(theme.plankton[3], weightedSeasonColor(environment, tint => tint.plankton[3]), seasonAmount * 0.72),
  ]

  const isMorning = environment.minuteOfDay < 720
  const twilightColor = isMorning ? '#e7a58f' : '#77618c'
  const twilightAmount = environment.twilight * 0.28
  theme.waterTop = mixColor(theme.waterTop, twilightColor, twilightAmount)
  theme.waterMid = mixColor(theme.waterMid, isMorning ? '#8e8290' : '#4f466f', twilightAmount * 0.7)
  theme.sheen = mixColor(theme.sheen, isMorning ? '#ffd2ae' : '#b79bc9', environment.twilight * 0.34)

  const goldenAmount = environment.goldenLight * 0.14
  theme.waterTop = mixColor(theme.waterTop, isMorning ? '#f5c6a5' : '#c59baa', goldenAmount)
  theme.sheen = mixColor(theme.sheen, isMorning ? '#ffe1bd' : '#e6bfd2', goldenAmount * 1.35)
  const highSun = Math.max(0, Math.min(1, (environment.solarAltitude - 12) / 55))
  theme.waterTop = mixColor(theme.waterTop, '#c8f0f1', highSun * 0.08)
  theme.waterMid = mixColor(theme.waterMid, '#74c6cd', highSun * 0.045)

  const fishSeasonAmount = environment.seasonWeights.winter * 0.16 + environment.seasonWeights.autumn * 0.08
  theme.koi = theme.koi.map(variant => ({
    ...variant,
    base: mixColor(variant.base, environment.season === 'winter' ? '#e1edf0' : '#f4e5d0', fishSeasonAmount),
    patch: mixColor(variant.patch, seasonColor(tint => tint.accent), fishSeasonAmount),
  })) as Theme['koi']
  theme.fishFilter = environment.daylight >= 0.46
    ? `<filter id="fx" filterUnits="userSpaceOnUse" x="-70" y="-70" width="240%" height="240%"><feDropShadow dx="0.8" dy="2.8" stdDeviation="3.4" flood-color="#063340" flood-opacity="${(0.13 + environment.daylight * 0.05).toFixed(2)}"/></filter>`
    : `<filter id="fx" filterUnits="userSpaceOnUse" x="-70" y="-70" width="240%" height="240%"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#22d3ee" flood-opacity="${(0.48 + (1 - environment.daylight) * 0.32).toFixed(2)}"/></filter>`
  return theme
}
