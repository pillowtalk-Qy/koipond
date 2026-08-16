import { cellEnergy, desiredPopulation, ecosystemStats, pondObstacleLayout } from './ecology'
import type { PondEnvironment } from './environment'
import { rng } from './prng'
import { LAYOUT, cellCenter, svgWidth } from './layout'
import type { EatEvent, FishIdentity, FishPlan, Grid, Plan } from './types'

export const ACTIVE_FRACTION = 0.92

const SIM_DT = 1 / 30
const SAMPLE_DT = 0.1

interface Target {
  cell: number
  x: number
  y: number
  level: number
  energy: number
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
  satiety: number
}

export function plan(grid: Grid, seed: string, identities?: FishIdentity[], environment?: PondEnvironment): Plan {
  const r = rng('plan:' + seed)
  const width = svgWidth(grid.weeks)
  const stats = ecosystemStats(grid)
  const obstacles = pondObstacleLayout(width, seed, environment)
  const targets: Target[] = grid.cells
    .filter(c => c.level > 0)
    .map(c => ({
      cell: c.week * 7 + c.day,
      ...cellCenter(c.week, c.day),
      level: c.level,
      energy: cellEnergy(c),
    }))

  const fishCount = identities && identities.length > 0 ? identities.length : desiredPopulation(stats)
  const energyDensity = Math.min(1, stats.energyDensity / 7)
  const koiAffinity = Math.min(0.78, 0.26 + energyDensity * 0.34 + stats.consistency * 0.42)
  const fishes: FishPlan[] = []
  for (let i = 0; i < fishCount; i++) {
    const identity = identities?.[i]
    const isKoi = identity ? identity.species === 'koi' : i === 0 || r() < koiAffinity
    const baseSize = identity
      ? identity.baseSize
      : i === 0
        ? 1.08 + energyDensity * 0.2 + r() * 0.08
        : isKoi
          ? 0.68 + energyDensity * 0.14 + r() * 0.12
          : 0.9 + stats.consistency * 0.18 + r() * 0.14
    const lifetimeEnergy = identity?.lifetimeEnergy ?? 0
    const size = baseSize + Math.min(0.22, Math.log1p(lifetimeEnergy) * 0.024)
    const start = {
      x: LAYOUT.padX + ((i + 0.5) / fishCount) * (width - LAYOUT.padX * 2),
      y: LAYOUT.gridY + 10 + r() * (7 * LAYOUT.cell - 20),
    }
    fishes.push({
      id: i,
      key: identity?.key ?? `${seed}-${i}`,
      species: isKoi ? 'koi' : 'minnow',
      size,
      energy: 0,
      lifetimeEnergy,
      start,
      waypoints: [],
    })
  }

  const sims: Sim[] = fishes.map(f => {
    const a = r() * Math.PI * 2
    const maxSpeed =
      f.species === 'koi' ? 58 - 9 * f.size + stats.recentEnergy * 3 : 68 + stats.burstiness * 10
    return {
      f,
      pos: { ...f.start },
      vel: { x: Math.cos(a) * maxSpeed * 0.7, y: Math.sin(a) * maxSpeed * 0.7 },
      target: null,
      targetAge: 0,
      wander: r() * Math.PI * 2,
      maxSpeed,
      maxForce: f.species === 'koi' ? 105 : 145 + stats.burstiness * 20,
      satiety: 0,
    }
  })

  const step = (s: Sim, tx: number, ty: number, arrive: boolean) => {
    s.satiety = Math.max(0, s.satiety - SIM_DT * 0.62)
    const speed = s.maxSpeed * (1 - Math.min(0.2, (s.satiety / 16) * 0.2))
    const dx = tx - s.pos.x
    const dy = ty - s.pos.y
    const d = Math.hypot(dx, dy) || 1
    const desired = arrive ? speed * Math.min(1, Math.max(0.62, d / 22)) : speed
    let ax = (dx / d) * desired - s.vel.x
    let ay = (dy / d) * desired - s.vel.y
    const am = Math.hypot(ax, ay) || 1
    const cap = Math.min(s.maxForce, am * 5)
    ax = (ax / am) * cap
    ay = (ay / am) * cap

    s.wander += (r() - 0.5) * (0.24 + stats.burstiness * 0.16)
    const sp = Math.hypot(s.vel.x, s.vel.y) || 1
    const wAmp = s.maxForce * (s.f.species === 'koi' ? 0.13 : 0.18) * Math.sin(s.wander)
    ax += (-s.vel.y / sp) * wAmp
    ay += (s.vel.x / sp) * wAmp

    for (const obstacle of obstacles) {
      const lookAhead = s.f.species === 'koi' ? 0.46 : 0.32
      const futureX = s.pos.x + s.vel.x * lookAhead
      const futureY = s.pos.y + s.vel.y * lookAhead
      const currentDistance = Math.hypot(s.pos.x - obstacle.x, s.pos.y - obstacle.y)
      const futureDistance = Math.hypot(futureX - obstacle.x, futureY - obstacle.y)
      const useFuture = futureDistance < currentDistance
      const ox = (useFuture ? futureX : s.pos.x) - obstacle.x
      const oy = (useFuture ? futureY : s.pos.y) - obstacle.y
      const od = Math.hypot(ox, oy) || 1
      const clearance = obstacle.radius + (obstacle.kind === 'ice' ? 10 : 8) + s.f.size * 7
      if (od < clearance) {
        const strength = 1 - od / clearance
        const push = s.maxForce * (obstacle.kind === 'ice' ? 3.6 : 2.1) * strength * strength
        ax += (ox / od) * push
        ay += (oy / od) * push
        const side = s.f.id % 2 === 0 ? 1 : -1
        ax += (-oy / od) * push * 0.32 * side
        ay += (ox / od) * push * 0.32 * side
      }
    }

    let schoolX = 0
    let schoolY = 0
    let alignX = 0
    let alignY = 0
    let schoolmates = 0
    for (const other of sims) {
      if (other === s) continue
      const prediction = 0.28
      const sx = s.pos.x + s.vel.x * prediction - (other.pos.x + other.vel.x * prediction)
      const sy = s.pos.y + s.vel.y * prediction - (other.pos.y + other.vel.y * prediction)
      const sd = Math.hypot(sx, sy) || 1
      const separation = 17 + (s.f.size + other.f.size) * 4
      if (sd < separation) {
        const push = s.maxForce * (1 - sd / separation) * (s.f.species === 'koi' ? 1.1 : 0.82)
        ax += (sx / sd) * push
        ay += (sy / sd) * push
      }
      if (s.f.species === 'minnow' && other.f.species === 'minnow' && sd < 88) {
        schoolX += other.pos.x
        schoolY += other.pos.y
        alignX += other.vel.x
        alignY += other.vel.y
        schoolmates++
      }
    }
    if (schoolmates > 0) {
      const cohesion = 0.46 + stats.consistency * 0.45
      ax += (schoolX / schoolmates - s.pos.x) * cohesion
      ay += (schoolY / schoolmates - s.pos.y) * cohesion
      ax += (alignX / schoolmates - s.vel.x) * 0.12
      ay += (alignY / schoolmates - s.vel.y) * 0.12
    }

    const M = 24
    const W = s.maxForce * 1.6
    if (s.pos.x < M) ax += W * (1 - s.pos.x / M)
    if (s.pos.x > width - M) ax -= W * (1 - (width - s.pos.x) / M)
    if (s.pos.y < M) ay += W * (1 - s.pos.y / M)
    if (s.pos.y > LAYOUT.height - M) ay -= W * (1 - (LAYOUT.height - s.pos.y) / M)

    const force = Math.hypot(ax, ay) || 1
    const forceCap = s.maxForce * 2.15
    if (force > forceCap) {
      ax = (ax / force) * forceCap
      ay = (ay / force) * forceCap
    }

    s.vel.x += ax * SIM_DT
    s.vel.y += ay * SIM_DT
    const v = Math.hypot(s.vel.x, s.vel.y) || 1
    const vc = Math.min(speed, Math.max(11, v))
    s.vel.x = (s.vel.x / v) * vc
    s.vel.y = (s.vel.y / v) * vc
    s.pos.x += s.vel.x * SIM_DT
    s.pos.y += s.vel.y * SIM_DT

    for (const obstacle of obstacles) {
      if (obstacle.kind !== 'ice') continue
      const ox = s.pos.x - obstacle.x
      const oy = s.pos.y - obstacle.y
      const distance = Math.hypot(ox, oy) || 1
      const boundary = obstacle.radius + 0.75
      if (distance >= boundary) continue
      const nx = ox / distance
      const ny = oy / distance
      s.pos.x = obstacle.x + nx * boundary
      s.pos.y = obstacle.y + ny * boundary
      const inwardVelocity = s.vel.x * nx + s.vel.y * ny
      if (inwardVelocity < 0) {
        s.vel.x -= inwardVelocity * nx
        s.vel.y -= inwardVelocity * ny
      }
    }
  }

  const remaining = [...targets]
  const eats: EatEvent[] = []
  const claim = (s: Sim): Target | null => {
    if (remaining.length === 0) return null
    const scored = remaining
      .map((target, i) => {
        const distance = Math.hypot(target.x - s.pos.x, target.y - s.pos.y)
        const energyBias =
          s.f.species === 'koi' ? 1 / (1 + target.energy * 0.11) : 1 + Math.max(0, target.energy - 2) * 0.045
        return { i, d: distance * energyBias }
      })
      .sort((a, b) => a.d - b.d)
    const pick = scored[Math.floor(r() * r() * Math.min(4, scored.length))]
    return remaining.splice(pick.i, 1)[0]
  }

  let t = 0
  let nextSample = 0
  const sample = () => {
    if (t >= nextSample - 1e-9) {
      for (const s of sims) {
        s.f.waypoints.push({ t, x: s.pos.x, y: s.pos.y, satiety: Math.min(1, s.satiety / 16) })
      }
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
          s.satiety = Math.min(16, s.satiety + s.target.energy)
          s.f.energy += s.target.energy
          eats.push({
            cell: s.target.cell,
            fish: s.f.id,
            t: t + SIM_DT,
            level: s.target.level,
            energy: s.target.energy,
            x: s.target.x,
            y: s.target.y,
          })
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
        wp.satiety *= 1 - e
      }
    }
    const last = f.waypoints[f.waypoints.length - 1]
    if (!last || last.t < duration - 1e-6) {
      f.waypoints.push({ t: duration, x: f.start.x, y: f.start.y, satiety: 0 })
    } else {
      last.t = duration
      last.x = f.start.x
      last.y = f.start.y
      last.satiety = 0
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
