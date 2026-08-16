import { describe, expect, it } from 'vitest'
import { demoGrid } from '../src/demo'
import { deriveEnvironment, momentFromText } from '../src/environment'
import { svgWidth } from '../src/layout'
import { longestStreak, plan } from '../src/planner'
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
    expect(autumnSvg).toContain('class="maple-wake"')
    expect(autumnSvg).toContain('class="maple-body"')
    expect(autumnSvg).toContain('--mx0:')
    expect(autumnSvg).toContain('--mx3:')
    expect(autumnSvg).toContain('@keyframes maple{')
    expect(autumnSvg.match(/data-pond-part="lily-pad"/g)).toHaveLength(3)
    expect(pondPlan.fishes.every(fish => springSvg.includes(`@keyframes fp${fish.id}`))).toBe(true)
    expect(pondPlan.fishes.every(fish => autumnSvg.includes(`@keyframes fp${fish.id}`))).toBe(true)
  })

  it('keeps the resident turtle visible on first paint without a 30-day streak', () => {
    const residentGrid = {
      ...grid,
      cells: grid.cells.map((cell, index) => ({
        ...cell,
        count: index % 40 === 0 ? 1 : 0,
        level: (index % 40 === 0 ? 1 : 0) as 0 | 1,
      })),
    }
    const summer = deriveEnvironment(momentFromText('2026-07-15', '12:00'), 'summer')
    const residentPlan = plan(residentGrid, 'resident-turtle', undefined, summer)
    const { svg, meta } = renderSVG(
      residentGrid,
      residentPlan,
      themeForEnvironment(summer),
      'resident-turtle',
      { environment: summer },
    )
    const animation = svg.match(/animation:turtle ([\d.]+)s linear infinite;animation-delay:-([\d.]+)s/)
    const duration = Number(animation?.[1])
    const delay = Number(animation?.[2])
    const width = svgWidth(residentGrid.weeks)
    const initialX = -40 + (width + 80) * (delay / duration)

    expect(longestStreak(residentGrid)).toBeLessThan(30)
    expect(meta.turtle).toBe(true)
    expect(svg).toContain('class="turtle-scale" transform="scale(1.1)"')
    expect(delay).toBeGreaterThan(0)
    expect(initialX).toBeGreaterThan(20)
    expect(initialX).toBeLessThan(width - 20)
  })

  it('synchronizes the winter turtle with ice contact, tracks and water feedback', () => {
    const turtleGrid = {
      ...grid,
      cells: grid.cells.map(cell => ({ ...cell, count: 1, level: 1 as const })),
    }
    const turtlePlan = plan(turtleGrid, 'winter-turtle')
    const winter = deriveEnvironment(momentFromText('2026-12-21', '12:00'), 'winter')
    const { svg, meta } = renderSVG(
      turtleGrid,
      turtlePlan,
      themeForEnvironment(winter),
      'winter-turtle',
      { environment: winter },
    )

    expect(meta.turtle).toBe(true)
    expect(svg).toContain('data-pond-part="turtle-water-feedback"')
    expect(svg).toContain('class="turtle-body"')
    expect(svg).toContain('class="turtle-shadow"')
    expect(svg).toContain('class="turtle-scale" transform="scale(1.1)"')
    expect(svg).toContain('class="paddle-phase paddle-front-left"')
    expect(svg).toContain('class="snow-track snow-track-0"')
    expect(svg).toContain('@keyframes turtle-body{')
    expect(svg).toContain('@keyframes turtle-shadow{')
    expect(svg).toContain('@keyframes turtle-front-paddle{')
    expect(svg).toContain('@keyframes turtle-rear-paddle{')
    expect(svg).toMatch(/translateY\(-6px\) rotate\(-?\d+(?:\.\d+)?deg\)/)
    expect(svg).toContain('@keyframes turtle-splash-out{')
    expect(svg).toContain('class="turtle-impact"')
    expect(svg.match(/class="turtle-droplet"/g)).toHaveLength(4)
    const turtleDelay = svg.match(/\.turtle\{[^}]*animation-delay:-([\d.]+)s/)?.[1]
    expect(Number(turtleDelay)).toBeGreaterThan(20)
    expect(svg).toContain('@keyframes snow-track-7{')
  })

  it('changes background shadow reach and softness with solar height', () => {
    const morning = deriveEnvironment(momentFromText('2026-10-15', '08:00'), 'autumn')
    const noon = deriveEnvironment(momentFromText('2026-10-15', '12:00'), 'autumn')
    const morningSvg = renderSVG(grid, pondPlan, themeForEnvironment(morning), 'seasonal-render', { environment: morning }).svg
    const noonSvg = renderSVG(grid, pondPlan, themeForEnvironment(noon), 'seasonal-render', { environment: noon }).svg
    const floorRule = (svg: string) => svg.match(/@keyframes floor\{[^@]+/)?.[0]
    const floorFilter = (svg: string) => svg.match(/<filter id="floorSoft"[^>]*>.*?<\/filter>/)?.[0]

    expect(floorRule(morningSvg)).not.toBe(floorRule(noonSvg))
    expect(floorFilter(morningSvg)).not.toBe(floorFilter(noonSvg))
  })
})
