import { LAYOUT } from '../layout'
import { f1 } from '../util'
import type { Theme } from './palette'

export function floorBlotches(width: number, theme: Theme, r: () => number): string {
  let out = ''
  for (let i = 0; i < 3; i++) {
    const x = f1(width * (0.15 + r() * 0.7))
    const y = f1(30 + r() * (LAYOUT.height - 60))
    out += `<ellipse cx="${x}" cy="${y}" rx="${f1(70 + r() * 90)}" ry="${f1(26 + r() * 22)}" fill="${theme.floorBlotch}" opacity="0.15"/>`
  }
  return out
}

export function caustics(width: number, theme: Theme): string {
  if (!theme.caustics) return ''
  let out = ''
  const spots = [
    [width * 0.22, 46, 150, 44],
    [width * 0.58, 120, 190, 52],
    [width * 0.86, 60, 130, 40],
  ]
  spots.forEach(([x, y, rx, ry], i) => {
    out += `<ellipse class="ca" style="animation-delay:-${(i * 4.1).toFixed(1)}s" cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="#ffffff"/>`
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
  return (
    `<g transform="translate(${f1(x)} ${f1(y)})">` +
    `<ellipse cx="2.5" cy="3.5" rx="${f1(radius)}" ry="${f1(radius * 0.92)}" fill="rgba(0,20,25,0.18)"/>` +
    `<g class="sway" style="animation-duration:${dur}s">` +
    `<path d="M${x1} ${y1} A${radius} ${radius} 0 1 0 ${x2} ${y2} L0 0 Z" fill="${theme.lily}"/>${veins}` +
    `</g></g>`
  )
}

export function lilyPads(width: number, theme: Theme, r: () => number): string {
  const spots: [number, number, number][] = [
    [46 + r() * 14, 22 + r() * 8, 12 + r() * 3],
    [78 + r() * 10, 40 + r() * 8, 8 + r() * 2.5],
    [width - 58 - r() * 12, LAYOUT.height - 32 - r() * 8, 13 + r() * 3],
    [width - 96 - r() * 10, LAYOUT.height - 52, 7.5 + r() * 2],
  ]
  return spots.map(([x, y, rad], i) => lilyPad(x, y, rad, r() * 360, theme, f1(5.5 + i * 0.9 + r() * 2))).join('')
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
    `<ellipse cx="2.5" cy="3.5" rx="13" ry="12" fill="rgba(0,20,25,0.18)"/>` +
    `<circle r="12.5" fill="${theme.lily}" opacity="0.9"/>` +
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
    out += `<circle cx="${x}" cy="${y}" r="${f1(2.6 + r() * 3.2)}" fill="${theme.pebbles[i % theme.pebbles.length]}" opacity="0.85"/>`
  }
  return out
}

export function motes(width: number, theme: Theme, r: () => number): string {
  let out = ''
  for (let i = 0; i < 6; i++) {
    const x = f1(30 + r() * (width - 60))
    const y = f1(30 + r() * (LAYOUT.height - 70))
    out += `<circle class="mo" style="animation-duration:${f1(8 + r() * 7)}s;animation-delay:-${f1(r() * 12)}s" cx="${x}" cy="${y}" r="${f1(0.9 + r() * 0.8)}" fill="${theme.mote}"/>`
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
    `<ellipse cx="2.5" cy="4" rx="11.5" ry="10" fill="rgba(0,20,25,0.18)"/>` +
    flipper(-7, -8, -38, 0) +
    flipper(-7, 8, 38, -0.65) +
    flipper(6, -8.5, 32, -0.65) +
    flipper(6, 8.5, -32, 0) +
    `<ellipse cx="-11.5" cy="0" rx="2.2" ry="1.6" fill="${theme.turtleSkin}"/>` +
    `<circle cx="12.5" cy="0" r="3.4" fill="${theme.turtleSkin}"/>` +
    `<circle r="10" fill="${theme.turtleShell}"/>` +
    `<circle r="6.6" fill="none" stroke="${theme.turtleRing}" stroke-width="1.1"/>` +
    `<path d="M0 -6.6 V6.6 M-5.7 -3.3 L5.7 3.3 M-5.7 3.3 L5.7 -3.3" stroke="${theme.turtleRing}" stroke-width="1.1"/>` +
    `<circle cx="13.4" cy="-1.2" r="0.7" fill="#10222c"/><circle cx="13.4" cy="1.2" r="0.7" fill="#10222c"/>` +
    `</g>`
  )
}
