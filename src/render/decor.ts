import { LAYOUT } from '../layout'
import { iceFloeLayout, lilyPadLayout, type IceFloeSpec } from '../ecology'
import { rng } from '../prng'
import { f1 } from '../util'
import type { Theme } from './palette'

/** Shared soft-blur filter used by caustics, god rays and the surface sheen. */
export const SOFT_FILTER =
  `<filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>`

export function floorBlotches(width: number, r: () => number): string {
  let out = ''
  for (let i = 0; i < 4; i++) {
    const x = f1(width * (0.12 + r() * 0.76))
    const y = f1(30 + r() * (LAYOUT.height - 60))
    const duration = f1(24 + r() * 10)
    const delay = f1(r() * 18)
    const opacity = f1(0.34 + r() * 0.18)
    out += `<ellipse class="floor" style="--floor-opacity:${opacity};animation-duration:${duration}s;animation-delay:-${delay}s" cx="${x}" cy="${y}" rx="${f1(54 + r() * 72)}" ry="${f1(17 + r() * 18)}" fill="url(#floorG)" filter="url(#soft)"/>`
  }
  return out
}

/** Wide, blurred currents add slow variation without competing with the fish. */
export function waterCurrents(width: number, theme: Theme, r: () => number): string {
  let out = ''
  for (let i = 0; i < 3; i++) {
    const y = 42 + i * 55 + (r() - 0.5) * 18
    const bend = 22 + r() * 28
    const d =
      `M-80 ${f1(y)} ` +
      `C${f1(width * 0.2)} ${f1(y - bend)} ${f1(width * 0.34)} ${f1(y + bend)} ${f1(width * 0.53)} ${f1(y)} ` +
      `S${f1(width * 0.82)} ${f1(y - bend)} ${f1(width + 80)} ${f1(y + 4)}`
    out +=
      `<path class="current" style="animation-delay:-${f1(i * 4.6 + r() * 3)}s" d="${d}" ` +
      `fill="none" stroke="${theme.sheen}" stroke-width="${f1(9 + r() * 7)}" stroke-linecap="round" filter="url(#soft)"/>`
  }
  return out
}

/** Sun shafts falling from the water surface, slowly breathing. */
export function godRays(width: number, theme: Theme, r: () => number, sunDirection?: number): string {
  if (!theme.ray) return ''
  let out = ''
  const n = 3
  for (let i = 0; i < n; i++) {
    const xTop = width * (0.14 + (i / (n - 1)) * 0.62) + (r() - 0.5) * width * 0.08
    const wTop = 26 + r() * 30
    const spread = wTop * (2.6 + r() * 1.2)
    const lean = sunDirection === undefined
      ? 40 + r() * 50
      : -sunDirection * (48 + r() * 38) + (r() - 0.5) * 14
    const d =
      `M${f1(xTop)} -4 L${f1(xTop + wTop)} -4 ` +
      `L${f1(xTop + wTop + lean + spread / 2)} ${LAYOUT.height} L${f1(xTop + lean - spread / 2)} ${LAYOUT.height} Z`
    out += `<path class="ray" style="animation-delay:-${f1(i * 3.7 + r() * 2)}s" d="${d}" fill="${theme.ray}" filter="url(#soft)"/>`
  }
  return out
}

/** Bright band along the top edge so the water reads as a surface seen from above. */
export function surfaceSheen(width: number, theme: Theme, intensity = 1): string {
  return (
    `<g opacity="${f1(intensity)}"><rect width="${width}" height="34" fill="url(#sheenG)"/>` +
    `<rect width="${width}" height="2.5" fill="${theme.sheen}" opacity="${theme.key === 'dark' ? 0.5 : 0.75}"/></g>`
  )
}

/** Darkening toward the bottom for depth. */
export function deepShade(width: number, theme: Theme): string {
  const height = theme.key === 'light' ? 48 : 66
  const opacity = theme.key === 'light' ? 0.68 : 0.82
  return `<rect y="${LAYOUT.height - height}" width="${width}" height="${height}" fill="url(#deepG)" opacity="${opacity}"/>`
}

export function caustics(width: number, theme: Theme): string {
  if (!theme.caustics) return ''
  let out = ''
  const spots = [
    [width * 0.18, 44, 130, 38],
    [width * 0.42, 128, 170, 46],
    [width * 0.66, 58, 150, 42],
    [width * 0.88, 118, 120, 36],
    [width * 0.52, 24, 90, 26],
  ]
  spots.forEach(([x, y, rx, ry], i) => {
    out += `<ellipse class="ca" style="animation-delay:-${(i * 3.3).toFixed(1)}s" cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="#ffffff" filter="url(#soft)"/>`
  })
  return out
}

function lilyPad(x: number, y: number, radius: number, notchDeg: number, theme: Theme, dur: number): string {
  const a = (notchDeg * Math.PI) / 180
  const half = 0.36
  const x1 = f1(radius * Math.cos(a - half))
  const y1 = f1(radius * Math.sin(a - half))
  const x2 = f1(radius * Math.cos(a + half))
  const y2 = f1(radius * Math.sin(a + half))
  const veins =
    `<path d="M0 0 L${f1(x1 * 0.9)} ${f1(y1 * 0.9)} M0 0 L${f1(-x1 * 0.8)} ${f1(-y1 * 0.8)} M0 0 L${f1(y1 * 0.85)} ${f1(-x1 * 0.85)}"` +
    ` stroke="${theme.lilyVein}" stroke-width="1" fill="none"/>`
  const hl = f1(radius * 0.52)
  return (
    `<g data-pond-part="lily-pad" transform="translate(${f1(x)} ${f1(y)})">` +
    `<ellipse cx="2.5" cy="3.5" rx="${f1(radius)}" ry="${f1(radius * 0.92)}" fill="rgba(0,20,25,0.2)"/>` +
    `<g class="sway" style="animation-duration:${dur}s">` +
    `<path d="M${x1} ${y1} A${radius} ${radius} 0 1 0 ${x2} ${y2} L0 0 Z" fill="${theme.lily}"/>` +
    `<path d="M${x1} ${y1} A${radius} ${radius} 0 1 0 ${x2} ${y2} L0 0 Z" fill="none" stroke="${theme.lilyLight}" stroke-width="1.6" opacity="0.8"/>` +
    `<ellipse cx="${-hl * 0.4}" cy="${-hl * 0.5}" rx="${hl}" ry="${f1(hl * 0.55)}" fill="${theme.lilyLight}" opacity="0.55"/>` +
    `${veins}` +
    `</g></g>`
  )
}

export function lilyPads(width: number, theme: Theme, seed: string, coverage = 1): string {
  const pads = lilyPadLayout(width, seed)
  const visible = Math.max(0, Math.min(1, coverage)) * pads.length
  return pads
    .map((pad, index) => {
      const opacity = Math.max(0, Math.min(1, visible - index))
      return opacity <= 0
        ? ''
        : `<g opacity="${f1(opacity)}">${lilyPad(pad.x, pad.y, pad.radius, pad.notchDeg, theme, f1(pad.duration))}</g>`
    })
    .join('')
}

function smallLotus(theme: Theme, scale: number, delay: number): string {
  let petals = ''
  for (let index = 0; index < 7; index++) {
    petals += `<ellipse rx="5.2" ry="2" transform="rotate(${index * (360 / 7)})" fill="${theme.lotusOuter}"/>`
  }
  let inner = ''
  for (let index = 0; index < 5; index++) {
    inner += `<ellipse rx="3.2" ry="1.35" transform="rotate(${18 + index * 72})" fill="${theme.lotusInner}"/>`
  }
  return (
    `<g transform="scale(${f1(scale)})">` +
    `<ellipse cx="1.8" cy="2.5" rx="7.2" ry="6" fill="rgba(0,20,25,0.18)"/>` +
    `<g class="bloom" style="animation-delay:-${f1(delay)}s">${petals}${inner}<circle r="1.7" fill="${theme.lotusHeart}"/></g>` +
    `</g>`
  )
}

export function summerBlooms(width: number, theme: Theme, seed: string, intensity: number): string {
  if (intensity < 0.08) return ''
  const pads = lilyPadLayout(width, seed)
  const blooms = [
    { pad: pads[1], dx: 2, dy: -2, scale: 0.78 },
    { pad: pads[2], dx: -4, dy: 1, scale: 0.92 },
  ]
    .map(({ pad, dx, dy, scale }, index) =>
      `<g transform="translate(${f1(pad.x + dx)} ${f1(pad.y + dy)})">${smallLotus(theme, scale, index * 1.7)}</g>`,
    )
    .join('')
  return `<g data-seasonal-part="summer-bloom" opacity="${f1(Math.min(1, intensity * 0.94))}">${blooms}</g>`
}

const MAPLE_PATH =
  'M0 -7 L1.5 -3.2 L4.8 -5 L3.5 -1.2 L7 -0.4 L3.4 1.3 L4.5 5 L1.1 3.2 L0 7 L-1.1 3.2 L-4.5 5 L-3.4 1.3 L-7 -0.4 L-3.5 -1.2 L-4.8 -5 L-1.5 -3.2 Z'

export function autumnMapleLeaves(width: number, theme: Theme, seed: string, intensity: number): string {
  if (intensity < 0.08) return ''
  const r = rng(`maple:${seed}`)
  const colors = theme.key === 'dark'
    ? ['#a95143', '#b8733e', '#98743d']
    : ['#d85c42', '#e5833d', '#c69a45']
  let leaves = ''
  for (let index = 0; index < 8; index++) {
    const x = 58 + r() * (width - 116)
    const y = 24 + r() * (LAYOUT.height - 52)
    const rotation = r() * 360
    const scale = 0.65 + r() * 0.45
    const duration = 34 + r() * 24
    const delay = r() * duration
    const startX = -x - 24 - r() * 32
    const endX = width - x + 24 + r() * 32
    const distance = endX - startX
    const y1 = (r() - 0.5) * 20
    const y2 = (r() - 0.5) * 28
    const y3 = (r() - 0.5) * 18
    leaves +=
      `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rotation)}) scale(${f1(scale)})">` +
      `<g class="maple" style="--mx0:${f1(startX)}px;--mx1:${f1(startX + distance * 0.28)}px;--my1:${f1(y1)}px;--mx2:${f1(startX + distance * 0.63)}px;--my2:${f1(y2)}px;--mx3:${f1(endX)}px;--my3:${f1(y3)}px;animation-duration:${f1(duration)}s;animation-delay:-${f1(delay)}s">` +
      `<ellipse class="maple-wake" cx="-2" cy="3" rx="7" ry="2.8" fill="none" stroke="${theme.ripple}" stroke-width="0.8"/>` +
      `<g class="maple-body" style="animation-delay:-${f1(delay * 0.37)}s">` +
      `<path d="${MAPLE_PATH}" transform="translate(1.4 1.8)" fill="rgba(0,20,25,0.17)"/>` +
      `<path d="${MAPLE_PATH}" fill="${colors[index % colors.length]}" stroke="rgba(92,48,29,0.24)" stroke-width="0.7"/>` +
      `<path d="M0 2 L0 9" stroke="${colors[(index + 1) % colors.length]}" stroke-width="1" stroke-linecap="round"/>` +
      `</g></g></g>`
  }
  return `<g data-seasonal-part="autumn-maple" opacity="${f1(Math.min(1, intensity * 0.96))}">${leaves}</g>`
}

function smoothIcePath(floe: IceFloeSpec, seed: string, index: number): string {
  const r = rng(`ice-shape:${seed}:${index}`)
  const points = Array.from({ length: 12 }, (_, point) => {
    const angle = (point / 12) * Math.PI * 2
    const variance = 0.88 + r() * 0.2
    return {
      x: Math.cos(angle) * floe.rx * variance,
      y: Math.sin(angle) * floe.ry * variance,
    }
  })
  const midpoint = (left: { x: number; y: number }, right: { x: number; y: number }) => ({
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  })
  const start = midpoint(points[points.length - 1], points[0])
  let path = `M${f1(start.x)} ${f1(start.y)}`
  points.forEach((point, pointIndex) => {
    const next = points[(pointIndex + 1) % points.length]
    const mid = midpoint(point, next)
    path += ` Q${f1(point.x)} ${f1(point.y)} ${f1(mid.x)} ${f1(mid.y)}`
  })
  return `${path} Z`
}

function snowTracks(floe: IceFloeSpec): string {
  let tracks = ''
  for (let index = 0; index < 8; index++) {
    const offset = index - 4
    tracks += `<ellipse class="snow-track snow-track-${index}" cx="${offset * 12}" cy="${index % 2 === 0 ? -3 : 3}" rx="2.8" ry="1.5" fill="rgba(72,124,138,0.5)" transform="rotate(${index % 2 === 0 ? 18 : -18})"/>`
  }
  return `<g aria-label="turtle tracks in snow" opacity="${floe.rx > 55 ? 1 : 0}">${tracks}</g>`
}

export function winterIce(
  width: number,
  theme: Theme,
  seed: string,
  coverage: number,
  turtleTracks = false,
): string {
  if (coverage < 0.18) return ''
  const floes = iceFloeLayout(width, seed, coverage)
  const visibleCoverage = Math.min(1, (coverage - 0.18) / 0.82)
  const fill = theme.key === 'dark' ? 'rgba(157,211,225,0.38)' : 'rgba(229,247,250,0.82)'
  const rim = theme.key === 'dark' ? 'rgba(191,236,245,0.55)' : 'rgba(255,255,255,0.9)'
  const snow = theme.key === 'dark' ? 'rgba(225,246,250,0.5)' : 'rgba(255,255,255,0.9)'
  const crack = theme.key === 'dark' ? 'rgba(211,244,250,0.3)' : 'rgba(74,137,154,0.32)'
  const r = rng(`snow:${seed}`)
  const elements = floes.map((floe, index) => {
    const path = smoothIcePath(floe, seed, index)
    const snowPatches = Array.from({ length: index === 1 ? 4 : 3 }, () => {
      const x = (r() - 0.5) * floe.rx * 0.95
      const y = (r() - 0.5) * floe.ry * 0.8
      const rx = 7 + r() * 12
      const ry = 2.8 + r() * 4
      return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${snow}" opacity="${f1(0.42 + r() * 0.32)}"/>`
    }).join('')
    const tracks = turtleTracks && index === 1 ? snowTracks(floe) : ''
    return (
      `<g data-ice-floe="${index}" transform="translate(${f1(floe.x)} ${f1(floe.y)}) rotate(${f1(floe.rotation)})">` +
      `<path d="${path}" transform="translate(2.5 3.5)" fill="rgba(0,25,35,0.18)"/>` +
      `<path d="${path}" fill="${fill}" stroke="${rim}" stroke-width="1.5"/>` +
      `<g class="ice-glint">${snowPatches}</g>` +
      tracks +
      `<path d="M-${f1(floe.rx * 0.16)} -2 L-${f1(floe.rx * 0.02)} 2 L${f1(floe.rx * 0.08)} -1 M-${f1(floe.rx * 0.02)} 2 L${f1(floe.rx * 0.05)} 7" fill="none" stroke="${crack}" stroke-width="0.9" stroke-linecap="round"/>` +
      `</g>`
    )
  }).join('')
  return `<g data-seasonal-part="winter-ice" opacity="${f1(visibleCoverage * 0.96)}">${elements}</g>`
}

export function lotus(x: number, theme: Theme, r: () => number): string {
  const y = 24 + r() * 6
  let petals = ''
  for (let k = 0; k < 8; k++) {
    petals += `<ellipse rx="7" ry="2.9" transform="rotate(${k * 45})" fill="${theme.lotusOuter}"/>`
  }
  let inner = ''
  for (let k = 0; k < 5; k++) {
    inner += `<ellipse rx="4.6" ry="2" transform="rotate(${22 + k * 72})" fill="${theme.lotusInner}"/>`
  }
  return (
    `<g transform="translate(${f1(x)} ${f1(y)})">` +
    `<ellipse cx="2.5" cy="3.5" rx="13" ry="12" fill="rgba(0,20,25,0.2)"/>` +
    `<circle r="12.5" fill="${theme.lily}" opacity="0.9"/>` +
    `<circle r="12.5" fill="none" stroke="${theme.lilyLight}" stroke-width="1.4" opacity="0.8"/>` +
    `<g class="bloom">${petals}${inner}<circle r="2.3" fill="${theme.lotusHeart}"/></g>` +
    `</g>`
  )
}

export function pebbles(theme: Theme, r: () => number): string {
  let out = ''
  const cx = 46 + r() * 20
  const cy = LAYOUT.height - 22
  for (let i = 0; i < 5; i++) {
    const x = f1(cx + (r() - 0.3) * 42)
    const y = f1(cy + (r() - 0.5) * 14)
    const rad = f1(2.6 + r() * 3.2)
    out += `<circle cx="${x}" cy="${y}" r="${rad}" fill="${theme.pebbles[i % theme.pebbles.length]}" opacity="0.85"/>`
    out += `<circle cx="${f1(x - rad * 0.3)}" cy="${f1(y - rad * 0.35)}" r="${f1(rad * 0.4)}" fill="${theme.sheen}" opacity="0.35"/>`
  }
  return out
}

export function motes(width: number, theme: Theme, r: () => number, count = 8): string {
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = f1(30 + r() * (width - 60))
    const y = f1(30 + r() * (LAYOUT.height - 70))
    out += `<circle class="mo" style="animation-duration:${f1(8 + r() * 7)}s;animation-delay:-${f1(r() * 12)}s" cx="${x}" cy="${y}" r="${f1(0.8 + r() * 0.9)}" fill="${theme.mote}"/>`
  }
  return out
}

export function ambientRipples(width: number, theme: Theme, r: () => number, count = 3): string {
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = f1(50 + r() * (width - 100))
    const y = f1(30 + r() * (LAYOUT.height - 70))
    out += `<circle class="ar" style="animation-delay:-${f1(r() * 9)}s" cx="${x}" cy="${y}" r="9" fill="none" stroke="${theme.ripple}" stroke-width="1"/>`
  }
  return out
}

export function turtle(theme: Theme): string {
  const flipper = (name: string, x: number, y: number, deg: number, delay: number) =>
    `<g transform="rotate(${deg} ${x} ${y})"><g class="paddle-phase ${name}"><ellipse class="paddle" style="animation-delay:${delay}s" cx="${x}" cy="${y}" rx="4.4" ry="1.9" fill="${theme.turtleSkin}"/></g></g>`
  return (
    `<g class="turtle">` +
    `<ellipse class="turtle-shadow" cx="2.5" cy="4" rx="11.5" ry="10" fill="rgba(0,20,25,0.2)"/>` +
    `<g class="turtle-body">` +
    flipper('paddle-front-left', -7, -8, -38, 0) +
    flipper('paddle-rear-left', -7, 8, 38, -0.65) +
    flipper('paddle-front-right', 6, -8.5, 32, -0.65) +
    flipper('paddle-rear-right', 6, 8.5, -32, 0) +
    `<ellipse cx="-11.5" cy="0" rx="2.2" ry="1.6" fill="${theme.turtleSkin}"/>` +
    `<circle cx="12.5" cy="0" r="3.4" fill="${theme.turtleSkin}"/>` +
    `<circle r="10" fill="${theme.turtleShell}"/>` +
    `<circle r="6.6" fill="none" stroke="${theme.turtleRing}" stroke-width="1.1"/>` +
    `<path d="M0 -6.6 V6.6 M-5.7 -3.3 L5.7 3.3 M-5.7 3.3 L5.7 -3.3" stroke="${theme.turtleRing}" stroke-width="1.1"/>` +
    `<path d="M-3.5 -8.6 A9.2 9.2 0 0 1 5 -7.8" fill="none" stroke="${theme.sheen}" stroke-width="1.3" opacity="0.4" stroke-linecap="round"/>` +
    `<circle cx="13.4" cy="-1.2" r="0.7" fill="#10222c"/><circle cx="13.4" cy="1.2" r="0.7" fill="#10222c"/>` +
    `</g></g>`
  )
}
