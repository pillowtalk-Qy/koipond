import { describe, expect, it } from 'vitest'
import { demoGrid } from '../src/demo'
import { deriveEnvironment, momentFromText } from '../src/environment'
import { svgWidth } from '../src/layout'
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
    expect(summerSvg).toContain('data-lotus-state="open"')
    expect(summerSvg.match(/data-lotus-openness=/g)?.length).toBeGreaterThanOrEqual(3)
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
    expect(svg).toContain('scale(1.08,0.86)')
    expect(svg).toContain('rotate(-16deg)')
    expect(svg).toContain('class="turtle-impact"')
    expect(svg.match(/class="turtle-droplet"/g)).toHaveLength(4)
    const turtleAnimation = svg.match(/animation:turtle ([\d.]+)s linear infinite;animation-delay:-([\d.]+)s/)
    const turtleDuration = Number(turtleAnimation?.[1])
    const turtleDelay = Number(turtleAnimation?.[2])
    const initialX = -40 + (svgWidth(turtleGrid.weeks) + 80) * (turtleDelay / turtleDuration)
    const approachY = svg.match(/@keyframes turtle\{0%\{[^}]+\}[\d.]+%\{transform:translate\([^,]+,([\d.]+)px\)/)?.[1]
    expect(turtleDelay).toBeGreaterThan(0)
    expect(initialX).toBeGreaterThanOrEqual(48)
    expect(initialX).toBeLessThan(svgWidth(turtleGrid.weeks) * 0.12)
    expect(Number(approachY)).toBeLessThanOrEqual(154)
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

  it('preserves seasonal identity at night and closes summer lotus flowers', () => {
    const moment = momentFromText('2026-08-16', '00:00')
    const renders = (['spring', 'summer', 'autumn', 'winter'] as const).map(season => {
      const environment = deriveEnvironment(moment, season)
      return renderSVG(grid, pondPlan, themeForEnvironment(environment), 'seasonal-render', { environment }).svg
    })

    expect(new Set(renders).size).toBe(4)
    expect(renders[0]).not.toContain('data-seasonal-part=')
    expect(renders[1]).toContain('data-seasonal-part="summer-bloom"')
    expect(renders[1]).toContain('data-lotus-state="sleeping"')
    expect(renders[2]).toContain('data-seasonal-part="autumn-maple"')
    expect(renders[3]).toContain('data-seasonal-part="winter-ice"')
  })

  it('moves a restrained water-light path with the solar direction', () => {
    const morning = deriveEnvironment(momentFromText('2026-08-16', '06:15'), 'summer')
    const evening = deriveEnvironment(momentFromText('2026-08-16', '18:15'), 'summer')
    const morningSvg = renderSVG(grid, pondPlan, themeForEnvironment(morning), 'seasonal-render', { environment: morning }).svg
    const eveningSvg = renderSVG(grid, pondPlan, themeForEnvironment(evening), 'seasonal-render', { environment: evening }).svg
    const light = (svg: string) => svg.match(/<g data-pond-part="directional-light"[^>]*>.*?<\/g>/)?.[0]

    expect(light(morningSvg)).toBeTruthy()
    expect(light(eveningSvg)).toBeTruthy()
    expect(light(morningSvg)).not.toBe(light(eveningSvg))
  })
})
