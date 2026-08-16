import { describe, expect, it } from 'vitest'
import { demoGrid } from '../src/demo'
import { deriveEnvironment, momentFromText } from '../src/environment'
import { plan } from '../src/planner'
import { THEMES, themeForEnvironment } from '../src/render/palette'
import { renderSVG } from '../src/render/svg'

describe('environment-aware original renderer', () => {
  const grid = demoGrid('seasonal-render')
  const pondPlan = plan(grid, 'seasonal-render')

  it('does not add an environment layer to legacy outputs', () => {
    const { svg, meta } = renderSVG(grid, pondPlan, THEMES.light, 'seasonal-render')
    expect(svg).not.toContain('koipond-environment')
    expect(svg).not.toContain('spring pond growth')
    expect(meta.duration).toBeCloseTo(pondPlan.duration, 1)
  })

  it('embeds independently inspectable time and season metadata', () => {
    const environment = deriveEnvironment(momentFromText('2026-12-21', '23:30'), 'winter')
    const { svg, meta } = renderSVG(
      grid,
      pondPlan,
      themeForEnvironment(environment),
      'seasonal-render',
      { environment },
    )
    expect(svg).toContain('id="koipond-environment"')
    expect(svg).toContain('"season":"winter"')
    expect(svg).toContain('winter surface ice')
    expect(meta.duration).toBeGreaterThan(pondPlan.duration)
  })

  it('changes the environment without changing the underlying fish plan', () => {
    const spring = deriveEnvironment(momentFromText('2026-04-15', '12:00'), 'spring')
    const autumn = deriveEnvironment(momentFromText('2026-10-15', '12:00'), 'autumn')
    const springSvg = renderSVG(grid, pondPlan, themeForEnvironment(spring), 'seasonal-render', { environment: spring }).svg
    const autumnSvg = renderSVG(grid, pondPlan, themeForEnvironment(autumn), 'seasonal-render', { environment: autumn }).svg
    expect(springSvg).not.toBe(autumnSvg)
    expect(pondPlan.fishes.every(fish => springSvg.includes(`@keyframes fp${fish.id}`))).toBe(true)
    expect(pondPlan.fishes.every(fish => autumnSvg.includes(`@keyframes fp${fish.id}`))).toBe(true)
  })
})
