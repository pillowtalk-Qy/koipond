import { LAYOUT } from '../layout'
import { lilyPadLayout } from '../ecology'
import { f1 } from '../util'
import type { PondEnvironment } from '../environment'
import type { Theme } from './palette'

/** Shared soft-blur filter used by caustics, god rays and the surface sheen. */
export const SOFT_FILTER =
  `<filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>`

export function floorBlotches(width: number, r: () => number): string {
  let out = ''
  for (let i = 0; i < 4; i++) {
    const x = f1(width * (0.12 + r() * 0.76))
    const y = f1(30 + r() * (LAYOUT.height - 60))
    const duration = f1(16 + r() * 9)
    const delay = f1(r() * 14)
    out += `<ellipse class="floor" style="animation-duration:${duration}s;animation-delay:-${delay}s" cx="${x}" cy="${y}" rx="${f1(76 + r() * 96)}" ry="${f1(28 + r() * 25)}" fill="url(#floorG)" filter="url(#soft)"/>`
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
export function godRays(width: number, theme: Theme, r: () => number): string {
  if (!theme.ray) return ''
  let out = ''
  const n = 3
  for (let i = 0; i < n; i++) {
    const xTop = width * (0.14 + (i / (n - 1)) * 0.62) + (r() - 0.5) * width * 0.08
    const wTop = 26 + r() * 30
    const spread = wTop * (2.6 + r() * 1.2)
    const lean = 40 + r() * 50
    const d =
      `M${f1(xTop)} -4 L${f1(xTop + wTop)} -4 ` +
      `L${f1(xTop + wTop + lean + spread / 2)} ${LAYOUT.height} L${f1(xTop + lean - spread / 2)} ${LAYOUT.height} Z`
    out += `<path class="ray" style="animation-delay:-${f1(i * 3.7 + r() * 2)}s" d="${d}" fill="${theme.ray}" filter="url(#soft)"/>`
  }
  return out
}

/** Bright band along the top edge so the water reads as a surface seen from above. */
export function surfaceSheen(width: number, theme: Theme): string {
  return (
    `<rect width="${width}" height="34" fill="url(#sheenG)"/>` +
    `<rect width="${width}" height="2.5" fill="${theme.sheen}" opacity="${theme.key === 'dark' ? 0.5 : 0.75}"/>`
  )
}

/** Darkening toward the bottom for depth. */
export function deepShade(width: number, theme: Theme): string {
  const height = theme.key === 'light' ? 56 : 74
  return `<rect y="${LAYOUT.height - height}" width="${width}" height="${height}" fill="url(#deepG)"/>`
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
    `<g transform="translate(${f1(x)} ${f1(y)})">` +
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

export function seasonalDetails(
  width: number,
  theme: Theme,
  environment: PondEnvironment,
  seed: string,
  r: () => number,
): string {
  const pads = lilyPadLayout(width, seed)
  const spring = pads.slice(0, 3).map((pad, index) => {
    const x = f1(pad.x + pad.radius * (0.35 + index * 0.08))
    const y = f1(pad.y - pad.radius * 0.25)
    return `<g transform="translate(${x} ${y})"><ellipse rx="${f1(2.6 + index * 0.3)}" ry="${f1(4.2 + index * 0.4)}" fill="${theme.lotusOuter}" transform="rotate(${index * 28 - 24})"/><circle r="1.1" fill="${theme.lotusHeart}"/></g>`
  }).join('')

  const summer = pads.slice(2, 5).map((pad, index) => {
    const x = f1(pad.x - pad.radius * 0.2)
    const y = f1(pad.y + pad.radius * 0.15)
    let petals = ''
    for (let petal = 0; petal < 5; petal++) {
      petals += `<ellipse rx="3.2" ry="1.25" transform="rotate(${petal * 72})" fill="${theme.lotusInner}"/>`
    }
    return `<g class="bloom" style="animation-delay:-${index * 1.3}s" transform="translate(${x} ${y})">${petals}<circle r="1.2" fill="${theme.lotusHeart}"/></g>`
  }).join('')

  let autumn = ''
  for (let index = 0; index < 9; index++) {
    const x = f1(26 + r() * (width - 52))
    const y = f1(20 + r() * (LAYOUT.height - 40))
    const size = f1(2.8 + r() * 3.2)
    autumn +=
      `<g class="leaf" style="animation-duration:${f1(10 + r() * 8)}s;animation-delay:-${f1(r() * 9)}s" transform="translate(${x} ${y}) rotate(${f1(r() * 360)})">` +
      `<path d="M-${size} 0 Q0 -${f1(size * 0.72)} ${size} 0 Q0 ${f1(size * 0.72)} -${size} 0Z" fill="${index % 3 === 0 ? theme.lotusOuter : theme.lily}"/>` +
      `<path d="M-${f1(size * 0.7)} 0 H${f1(size * 0.7)}" stroke="${theme.lilyVein}" stroke-width="0.7"/>` +
      `</g>`
  }

  let winter = ''
  for (let index = 0; index < 6; index++) {
    const x = f1(34 + r() * (width - 68))
    const y = f1(7 + r() * 32)
    winter += `<path d="M${x} ${y} l${f1(-13 + r() * 26)} ${f1(8 + r() * 11)} l${f1(-10 + r() * 20)} ${f1(6 + r() * 9)}" fill="none" stroke="${theme.sheen}" stroke-width="0.8" opacity="0.7"/>`
  }

  return (
    `<g aria-label="spring pond growth" opacity="${f1(environment.seasonWeights.spring * 0.82)}">${spring}</g>` +
    `<g aria-label="summer pond bloom" opacity="${f1(environment.seasonWeights.summer * 0.72)}">${summer}</g>` +
    `<g aria-label="autumn floating leaves" opacity="${f1(environment.autumnLeaves * 0.82)}">${autumn}</g>` +
    `<g aria-label="winter surface ice" opacity="${f1(environment.winterStillness * 0.62)}">${winter}</g>`
  )
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

export function motes(width: number, theme: Theme, r: () => number): string {
  let out = ''
  for (let i = 0; i < 8; i++) {
    const x = f1(30 + r() * (width - 60))
    const y = f1(30 + r() * (LAYOUT.height - 70))
    out += `<circle class="mo" style="animation-duration:${f1(8 + r() * 7)}s;animation-delay:-${f1(r() * 12)}s" cx="${x}" cy="${y}" r="${f1(0.8 + r() * 0.9)}" fill="${theme.mote}"/>`
  }
  return out
}

export function ambientRipples(width: number, theme: Theme, r: () => number): string {
  let out = ''
  for (let i = 0; i < 3; i++) {
    const x = f1(50 + r() * (width - 100))
    const y = f1(30 + r() * (LAYOUT.height - 70))
    out += `<circle class="ar" style="animation-delay:-${f1(r() * 9)}s" cx="${x}" cy="${y}" r="9" fill="none" stroke="${theme.ripple}" stroke-width="1"/>`
  }
  return out
}

export function turtle(theme: Theme): string {
  const flipper = (x: number, y: number, deg: number, delay: number) =>
    `<g transform="rotate(${deg} ${x} ${y})"><ellipse class="paddle" style="animation-delay:${delay}s" cx="${x}" cy="${y}" rx="4.4" ry="1.9" fill="${theme.turtleSkin}"/></g>`
  return (
    `<g class="turtle">` +
    `<ellipse cx="2.5" cy="4" rx="11.5" ry="10" fill="rgba(0,20,25,0.2)"/>` +
    flipper(-7, -8, -38, 0) +
    flipper(-7, 8, 38, -0.65) +
    flipper(6, -8.5, 32, -0.65) +
    flipper(6, 8.5, -32, 0) +
    `<ellipse cx="-11.5" cy="0" rx="2.2" ry="1.6" fill="${theme.turtleSkin}"/>` +
    `<circle cx="12.5" cy="0" r="3.4" fill="${theme.turtleSkin}"/>` +
    `<circle r="10" fill="${theme.turtleShell}"/>` +
    `<circle r="6.6" fill="none" stroke="${theme.turtleRing}" stroke-width="1.1"/>` +
    `<path d="M0 -6.6 V6.6 M-5.7 -3.3 L5.7 3.3 M-5.7 3.3 L5.7 -3.3" stroke="${theme.turtleRing}" stroke-width="1.1"/>` +
    `<path d="M-3.5 -8.6 A9.2 9.2 0 0 1 5 -7.8" fill="none" stroke="${theme.sheen}" stroke-width="1.3" opacity="0.4" stroke-linecap="round"/>` +
    `<circle cx="13.4" cy="-1.2" r="0.7" fill="#10222c"/><circle cx="13.4" cy="1.2" r="0.7" fill="#10222c"/>` +
    `</g>`
  )
}
