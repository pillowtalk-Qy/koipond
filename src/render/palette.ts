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
