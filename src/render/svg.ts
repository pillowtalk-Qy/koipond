import { LAYOUT, cellCenter, svgWidth } from '../layout'
import { longestGap, longestStreak } from '../planner'
import { rng } from '../prng'
import type { Grid, Plan, Waypoint } from '../types'
import {
  SOFT_FILTER,
  ambientRipples,
  caustics,
  deepShade,
  floorBlotches,
  godRays,
  lilyPads,
  lotus,
  motes,
  pebbles,
  surfaceSheen,
  turtle,
} from './decor'
import { fishSVG } from './fish'
import type { Theme } from './palette'

const PLANKTON_R = [0, 2.1, 2.8, 3.5, 4.2]
const TURTLE_STREAK = 30
const LOTUS_GAP = 21

export interface RenderMeta {
  plankton: number
  fish: number
  duration: number
  turtle: boolean
  lotus: boolean
  bytes: number
}

const pct = (t: number, duration: number) => ((t / duration) * 100).toFixed(2)

const bucketOf = (t: number, duration: number) => {
  const b = Math.round((t / duration) * 200) / 2
  return Math.min(90, Math.max(0.5, b))
}
const bucketId = (b: number) => b.toFixed(1).replace('.', '_')

function fishKeyframes(plan: Plan): string {
  let css = ''
  for (const f of plan.fishes) {
    const wps = f.waypoints.map(wp => ({ ...wp }))
    for (let pass = 0; pass < 2; pass++) {
      const src = wps.map(wp => ({ x: wp.x, y: wp.y }))
      for (let i = 1; i < wps.length - 1; i++) {
        wps[i].x = (src[i - 1].x + 2 * src[i].x + src[i + 1].x) / 4
        wps[i].y = (src[i - 1].y + 2 * src[i].y + src[i + 1].y) / 4
      }
    }

    const kept: Waypoint[] = []
    let lastKept: Waypoint | null = null
    let lastHeading: number | null = null
    wps.forEach((wp, i) => {
      if (i === 0 || i === wps.length - 1) {
        kept.push(wp)
        lastKept = wp
        lastHeading = null
        return
      }
      const prev = wps[i - 1]
      const heading = Math.atan2(wp.y - prev.y, wp.x - prev.x)
      let turn = lastHeading === null ? Infinity : Math.abs(heading - lastHeading)
      if (turn > Math.PI) turn = Math.PI * 2 - turn
      if (turn > 0.04 || wp.t - (lastKept as Waypoint).t > 0.3) {
        kept.push(wp)
        lastKept = wp
        lastHeading = heading
      }
    })

    const entries: string[] = []
    let lastPct = -1
    kept.forEach(wp => {
      const p = pct(wp.t, plan.duration)
      if (Number(p) <= lastPct || Number(p) >= 100) return
      lastPct = Number(p)
      entries.push(`${p}%{transform:translate(${wp.x.toFixed(1)}px,${wp.y.toFixed(1)}px)}`)
    })
    const home = wps[wps.length - 1]
    entries.push(`100%{transform:translate(${home.x.toFixed(1)}px,${home.y.toFixed(1)}px)}`)

    css += `@keyframes fp${f.id}{${entries.join('')}}.f${f.id}{animation:fp${f.id} ${plan.duration}s linear infinite}`
  }
  return css
}

export function renderSVG(grid: Grid, plan: Plan, theme: Theme, seed: string): { svg: string; meta: RenderMeta } {
  const width = svgWidth(grid.weeks)
  const { duration } = plan
  const r = rng('decor:' + seed)

  const eatByCell = new Map(plan.eats.map(e => [e.cell, e]))

  const eatBuckets = new Set<string>()
  let planktonEls = ''
  let rippleEls = ''
  for (const c of grid.cells) {
    if (c.level === 0) continue
    const { x, y } = cellCenter(c.week, c.day)
    const eat = eatByCell.get(c.week * 7 + c.day)
    const id = eat ? bucketId(bucketOf(eat.t, duration)) : null
    if (id) eatBuckets.add(id)
    const cls = id ? `pk e${id}` : 'pk'
    const rad = PLANKTON_R[c.level]
    const fill = theme.plankton[c.level - 1]
    const twinkle = theme.halo
      ? `<circle class="tw" style="animation-delay:-${((c.week * 7 + c.day) % 9) * 0.45}s" cx="${x}" cy="${y}" r="${(rad * 1.8).toFixed(1)}" fill="${theme.halo}" opacity="0.14"/>`
      : ''
    planktonEls +=
      `<g class="${cls}">` +
      `<circle cx="${x}" cy="${y}" r="${(rad * 2.3).toFixed(1)}" fill="url(#pkg${c.level})"/>` +
      twinkle +
      `<circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}"/>` +
      `</g>`
    if (id) {
      rippleEls += `<circle class="rp r${id}" cx="${x}" cy="${y}" r="5" fill="none" stroke="${theme.ripple}" stroke-width="1.2"/>`
    }
  }

  let bucketCSS = ''
  for (const id of eatBuckets) {
    const b = parseFloat(id.replace('_', '.'))
    bucketCSS +=
      `@keyframes e${id}{0%,${b}%{transform:scale(1)}${(b + 0.7).toFixed(1)}%,95.5%{transform:scale(0)}99%,100%{transform:scale(1)}}` +
      `.e${id}{animation-name:e${id}}` +
      `@keyframes r${id}{0%,${b}%{transform:scale(0.35);opacity:0}${(b + 0.3).toFixed(2)}%{opacity:0.55}${(b + 3.2).toFixed(1)}%,100%{transform:scale(3.4);opacity:0}}` +
      `.r${id}{animation-name:r${id}}`
  }

  const streak = longestStreak(grid)
  const gap = longestGap(grid)
  const hasTurtle = streak >= TURTLE_STREAK
  const hasLotus = gap.len >= LOTUS_GAP
  const turtleY = LAYOUT.height - 26
  const lotusX = Math.min(Math.max(LAYOUT.padX + gap.centerWeek * LAYOUT.cell, 34), width - 34)

  const base = `
.pk,.rp{transform-box:fill-box;transform-origin:center;animation-duration:${duration}s;animation-timing-function:linear;animation-iteration-count:infinite}
.rp{opacity:0}
.pt{transform-box:fill-box;transform-origin:center;animation:pec 1.05s ease-in-out infinite}
.pb{transform-box:fill-box;transform-origin:center;animation:pec 1.05s ease-in-out infinite reverse}
.tf{transform-box:fill-box;transform-origin:center;animation:tfk .6s ease-in-out infinite}
@keyframes pec{0%,100%{transform:rotate(14deg)}50%{transform:rotate(-12deg)}}
@keyframes tfk{0%,100%{transform:rotate(26deg)}50%{transform:rotate(-26deg)}}
.tw{animation:tw 3.6s ease-in-out infinite alternate}
.ray{animation:ray 9.5s ease-in-out infinite alternate}
.sway{transform-box:fill-box;transform-origin:center;animation-name:sway;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.bloom{transform-box:fill-box;transform-origin:center;animation:bloom 5.2s ease-in-out infinite alternate}
.paddle{transform-box:fill-box;transform-origin:center;animation:paddle 1.4s ease-in-out infinite alternate}
.ca{opacity:0.07;animation:ca 15s ease-in-out infinite alternate}
.mo{opacity:0;animation-name:mo;animation-timing-function:linear;animation-iteration-count:infinite}
.ar{transform-box:fill-box;transform-origin:center;opacity:0;animation:ar 9s linear infinite}
.turtle{animation:turtle ${duration}s linear infinite}
.night{opacity:0;animation:night ${duration}s linear infinite}
@keyframes tw{from{opacity:0.06}to{opacity:0.26}}
@keyframes ray{from{opacity:0.07}to{opacity:0.2}}
@keyframes sway{from{transform:rotate(-2.4deg)}to{transform:rotate(2.6deg)}}
@keyframes bloom{from{transform:scale(1)}to{transform:scale(1.07)}}
@keyframes paddle{from{transform:rotate(14deg)}to{transform:rotate(-14deg)}}
@keyframes ca{from{transform:translate(-26px,0)}to{transform:translate(26px,9px)}}
@keyframes mo{0%{transform:translate(0,0);opacity:0}15%{opacity:0.55}85%{opacity:0.4}100%{transform:translate(14px,-26px);opacity:0}}
@keyframes ar{0%{transform:scale(0.2);opacity:0}6%{opacity:0.22}26%,100%{transform:scale(3.6);opacity:0}}
@keyframes turtle{0%{transform:translate(-40px,${turtleY}px)}100%{transform:translate(${width + 40}px,${turtleY}px)}}
@keyframes night{0%,91%{opacity:0}95%,97.5%{opacity:${theme.night}}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`

  const css = base + bucketCSS + fishKeyframes(plan)

  const planktonGlow = theme.plankton
    .map(
      (color, i) =>
        `<radialGradient id="pkg${i + 1}">` +
        `<stop offset="0" stop-color="${color}" stop-opacity="0.9"/>` +
        `<stop offset="0.45" stop-color="${color}" stop-opacity="0.32"/>` +
        `<stop offset="1" stop-color="${color}" stop-opacity="0"/>` +
        `</radialGradient>`,
    )
    .join('')

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${LAYOUT.height}" width="${width}" height="${LAYOUT.height}">` +
    `<title>Contribution koi pond: ${plan.eats.length} plankton grazed by ${plan.fishes.length} fish</title>` +
    `<style>${css}</style>` +
    `<defs>` +
    `<linearGradient id="water" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${theme.waterTop}"/>` +
    `<stop offset="0.55" stop-color="${theme.waterMid}"/>` +
    `<stop offset="1" stop-color="${theme.waterBottom}"/>` +
    `</linearGradient>` +
    `<linearGradient id="sheenG" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${theme.sheen}"/><stop offset="1" stop-color="${theme.sheen}" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<linearGradient id="deepG" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${theme.deep}" stop-opacity="0"/><stop offset="1" stop-color="${theme.deep}"/>` +
    `</linearGradient>` +
    `<radialGradient id="vig" cx="0.5" cy="0.5" r="0.72">` +
    `<stop offset="0.55" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="${theme.vignette}"/>` +
    `</radialGradient>` +
    planktonGlow +
    SOFT_FILTER +
    theme.fishFilter +
    `</defs>` +
    `<rect width="${width}" height="${LAYOUT.height}" rx="10" fill="url(#water)"/>` +
    floorBlotches(width, theme, r) +
    deepShade(width) +
    caustics(width, theme) +
    godRays(width, theme, r) +
    `<g>${planktonEls}</g>` +
    `<g>${rippleEls}</g>` +
    pebbles(theme, r) +
    `<rect width="${width}" height="${LAYOUT.height}" rx="10" fill="url(#vig)"/>` +
    surfaceSheen(width, theme) +
    lilyPads(width, theme, r) +
    (hasLotus ? lotus(lotusX, theme, r) : '') +
    (hasTurtle ? turtle(theme) : '') +
    plan.fishes.map(f => `<g>${fishSVG(f, theme, seed)}</g>`).join('') +
    ambientRipples(width, theme, r) +
    motes(width, theme, r) +
    `<rect class="night" width="${width}" height="${LAYOUT.height}" rx="10" fill="#000d14"/>` +
    `</svg>`

  return {
    svg,
    meta: {
      plankton: plan.eats.length,
      fish: plan.fishes.length,
      duration: Math.round(duration * 10) / 10,
      turtle: hasTurtle,
      lotus: hasLotus,
      bytes: new TextEncoder().encode(svg).length,
    },
  }
}
