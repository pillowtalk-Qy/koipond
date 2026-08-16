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
    expect(svg.match(/data-pond-part="lily-pad"/g)).toHaveLength(1)
    expect(svg).toContain('data-seasonal-part="winter-ice"')
    expect(svg).not.toContain('data-seasonal-part="autumn-maple"')
    expect(meta.duration).toBeGreaterThan(pondPlan.duration)
  })

  it('uses physical seasonal markers while spring keeps the original pond', () => {
    const spring = deriveEnvironment(momentFromText('2026-04-15', '12:00'), 'spring')
    const summer = deriveEnvironment(momentFromText('2026-07-15', '12:00'), 'summer')
    const autumn = deriveEnvironment(momentFromText('2026-10-15', '12:00'), 'autumn')
    const springSvg = renderSVG(grid, pondPlan, themeForEnvironment(spring), 'seasonal-render', { environment: spring }).svg
    const summerSvg = renderSVG(grid, pondPlan, themeForEnvironment(summer), 'seasonal-render', { environment: summer }).svg
    const autumnSvg = renderSVG(grid, pondPlan, themeForEnvironment(autumn), 'seasonal-render', { environment: autumn }).svg
    expect(springSvg).not.toBe(autumnSvg)
    expect(springSvg.match(/data-pond-part="lily-pad"/g)).toHaveLength(4)
    expect(springSvg).not.toContain('data-seasonal-part=')
    expect(summerSvg).toContain('data-seasonal-part="summer-bloom"')
    expect(autumnSvg).toContain('data-seasonal-part="autumn-maple"')
    expect(autumnSvg.match(/data-pond-part="lily-pad"/g)).toHaveLength(3)
    expect(pondPlan.fishes.every(fish => springSvg.includes(`@keyframes fp${fish.id}`))).toBe(true)
    expect(pondPlan.fishes.every(fish => autumnSvg.includes(`@keyframes fp${fish.id}`))).toBe(true)
  })
})
