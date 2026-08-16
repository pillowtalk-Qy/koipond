import { LAYOUT, cellCenter, svgWidth } from '../layout'
import { lilyPadLayout } from '../ecology'
import type { PondEnvironment } from '../environment'
import { longestGap, longestStreak } from '../planner'
import { rng } from '../prng'
import type { PondProvenance } from '../state'
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
  seasonalDetails,
  surfaceSheen,
  turtle,
  waterCurrents,
} from './decor'
import { fishPointAt, fishStaticTrail, fishSVG } from './fish'
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

export interface RenderContext {
  provenance?: PondProvenance
  highlightedCells?: ReadonlySet<number>
  environment?: PondEnvironment
}

const pct = (t: number, duration: number) => ((t / duration) * 100).toFixed(2)

const bucketOf = (t: number, duration: number) => {
  const b = Math.round((t / duration) * 200) / 2
  return Math.min(90, Math.max(0.5, b))
}
const bucketId = (b: number) => b.toFixed(1).replace('.', '_')

function fishKeyframes(
  plan: Plan,
  animationDuration: number,
  highlightedCells?: ReadonlySet<number>,
): string {
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
      entries.push(
        `${p}%{transform:translate(${wp.x.toFixed(1)}px,${wp.y.toFixed(1)}px);opacity:${(0.92 + wp.satiety * 0.08).toFixed(3)}}`,
      )
    })
    const home = wps[wps.length - 1]
    entries.push(`100%{transform:translate(${home.x.toFixed(1)}px,${home.y.toFixed(1)}px);opacity:0.92}`)
    const auraEnergy = new Map<number, number>()
    for (const event of plan.eats) {
      if (event.fish !== f.id || (highlightedCells && !highlightedCells.has(event.cell))) continue
      const bucket = Math.min(90, Math.max(1, Math.round((event.t / plan.duration) * 100)))
      auraEnergy.set(bucket, Math.max(auraEnergy.get(bucket) ?? 0, event.energy))
    }
    const restingAura = Math.min(0.18, f.lifetimeEnergy / 900)
    const auraPoints = new Map<number, number>([
      [0, restingAura],
      [100, restingAura],
    ])
    for (const [bucket, energy] of auraEnergy) {
      auraPoints.set(Number((bucket - 0.18).toFixed(2)), restingAura)
      auraPoints.set(bucket, Math.max(restingAura, Math.min(0.42, 0.12 + energy * 0.04)))
      auraPoints.set(Number((bucket + 0.68).toFixed(2)), restingAura)
    }
    const auraEntries = [...auraPoints]
      .sort(([a], [b]) => a - b)
      .map(([point, opacity]) => `${point}%{opacity:${opacity.toFixed(2)}}`)

    css +=
      `@keyframes fp${f.id}{${entries.join('')}}.f${f.id}{animation:fp${f.id} ${animationDuration}s linear infinite}` +
      `@keyframes fa${f.id}{${auraEntries.join('')}}.a${f.id}{animation:fa${f.id} ${animationDuration}s linear infinite}`
  }
  return css
}

function bestStaticTime(plan: Plan, width: number, seed: string): number {
  const pads = lilyPadLayout(width, seed)
  let best = { score: -Infinity, time: plan.duration * 0.5 }

  for (let index = 0; index <= 72; index++) {
    const time = plan.duration * (0.08 + (index / 72) * 0.74)
    const trails = plan.fishes.map(fish => fishStaticTrail(fish, time, plan.duration))
    let score = 0

    trails.forEach((trail, fishIndex) => {
      for (const point of trail) {
        const edge = Math.min(point.x, width - point.x, point.y, LAYOUT.height - point.y)
        score += Math.min(42, edge) * 0.05
        for (const pad of pads) {
          const clearance = Math.hypot(point.x - pad.x, point.y - pad.y) - pad.radius
          score += clearance < 10 ? (clearance - 10) * 8 : Math.min(28, clearance) * 0.015
        }
      }
      const head = trail[0]
      score -= Math.abs(head.x - width * 0.5) * 0.003
      score -= Math.abs(head.y - LAYOUT.height * 0.52) * 0.012

      for (let otherIndex = fishIndex + 1; otherIndex < plan.fishes.length; otherIndex++) {
        const other = fishPointAt(plan.fishes[otherIndex], time, plan.duration)
        const separation = Math.hypot(head.x - other.x, head.y - other.y)
        if (separation < 38) score -= (38 - separation) * 3
      }
    })

    if (score > best.score) best = { score, time }
  }

  return best.time
}

const escapeXML = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

export function renderSVG(
  grid: Grid,
  plan: Plan,
  theme: Theme,
  seed: string,
  context: RenderContext = {},
): { svg: string; meta: RenderMeta } {
  const width = svgWidth(grid.weeks)
  const timelineDuration = plan.duration
  const animationDuration = context.environment
    ? timelineDuration / context.environment.activityRate
    : timelineDuration
  const staticTime = bestStaticTime(plan, width, seed)
  const r = rng('decor:' + seed)

  const eatByCell = new Map(plan.eats.map(e => [e.cell, e]))

  const eatBuckets = new Set<string>()
  let planktonEls = ''
  let rippleEls = ''
  for (const c of grid.cells) {
    if (c.level === 0) continue
    const { x, y } = cellCenter(c.week, c.day)
    const eat = eatByCell.get(c.week * 7 + c.day)
    const highlighted = context.highlightedCells ? context.highlightedCells.has(c.week * 7 + c.day) : true
    const id = eat ? bucketId(bucketOf(eat.t, timelineDuration)) : null
    if (id) eatBuckets.add(id)
    const cls = id ? `pk e${id}` : 'pk'
    const rad = PLANKTON_R[c.level]
    const fill = theme.plankton[c.level - 1]
    const twinkle = theme.halo && c.level >= 3
      ? `<circle class="tw" style="animation-delay:-${((c.week * 7 + c.day) % 9) * 0.45}s" cx="${x}" cy="${y}" r="${(rad * 1.8).toFixed(1)}" fill="${theme.halo}" opacity="0.14"/>`
      : ''
    planktonEls +=
      `<g class="${cls}">` +
      `<circle cx="${x}" cy="${y}" r="${(rad * 2.3).toFixed(1)}" fill="url(#pkg${c.level})"/>` +
      twinkle +
      `<circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}"/>` +
      `</g>`
    if (id && eat) {
      const rippleRadius = 4.4 + eat.energy * 0.22 + (highlighted ? 0.8 : 0)
      const rippleWidth = (1 + eat.energy * 0.08) * (highlighted ? 1.35 : 1)
      rippleEls += `<circle class="rp r${id}${highlighted ? ' fresh' : ''}" cx="${x}" cy="${y}" r="${rippleRadius.toFixed(1)}" fill="none" stroke="${theme.ripple}" stroke-width="${rippleWidth.toFixed(1)}"/>`
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
.pk,.rp{transform-box:fill-box;transform-origin:center;animation-duration:${animationDuration}s;animation-timing-function:linear;animation-iteration-count:infinite}
.rp{opacity:0}
.pt{transform-box:fill-box;transform-origin:center;animation:pec 1.05s ease-in-out infinite}
.pb{transform-box:fill-box;transform-origin:center;animation:pec 1.05s ease-in-out infinite reverse}
.tf{transform-box:fill-box;transform-origin:center;animation:tfk .6s ease-in-out infinite}
@keyframes pec{0%,100%{transform:rotate(14deg)}50%{transform:rotate(-12deg)}}
@keyframes tfk{0%,100%{transform:rotate(26deg)}50%{transform:rotate(-26deg)}}
.tw{animation:tw 3.6s ease-in-out infinite alternate}
.ray{opacity:0.12;animation:ray 9.5s ease-in-out infinite alternate}
.sway{transform-box:fill-box;transform-origin:center;animation-name:sway;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.bloom{transform-box:fill-box;transform-origin:center;animation:bloom 5.2s ease-in-out infinite alternate}
.paddle{transform-box:fill-box;transform-origin:center;animation:paddle 1.4s ease-in-out infinite alternate}
.ca{opacity:0.07;animation:ca 15s ease-in-out infinite alternate}
.floor{transform-box:fill-box;transform-origin:center;animation-name:floor;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.current{opacity:${theme.key === 'light' ? 0.12 : 0.055};animation:current 19s ease-in-out infinite alternate}
.mo{opacity:0;animation-name:mo;animation-timing-function:linear;animation-iteration-count:infinite}
.ar{transform-box:fill-box;transform-origin:center;opacity:0;animation:ar 9s linear infinite}
.leaf{transform-box:fill-box;transform-origin:center;animation-name:leaf;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.turtle{transform:translate(${(width * 0.58).toFixed(1)}px,${turtleY}px);animation:turtle ${animationDuration}s linear infinite}
.night{opacity:0;animation:night ${animationDuration}s linear infinite}
@keyframes tw{from{opacity:0.06}to{opacity:0.26}}
@keyframes ray{from{opacity:0.07}to{opacity:0.2}}
@keyframes sway{from{transform:rotate(-2.4deg)}to{transform:rotate(2.6deg)}}
@keyframes bloom{from{transform:scale(1)}to{transform:scale(1.07)}}
@keyframes paddle{from{transform:rotate(14deg)}to{transform:rotate(-14deg)}}
@keyframes ca{from{transform:translate(-26px,0)}to{transform:translate(26px,9px)}}
@keyframes floor{from{transform:translate(-9px,-2px) scale(0.98);opacity:0.78}to{transform:translate(11px,4px) scale(1.04);opacity:1}}
@keyframes current{from{transform:translateX(-22px);opacity:${theme.key === 'light' ? 0.07 : 0.035}}to{transform:translateX(24px);opacity:${theme.key === 'light' ? 0.14 : 0.07}}}
@keyframes mo{0%{transform:translate(0,0);opacity:0}15%{opacity:0.55}85%{opacity:0.4}100%{transform:translate(14px,-26px);opacity:0}}
@keyframes ar{0%{transform:scale(0.2);opacity:0}6%{opacity:0.22}26%,100%{transform:scale(3.6);opacity:0}}
@keyframes leaf{from{transform:translate(-3px,-1px) rotate(-8deg)}to{transform:translate(4px,2px) rotate(11deg)}}
@keyframes turtle{0%{transform:translate(-40px,${turtleY}px)}100%{transform:translate(${width + 40}px,${turtleY}px)}}
@keyframes night{0%,91%{opacity:0}95%,97.5%{opacity:${theme.night}}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.rp,.tw,.mo,.ar,.night{opacity:0!important}.floor{opacity:0.9}.current{opacity:${theme.key === 'light' ? 0.1 : 0.05}}.ca{opacity:0.07}.ray{opacity:0.12}}
`

  const css = base + bucketCSS + fishKeyframes(plan, animationDuration, context.highlightedCells)

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

  const owner = context.provenance?.owner
  const provenance = context.provenance
    ? `<metadata id="koipond-provenance">${escapeXML(JSON.stringify(context.provenance))}</metadata>`
    : ''
  const environmentMeta = context.environment
    ? `<metadata id="koipond-environment">${escapeXML(JSON.stringify(context.environment))}</metadata>`
    : ''
  const lotusPresence = context.environment
    ? Math.min(
        1,
        context.environment.seasonWeights.spring * 0.8 +
          context.environment.seasonWeights.summer +
          context.environment.seasonWeights.autumn * 0.25 +
          context.environment.seasonWeights.winter * 0.05,
      )
    : 1
  const turtlePresence = context.environment ? 1 - context.environment.winterStillness * 0.55 : 1
  const fishPresence = context.environment ? 1 - context.environment.winterStillness * 0.12 : 1
  const environmentDescription = context.environment
    ? ` It is ${context.environment.phase} in ${context.environment.season}.`
    : ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${LAYOUT.height}" width="${width}" height="${LAYOUT.height}" role="img" aria-labelledby="kp-title-${theme.key} kp-desc-${theme.key}">` +
    `<title id="kp-title-${theme.key}">${owner ? `${escapeXML(owner)}'s ` : ''}Contribution koi pond</title>` +
    `<desc id="kp-desc-${theme.key}">${plan.eats.length} contribution plankton grazed by ${plan.fishes.length} fish in a deterministic animated ecosystem${context.provenance ? `, cryptographically linked at revision ${context.provenance.revision}` : ''}.${environmentDescription}</desc>` +
    provenance +
    environmentMeta +
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
    `<radialGradient id="floorG" cx="0.5" cy="0.5" r="0.5">` +
    `<stop offset="0" stop-color="${theme.floorBlotch}" stop-opacity="${theme.key === 'light' ? 0.2 : 0.13}"/>` +
    `<stop offset="0.58" stop-color="${theme.floorBlotch}" stop-opacity="${theme.key === 'light' ? 0.1 : 0.065}"/>` +
    `<stop offset="1" stop-color="${theme.floorBlotch}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<radialGradient id="vig" cx="0.5" cy="0.5" r="0.72">` +
    `<stop offset="0.55" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="${theme.vignette}"/>` +
    `</radialGradient>` +
    planktonGlow +
    SOFT_FILTER +
    theme.fishFilter +
    `</defs>` +
    `<rect width="${width}" height="${LAYOUT.height}" rx="10" fill="url(#water)"/>` +
    floorBlotches(width, r) +
    waterCurrents(width, theme, r) +
    deepShade(width, theme) +
    caustics(width, theme) +
    godRays(width, theme, r) +
    `<g>${planktonEls}</g>` +
    `<g>${rippleEls}</g>` +
    pebbles(theme, r) +
    (context.environment ? seasonalDetails(width, theme, context.environment, seed, r) : '') +
    `<rect width="${width}" height="${LAYOUT.height}" rx="10" fill="url(#vig)"/>` +
    surfaceSheen(width, theme) +
    lilyPads(width, theme, seed, context.environment?.plantCoverage ?? 1) +
    (hasLotus ? `<g opacity="${lotusPresence.toFixed(3)}">${lotus(lotusX, theme, r)}</g>` : '') +
    (hasTurtle ? `<g opacity="${turtlePresence.toFixed(3)}">${turtle(theme)}</g>` : '') +
    `<g opacity="${fishPresence.toFixed(3)}">` +
    plan.fishes.map(f => `<g>${fishSVG(f, theme, staticTime, timelineDuration)}</g>`).join('') +
    `</g>` +
    ambientRipples(width, theme, r) +
    motes(width, theme, r) +
    `<rect class="night" width="${width}" height="${LAYOUT.height}" rx="10" fill="#000d14"/>` +
    `</svg>`

  return {
    svg,
    meta: {
      plankton: plan.eats.length,
      fish: plan.fishes.length,
      duration: Math.round(animationDuration * 10) / 10,
      turtle: hasTurtle,
      lotus: hasLotus,
      bytes: new TextEncoder().encode(svg).length,
    },
  }
}
