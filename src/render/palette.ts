export interface KoiVariantColors {
  base: string
  patch: string
  fin: string
  eye: string
}

export interface Theme {
  key: 'light' | 'dark'
  waterTop: string
  waterBottom: string
  floorBlotch: string
  vignette: string
  plankton: readonly [string, string, string, string]
  halo: string | null
  ripple: string
  koi: readonly KoiVariantColors[]
  minnow: readonly string[]
  fishFilter: string
  lily: string
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
    waterTop: '#9fdbe4',
    waterBottom: '#4fa8bf',
    floorBlotch: '#3b8ba2',
    vignette: 'rgba(4,44,58,0.20)',
    plankton: ['#b4f2c0', '#5fd77f', '#2fa855', '#1c7f40'],
    halo: null,
    ripple: '#eafcff',
    koi: [
      { base: '#faf6ee', patch: '#e85d2f', fin: 'rgba(250,246,238,0.65)', eye: '#2b2622' },
      { base: '#f2b04a', patch: '#e0862e', fin: 'rgba(250,240,220,0.6)', eye: '#2b2622' },
      { base: '#f6f2e9', patch: '#d94f35', fin: 'rgba(250,246,238,0.65)', eye: '#2b2622' },
    ],
    minnow: ['#7d9bab', '#d98f6d', '#8fae72'],
    fishFilter: `<filter id="fx" filterUnits="userSpaceOnUse" x="-70" y="-70" width="240%" height="240%"><feDropShadow dx="3" dy="8" stdDeviation="3" flood-color="#063340" flood-opacity="0.28"/></filter>`,
    lily: '#3e9268',
    lilyVein: 'rgba(10,60,40,0.25)',
    lotusOuter: '#f2a7c3',
    lotusInner: '#f8cddd',
    lotusHeart: '#f5cf5f',
    pebbles: ['#6fa3b2', '#5d93a6', '#82b2be'],
    mote: '#ffffff',
    caustics: true,
    night: 0.4,
    turtleShell: '#5f9e4f',
    turtleSkin: '#8fc07a',
    turtleRing: 'rgba(20,60,30,0.35)',
  },
  dark: {
    key: 'dark',
    waterTop: '#0b2231',
    waterBottom: '#02090f',
    floorBlotch: '#0e2c3d',
    vignette: 'rgba(0,0,0,0.42)',
    plankton: ['#19606f', '#128098', '#10b3cf', '#7ff3ff'],
    halo: '#22d3ee',
    ripple: '#22d3ee',
    koi: [
      { base: 'rgba(207,238,247,0.92)', patch: 'rgba(167,139,250,0.9)', fin: 'rgba(160,225,245,0.4)', eye: '#0b2231' },
      { base: 'rgba(180,230,246,0.9)', patch: 'rgba(244,114,182,0.85)', fin: 'rgba(160,225,245,0.4)', eye: '#0b2231' },
      { base: 'rgba(220,242,250,0.92)', patch: 'rgba(74,222,128,0.85)', fin: 'rgba(160,225,245,0.4)', eye: '#0b2231' },
    ],
    minnow: ['rgba(125,211,252,0.8)', 'rgba(167,139,250,0.75)', 'rgba(94,234,212,0.75)'],
    fishFilter: `<filter id="fx" filterUnits="userSpaceOnUse" x="-70" y="-70" width="240%" height="240%"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#22d3ee" flood-opacity="0.6"/></filter>`,
    lily: '#14534a',
    lilyVein: 'rgba(120,220,230,0.18)',
    lotusOuter: '#9be9f7',
    lotusInner: '#c9f4fb',
    lotusHeart: '#a78bfa',
    pebbles: ['#14293c', '#1b3348', '#0f2233'],
    mote: '#7dd3fc',
    caustics: false,
    night: 0.24,
    turtleShell: '#155e4c',
    turtleSkin: '#1f7a64',
    turtleRing: 'rgba(127,243,255,0.25)',
  },
}
