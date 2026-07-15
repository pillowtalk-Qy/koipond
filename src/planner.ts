import { rng } from './prng'
import { LAYOUT, cellCenter, svgWidth } from './layout'
import type { EatEvent, FishPlan, Grid, Plan } from './types'

export const ACTIVE_FRACTION = 0.92

const SIM_DT = 1 / 30
const SAMPLE_DT = 0.1

interface Target {
  cell: number
  x: number
  y: number
  level: number
}

interface Sim {
  f: FishPlan
  pos: { x: number; y: number }
  vel: { x: number; y: number }
  target: Target | null
  targetAge: number
  wander: number
  maxSpeed: number
  maxForce: number
}

export function plan(grid: Grid, seed: string): Plan {
  const r = rng('plan:' + seed)
  const width = svgWidth(grid.weeks)
  const targets: Target[] = grid.cells
    .filter(c => c.level > 0)
    .map(c => ({ cell: c.week * 7 + c.day, ...cellCenter(c.week, c.day), level: c.level }))

  const fishCount = Math.max(1, Math.min(4, 1 + Math.floor(targets.length / 110)))
  const fishes: FishPlan[] = []
  for (let i = 0; i < fishCount; i++) {
    const isKoi = i === 0 || r() < 0.5
    const size = i === 0 ? 1.1 + r() * 0.25 : isKoi ? 0.68 + r() * 0.22 : 0.9 + r() * 0.3
    const start = {
      x: LAYOUT.padX + ((i + 0.5) / fishCount) * (width - LAYOUT.padX * 2),
      y: LAYOUT.gridY + 10 + r() * (7 * LAYOUT.cell - 20),
    }
    fishes.push({ id: i, species: isKoi ? 'koi' : 'minnow', size, start, waypoints: [] })
  }

  const sims: Sim[] = fishes.map(f => {
    const a = r() * Math.PI * 2
    const maxSpeed = f.species === 'koi' ? 58 - 9 * f.size : 70
    return {
      f,
      pos: { ...f.start },
      vel: { x: Math.cos(a) * maxSpeed * 0.7, y: Math.sin(a) * maxSpeed * 0.7 },
      target: null,
      targetAge: 0,
      wander: r() * Math.PI * 2,
      maxSpeed,
      maxForce: f.species === 'koi' ? 105 : 150,
    }
  })

  const step = (s: Sim, tx: number, ty: number, arrive: boolean) => {
    const dx = tx - s.pos.x
    const dy = ty - s.pos.y
    const d = Math.hypot(dx, dy) || 1
    const desired = arrive ? s.maxSpeed * Math.min(1, Math.max(0.62, d / 22)) : s.maxSpeed
    let ax = (dx / d) * desired - s.vel.x
    let ay = (dy / d) * desired - s.vel.y
    const am = Math.hypot(ax, ay) || 1
    const cap = Math.min(s.maxForce, am * 5)
    ax = (ax / am) * cap
    ay = (ay / am) * cap

    s.wander += (r() - 0.5) * 0.32
    const sp = Math.hypot(s.vel.x, s.vel.y) || 1
    const wAmp = s.maxForce * 0.17 * Math.sin(s.wander)
    ax += (-s.vel.y / sp) * wAmp
    ay += (s.vel.x / sp) * wAmp

    const M = 24
    const W = s.maxForce * 1.6
    if (s.pos.x < M) ax += W * (1 - s.pos.x / M)
    if (s.pos.x > width - M) ax -= W * (1 - (width - s.pos.x) / M)
    if (s.pos.y < M) ay += W * (1 - s.pos.y / M)
    if (s.pos.y > LAYOUT.height - M) ay -= W * (1 - (LAYOUT.height - s.pos.y) / M)

    s.vel.x += ax * SIM_DT
    s.vel.y += ay * SIM_DT
    const v = Math.hypot(s.vel.x, s.vel.y) || 1
    const vc = Math.min(s.maxSpeed, Math.max(11, v))
    s.vel.x = (s.vel.x / v) * vc
    s.vel.y = (s.vel.y / v) * vc
    s.pos.x += s.vel.x * SIM_DT
    s.pos.y += s.vel.y * SIM_DT
  }

  const remaining = [...targets]
  const eats: EatEvent[] = []
  const claim = (s: Sim): Target | null => {
    if (remaining.length === 0) return null
    const scored = remaining
      .map((t, i) => ({ i, d: Math.hypot(t.x - s.pos.x, t.y - s.pos.y) }))
      .sort((a, b) => a.d - b.d)
    const pick = scored[Math.floor(r() * r() * Math.min(3, scored.length))]
    return remaining.splice(pick.i, 1)[0]
  }

  let t = 0
  let nextSample = 0
  const sample = () => {
    if (t >= nextSample - 1e-9) {
      for (const s of sims) s.f.waypoints.push({ t, x: s.pos.x, y: s.pos.y })
      nextSample += SAMPLE_DT
    }
  }

  if (targets.length > 0) {
    while ((remaining.length > 0 || sims.some(s => s.target)) && t < 600) {
      sample()
      for (const s of sims) {
        if (!s.target) {
          s.target = claim(s)
          s.targetAge = 0
        }
        if (!s.target) {
          step(s, s.f.start.x, s.f.start.y, true)
          continue
        }
        s.targetAge += SIM_DT
        const eatR = 7 + Math.max(0, s.targetAge - 6) * 2
        step(s, s.target.x, s.target.y, true)
        if (Math.hypot(s.target.x - s.pos.x, s.target.y - s.pos.y) < eatR) {
          eats.push({ cell: s.target.cell, t: t + SIM_DT, level: s.target.level, x: s.target.x, y: s.target.y })
          s.target = null
        }
      }
      t += SIM_DT
    }
  }

  const feedEnd = t
  const duration = Math.max(24, (feedEnd + 1.5) / ACTIVE_FRACTION)

  const orbits = sims.map(s => ({
    R: 20 + 7 * s.f.size,
    ang: r() * Math.PI * 2,
    dir: r() < 0.5 ? 1 : -1,
  }))
  while (t < duration - 1e-9) {
    sample()
    sims.forEach((s, i) => {
      const o = orbits[i]
      o.ang += ((o.dir * (s.maxSpeed * 0.55)) / o.R) * SIM_DT
      step(s, s.f.start.x + Math.cos(o.ang) * o.R, s.f.start.y + Math.sin(o.ang) * o.R, false)
    })
    t += SIM_DT
  }

  const BLEND = 2.6
  for (const f of fishes) {
    for (const wp of f.waypoints) {
      if (wp.t > duration - BLEND) {
        const w = (wp.t - (duration - BLEND)) / BLEND
        const e = w * w * (3 - 2 * w)
        wp.x = wp.x * (1 - e) + f.start.x * e
        wp.y = wp.y * (1 - e) + f.start.y * e
      }
    }
    const last = f.waypoints[f.waypoints.length - 1]
    if (!last || last.t < duration - 1e-6) {
      f.waypoints.push({ t: duration, x: f.start.x, y: f.start.y })
    } else {
      last.t = duration
      last.x = f.start.x
      last.y = f.start.y
    }
  }

  return { duration, fishes, eats }
}

export function longestStreak(grid: Grid): number {
  const ordered = [...grid.cells].sort((a, b) => a.week * 7 + a.day - (b.week * 7 + b.day))
  let best = 0
  let cur = 0
  for (const c of ordered) {
    cur = c.count > 0 ? cur + 1 : 0
    if (cur > best) best = cur
  }
  return best
}

export function longestGap(grid: Grid): { len: number; centerWeek: number } {
  const ordered = [...grid.cells].sort((a, b) => a.week * 7 + a.day - (b.week * 7 + b.day))
  let best = { len: 0, centerWeek: 0 }
  let curLen = 0
  let curStart = 0
  ordered.forEach((c, i) => {
    if (c.count === 0) {
      if (curLen === 0) curStart = i
      curLen++
      if (curLen > best.len) best = { len: curLen, centerWeek: Math.floor((curStart + i) / 2 / 7) }
    } else {
      curLen = 0
    }
  })
  return best
}
