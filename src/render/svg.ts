import { LAYOUT, cellCenter, svgWidth } from '../layout'
import { iceFloeLayout, pondObstacleLayout } from '../ecology'
import type { PondEnvironment } from '../environment'
import { longestGap, longestStreak } from '../planner'
import { rng } from '../prng'
import type { PondProvenance } from '../state'
import type { Grid, Plan, Waypoint } from '../types'
import { f1 } from '../util'
import {
  SOFT_FILTER,
  ambientRipples,
  autumnMapleLeaves,
  caustics,
  deepShade,
  floorBlotches,
  godRays,
  lilyPads,
  lotus,
  motes,
  pebbles,
  summerBlooms,
  surfaceSheen,
  turtle,
  waterCurrents,
  winterIce,
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

function bestStaticTime(plan: Plan, width: number, seed: string, environment?: PondEnvironment): number {
  const obstacles = pondObstacleLayout(width, seed, environment)
  let best = { score: -Infinity, time: plan.duration * 0.5 }

  for (let index = 0; index <= 72; index++) {
    const time = plan.duration * (0.08 + (index / 72) * 0.74)
    const trails = plan.fishes.map(fish => fishStaticTrail(fish, time, plan.duration))
    let score = 0

    trails.forEach((trail, fishIndex) => {
      for (const point of trail) {
        const edge = Math.min(point.x, width - point.x, point.y, LAYOUT.height - point.y)
        score += Math.min(42, edge) * 0.05
        for (const obstacle of obstacles) {
          const clearance = Math.hypot(point.x - obstacle.x, point.y - obstacle.y) - obstacle.radius
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

interface TurtleChoreography {
  css: string
  effects: string
}

function turtleChoreography(
  width: number,
  turtleY: number,
  seed: string,
  duration: number,
  ripple: string,
  environment?: PondEnvironment,
): TurtleChoreography {
  const floe = environment && environment.iceCoverage >= 0.18
    ? iceFloeLayout(width, seed, environment.iceCoverage)[1]
    : undefined
  if (!floe) {
    return {
      css:
        `@keyframes turtle{0%{transform:translate(-40px,${turtleY}px)}100%{transform:translate(${width + 40}px,${turtleY}px)}}` +
        `@keyframes turtle-body{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-1px) rotate(0.8deg)}}` +
        `@keyframes turtle-shadow{0%,100%{opacity:0.18;transform:scale(1)}50%{opacity:0.14;transform:scale(0.94)}}` +
        `.snow-track{opacity:0}`,
      effects: '',
    }
  }
  const percentAt = (x: number) => Math.max(0, Math.min(100, ((x + 40) / (width + 80)) * 100))
  const percent = (value: number) => value.toFixed(2)
  const iceY = Math.min(turtleY - 6, floe.y - 2)
  const left = floe.x - floe.rx
  const right = floe.x + floe.rx
  const approach = percentAt(left - 32)
  const contact = percentAt(left - 14)
  const lift = contact + 1.6
  const mount = contact + 4.2
  const walkStart = contact + 5.4
  const middle = Math.max(walkStart + 1, percentAt(floe.x))
  const brace = Math.max(middle + 1, percentAt(right - 18))
  const drop = brace + 1.8
  const splash = brace + 4
  const depart = Math.max(splash + 1, percentAt(right + 36))
  const frame = (at: number, x: number, y: number, easing = 'linear') =>
    `${percent(at)}%{transform:translate(${f1(x)}px,${f1(y)}px);animation-timing-function:${easing}}`
  const bodyFrame = (at: number, transform: string) => `${percent(at)}%{transform:${transform}}`
  const step1 = walkStart + (brace - walkStart) * 0.24
  const step2 = walkStart + (brace - walkStart) * 0.49
  const step3 = walkStart + (brace - walkStart) * 0.74
  const motion =
    `@keyframes turtle{` +
    `0%{transform:translate(-40px,${turtleY}px)}` +
    frame(approach, left - 32, turtleY) +
    frame(contact, left - 14, turtleY, 'ease-out') +
    frame(lift, left - 6, turtleY - 2, 'ease-in-out') +
    frame(mount, left + 8, iceY + 4, 'ease-out') +
    frame(walkStart, left + 22, iceY, 'linear') +
    frame(middle, floe.x, iceY) +
    frame(brace, right - 18, iceY, 'ease-in') +
    frame(drop, right - 2, turtleY - 5, 'ease-in') +
    frame(splash, right + 12, turtleY, 'ease-out') +
    frame(depart, right + 36, turtleY) +
    `100%{transform:translate(${width + 40}px,${turtleY}px)}}`
  const body =
    `@keyframes turtle-body{` +
    `0%,${percent(approach)}%{transform:translateY(0) rotate(0) scale(1)}` +
    bodyFrame(contact, 'translateY(1px) rotate(0) scale(0.98,1.03)') +
    bodyFrame(lift, 'translateY(-2px) rotate(-7deg) scale(0.96)') +
    bodyFrame(mount, 'translateY(-1px) rotate(4deg) scale(1.03)') +
    bodyFrame(walkStart, 'translateY(0) rotate(-1deg) scale(1.02)') +
    bodyFrame(step1, 'translateY(-1.4px) rotate(1.4deg) scale(1.03)') +
    bodyFrame(step2, 'translateY(0) rotate(-1.2deg) scale(1.02)') +
    bodyFrame(step3, 'translateY(-1.2px) rotate(1.2deg) scale(1.03)') +
    bodyFrame(brace, 'translateY(1px) rotate(5deg) scale(0.98)') +
    bodyFrame(drop, 'translateY(-4px) rotate(-8deg) scale(0.94)') +
    bodyFrame(splash, 'translateY(1px) rotate(4deg) scale(1.05)') +
    `${percent(depart)}%,100%{transform:translateY(0) rotate(0) scale(1)}}`
  const shadow =
    `@keyframes turtle-shadow{` +
    `0%,${percent(contact)}%{opacity:0.2;transform:translate(0,0) scale(1)}` +
    `${percent(mount)}%,${percent(brace)}%{opacity:0.12;transform:translate(1px,2px) scale(0.78)}` +
    `${percent(drop)}%{opacity:0.08;transform:translate(2px,4px) scale(0.7)}` +
    `${percent(splash)}%{opacity:0.25;transform:translate(1px,3px) scale(1.18)}` +
    `${percent(depart)}%,100%{opacity:0.2;transform:translate(0,0) scale(1)}}`
  let tracks = `.snow-track{transform-box:fill-box;transform-origin:center;opacity:0}`
  for (let index = 0; index < 8; index++) {
    const localX = (index - 4) * 12
    const trackProgress = Math.max(0, Math.min(1, (floe.x + localX - (left + 22)) / ((right - 18) - (left + 22))))
    const reveal = walkStart + trackProgress * (brace - walkStart)
    tracks +=
      `.snow-track-${index}{animation:snow-track-${index} ${duration}s linear infinite}` +
      `@keyframes snow-track-${index}{0%,${percent(reveal)}%{opacity:0;transform:scale(0.45)}` +
      `${percent(reveal + 0.7)}%,94%{opacity:0.42;transform:scale(1)}99%,100%{opacity:0;transform:scale(1)}}`
  }
  const splashFrames = (name: string, event: number) =>
    `@keyframes ${name}{0%,${percent(event - 0.2)}%{opacity:0;transform:scale(0.2)}` +
    `${percent(event + 0.35)}%{opacity:0.5;transform:scale(0.7)}` +
    `${percent(event + 3.2)}%,100%{opacity:0;transform:scale(3.2)}}`
  const entryEvent = lift + 0.8
  const exitEvent = splash
  const splashes =
    `.turtle-splash{transform-box:fill-box;transform-origin:center;opacity:0}` +
    `.turtle-splash-in{animation:turtle-splash-in ${duration}s linear infinite}` +
    `.turtle-splash-out{animation:turtle-splash-out ${duration}s linear infinite}` +
    splashFrames('turtle-splash-in', entryEvent) +
    splashFrames('turtle-splash-out', exitEvent)
  const effects =
    `<g data-pond-part="turtle-water-feedback">` +
    `<circle class="turtle-splash turtle-splash-in" cx="${f1(left - 2)}" cy="${turtleY}" r="6" fill="none" stroke="${ripple}" stroke-width="1.1"/>` +
    `<circle class="turtle-splash turtle-splash-in" cx="${f1(left - 2)}" cy="${turtleY}" r="10" fill="none" stroke="${ripple}" stroke-width="0.7"/>` +
    `<circle class="turtle-splash turtle-splash-out" cx="${f1(right + 12)}" cy="${turtleY}" r="6" fill="none" stroke="${ripple}" stroke-width="1.1"/>` +
    `<circle class="turtle-splash turtle-splash-out" cx="${f1(right + 12)}" cy="${turtleY}" r="10" fill="none" stroke="${ripple}" stroke-width="0.7"/>` +
    `</g>`
  return {
    css: motion + body + shadow + tracks + splashes,
    effects,
  }
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
  const staticTime = bestStaticTime(plan, width, seed, context.environment)
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
  const environment = context.environment
  const rayPeak = environment
    ? environment.daylight * (0.08 + environment.goldenLight * 0.13 + environment.sunStrength * 0.07)
    : 0.2
  const rayFloor = rayPeak * 0.36
  const causticOpacity = environment
    ? environment.daylight *
      (0.015 + environment.sunStrength * 0.105) *
      (0.82 + environment.seasonWeights.summer * 0.18) *
      (1 - environment.winterStillness * 0.32)
    : 0.07
  const floorPeak = environment ? 0.68 + environment.daylight * 0.25 + environment.sunStrength * 0.07 : 1
  const floorFloor = floorPeak * 0.78
  const shadowShift = environment
    ? -environment.sunDirection * (12 + environment.goldenLight * 16)
    : 0
  const surfaceMotion = environment
    ? environment.surfaceActivity * (0.45 + environment.daylight * 0.55)
    : 1
  const currentPeak = environment
    ? (theme.key === 'light' ? 0.14 : 0.07) *
      (0.42 + surfaceMotion * 0.58) *
      (0.82 + environment.goldenLight * 0.18)
    : theme.key === 'light' ? 0.14 : 0.07
  const currentFloor = currentPeak * 0.5
  const sheenIntensity = environment
    ? Math.min(1, 0.58 + environment.daylight * 0.32 + environment.goldenLight * 0.1)
    : 1
  const moteCount = environment ? Math.round(3 + surfaceMotion * 5) : 8
  const ambientRippleCount = environment ? Math.max(1, Math.round(1 + surfaceMotion * 3)) : 3
  const swayAngle = environment ? 0.9 + surfaceMotion * 2 : 2.6
  const paddleDuration = environment && environment.iceCoverage >= 0.18 ? 0.9 : 1.4
  const turtleDuration = Math.max(36, Math.min(64, animationDuration * 0.6))
  const turtleScene = turtleChoreography(
    width,
    turtleY,
    seed,
    turtleDuration,
    theme.ripple,
    environment,
  )
  const turtleFloe = environment && environment.iceCoverage >= 0.18
    ? iceFloeLayout(width, seed, environment.iceCoverage)[1]
    : undefined
  const turtleRestX = turtleFloe?.x ?? width * 0.58
  const turtleRestY = turtleFloe ? Math.min(turtleY - 6, turtleFloe.y - 2) : turtleY

  const base = `
.pk,.rp{transform-box:fill-box;transform-origin:center;animation-duration:${animationDuration}s;animation-timing-function:linear;animation-iteration-count:infinite}
.rp{opacity:0}
.pt{transform-box:fill-box;transform-origin:center;animation:pec 1.05s ease-in-out infinite}
.pb{transform-box:fill-box;transform-origin:center;animation:pec 1.05s ease-in-out infinite reverse}
.tf{transform-box:fill-box;transform-origin:center;animation:tfk .6s ease-in-out infinite}
@keyframes pec{0%,100%{transform:rotate(14deg)}50%{transform:rotate(-12deg)}}
@keyframes tfk{0%,100%{transform:rotate(26deg)}50%{transform:rotate(-26deg)}}
.tw{animation:tw 3.6s ease-in-out infinite alternate}
.ray{opacity:${rayFloor.toFixed(3)};animation:ray 9.5s ease-in-out infinite alternate}
.sway{transform-box:fill-box;transform-origin:center;animation-name:sway;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.bloom{transform-box:fill-box;transform-origin:center;animation:bloom 5.2s ease-in-out infinite alternate}
.paddle{transform-box:fill-box;transform-origin:center;animation:paddle ${paddleDuration}s ease-in-out infinite alternate}
.ca{opacity:${causticOpacity.toFixed(3)};animation:ca 15s ease-in-out infinite alternate}
.floor{transform-box:fill-box;transform-origin:center;animation-name:floor;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.current{opacity:${currentPeak.toFixed(3)};animation:current 19s ease-in-out infinite alternate}
.mo{opacity:0;animation-name:mo;animation-timing-function:linear;animation-iteration-count:infinite}
.ar{transform-box:fill-box;transform-origin:center;opacity:0;animation:ar 9s linear infinite}
.maple{transform-box:fill-box;transform-origin:center;animation-name:maple;animation-timing-function:linear;animation-iteration-count:infinite}
.maple-body{transform-box:fill-box;transform-origin:center;animation:maple-body 3.2s ease-in-out infinite alternate}
.maple-wake{transform-box:fill-box;transform-origin:center;opacity:0;animation:maple-wake 4.2s ease-out infinite}
.ice-glint{animation:ice-glint 5.8s ease-in-out infinite alternate}
.turtle{transform:translate(${(width * 0.58).toFixed(1)}px,${turtleY}px);animation:turtle ${turtleDuration}s linear infinite}
.turtle-body{transform-box:fill-box;transform-origin:center;animation:turtle-body ${turtleDuration}s linear infinite}
.turtle-shadow{transform-box:fill-box;transform-origin:center;animation:turtle-shadow ${turtleDuration}s linear infinite}
.night{opacity:0;animation:night ${animationDuration}s linear infinite}
@keyframes tw{from{opacity:0.06}to{opacity:0.26}}
@keyframes ray{from{opacity:${rayFloor.toFixed(3)}}to{opacity:${rayPeak.toFixed(3)}}}
@keyframes sway{from{transform:rotate(-${swayAngle.toFixed(1)}deg)}to{transform:rotate(${swayAngle.toFixed(1)}deg)}}
@keyframes bloom{from{transform:scale(1)}to{transform:scale(1.07)}}
@keyframes paddle{from{transform:rotate(14deg)}to{transform:rotate(-14deg)}}
@keyframes ca{from{transform:translate(-26px,0)}to{transform:translate(26px,9px)}}
@keyframes floor{from{transform:translate(${(shadowShift - 9).toFixed(1)}px,-2px) scale(0.98);opacity:${floorFloor.toFixed(3)}}to{transform:translate(${(shadowShift + 11).toFixed(1)}px,4px) scale(1.04);opacity:${floorPeak.toFixed(3)}}}
@keyframes current{from{transform:translateX(-22px);opacity:${currentFloor.toFixed(3)}}to{transform:translateX(24px);opacity:${currentPeak.toFixed(3)}}}
@keyframes mo{0%{transform:translate(0,0);opacity:0}15%{opacity:0.55}85%{opacity:0.4}100%{transform:translate(14px,-26px);opacity:0}}
@keyframes ar{0%{transform:scale(0.2);opacity:0}6%{opacity:0.22}26%,100%{transform:scale(3.6);opacity:0}}
@keyframes maple{0%{transform:translate(var(--mx0),0) rotate(0);opacity:0}6%{opacity:0.95}28%{transform:translate(var(--mx1),var(--my1)) rotate(95deg);opacity:0.95}63%{transform:translate(var(--mx2),var(--my2)) rotate(210deg);opacity:0.95}94%{opacity:0.9}100%{transform:translate(var(--mx3),var(--my3)) rotate(330deg);opacity:0}}
@keyframes maple-body{from{transform:translateY(-1px) rotate(-4deg)}to{transform:translateY(1px) rotate(4deg)}}
@keyframes maple-wake{0%{transform:scale(0.25);opacity:0}25%{opacity:0.18}100%{transform:scale(1.5);opacity:0}}
@keyframes ice-glint{from{opacity:0.56}to{opacity:0.9}}
${turtleScene.css}
@keyframes night{0%,91%{opacity:0}95%,97.5%{opacity:${theme.night}}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.rp,.tw,.mo,.ar,.night,.turtle-splash{opacity:0!important}.floor{opacity:${floorPeak.toFixed(3)}}.current{opacity:${currentPeak.toFixed(3)}}.ca{opacity:${causticOpacity.toFixed(3)}}.ray{opacity:${rayPeak.toFixed(3)}}.maple{transform:none;opacity:0.9}.snow-track{opacity:0.28!important}.turtle{transform:translate(${f1(turtleRestX)}px,${f1(turtleRestY)}px)}}
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
  const lotusPresence = environment?.bloom ?? 1
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
    godRays(width, theme, r, environment?.sunDirection) +
    `<g>${planktonEls}</g>` +
    `<g>${rippleEls}</g>` +
    pebbles(theme, r) +
    `<rect width="${width}" height="${LAYOUT.height}" rx="10" fill="url(#vig)"/>` +
    surfaceSheen(width, theme, sheenIntensity) +
    lilyPads(width, theme, seed, environment?.plantCoverage ?? 1) +
    summerBlooms(width, theme, seed, environment?.summerBloom ?? 0) +
    (hasLotus && lotusPresence >= 0.35
      ? `<g opacity="${lotusPresence.toFixed(3)}">${lotus(lotusX, theme, r)}</g>`
      : '') +
    plan.fishes.map(f => `<g>${fishSVG(f, theme, staticTime, timelineDuration)}</g>`).join('') +
    autumnMapleLeaves(width, theme, seed, environment?.mapleDrift ?? 0) +
    winterIce(width, theme, seed, environment?.iceCoverage ?? 0, hasTurtle) +
    (hasTurtle ? turtleScene.effects + turtle(theme) : '') +
    ambientRipples(width, theme, r, ambientRippleCount) +
    motes(width, theme, r, moteCount) +
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
