import { describe, expect, it } from 'vitest'
import { demoGrid } from '../src/demo'
import { ACTIVE_FRACTION, longestGap, longestStreak, plan } from '../src/planner'
import { THEMES } from '../src/render/palette'
import { renderSVG } from '../src/render/svg'

const grid = demoGrid('test-user')

describe('planner', () => {
  it('is deterministic for the same seed', () => {
    expect(JSON.stringify(plan(grid, 'x'))).toBe(JSON.stringify(plan(grid, 'x')))
  })

  it('differs across seeds', () => {
    expect(JSON.stringify(plan(grid, 'a'))).not.toBe(JSON.stringify(plan(grid, 'b')))
  })

  it('eats every plankton exactly once', () => {
    const p = plan(grid, 'x')
    const active = grid.cells.filter(c => c.level > 0)
    expect(p.eats.length).toBe(active.length)
    expect(new Set(p.eats.map(e => e.cell)).size).toBe(active.length)
  })

  it('finishes feeding inside the active window', () => {
    const p = plan(grid, 'x')
    for (const e of p.eats) {
      expect(e.t).toBeGreaterThan(0)
      expect(e.t).toBeLessThanOrEqual(p.duration * ACTIVE_FRACTION + 1e-9)
    }
  })

  it('gives every fish monotonic waypoints that end at home', () => {
    const p = plan(grid, 'x')
    for (const f of p.fishes) {
      for (let i = 1; i < f.waypoints.length; i++) {
        expect(f.waypoints[i].t).toBeGreaterThan(f.waypoints[i - 1].t)
      }
      const last = f.waypoints[f.waypoints.length - 1]
      expect(last.x).toBeCloseTo(f.start.x, 5)
      expect(last.y).toBeCloseTo(f.start.y, 5)
    }
  })

  it('handles an empty year without eats', () => {
    const empty = { weeks: 53, cells: grid.cells.map(c => ({ ...c, count: 0, level: 0 as const })) }
    const p = plan(empty, 'x')
    expect(p.eats.length).toBe(0)
    expect(p.fishes.length).toBeGreaterThan(0)
    expect(p.duration).toBeGreaterThanOrEqual(24)
  })
})

describe('achievements', () => {
  it('detects the demo streak and gap', () => {
    expect(longestStreak(grid)).toBeGreaterThanOrEqual(30)
    expect(longestGap(grid).len).toBeGreaterThanOrEqual(21)
  })
})

describe('render', () => {
  it('renders one plankton group and one ripple per active cell', () => {
    const p = plan(grid, 'x')
    const active = grid.cells.filter(c => c.level > 0).length
    const light = renderSVG(grid, p, THEMES.light, 'x').svg
    const dark = renderSVG(grid, p, THEMES.dark, 'x').svg
    expect((light.match(/class="pk /g) ?? []).length).toBe(active)
    expect((dark.match(/class="pk /g) ?? []).length).toBe(active)
    expect((light.match(/class="rp /g) ?? []).length).toBe(active)
    expect(light).toContain('<svg')
    expect(light).toContain('@keyframes fp0')
  })

  it('is deterministic end to end', () => {
    const a = renderSVG(grid, plan(grid, 'x'), THEMES.light, 'x').svg
    const b = renderSVG(grid, plan(grid, 'x'), THEMES.light, 'x').svg
    expect(a).toBe(b)
  })
})
