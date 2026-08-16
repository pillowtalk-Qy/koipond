import { describe, expect, it } from 'vitest'
import { deriveEnvironment, momentFromText } from '../src/environment'
import { themeForEnvironment } from '../src/render/palette'

describe('environment palette', () => {
  it('uses the original light and dark visual systems as time endpoints', () => {
    const noon = themeForEnvironment(deriveEnvironment(momentFromText('2026-08-16', '12:00')))
    const midnight = themeForEnvironment(deriveEnvironment(momentFromText('2026-08-16', '00:00')))
    expect(noon.key).toBe('light')
    expect(noon.caustics).toBe(true)
    expect(midnight.key).toBe('dark')
    expect(midnight.caustics).toBe(false)
    expect(noon.waterTop).not.toBe(midnight.waterTop)
  })

  it('keeps the same theme structure while seasons alter its ecology colors', () => {
    const moment = momentFromText('2026-08-16', '12:00')
    const spring = themeForEnvironment(deriveEnvironment(moment, 'spring'))
    const autumn = themeForEnvironment(deriveEnvironment(moment, 'autumn'))
    const winter = themeForEnvironment(deriveEnvironment(moment, 'winter'))
    expect(spring.waterTop).not.toBe(autumn.waterTop)
    expect(autumn.lily).not.toBe(winter.lily)
    expect(spring.koi).toEqual(winter.koi)
    expect(spring.plankton).toHaveLength(winter.plankton.length)
  })

  it('gives dawn and dusk distinct transitions', () => {
    const dawn = themeForEnvironment(deriveEnvironment(momentFromText('2026-08-16', '05:45')))
    const dusk = themeForEnvironment(deriveEnvironment(momentFromText('2026-08-16', '18:45')))
    expect(dawn.waterTop).not.toBe(dusk.waterTop)
    const morning = themeForEnvironment(deriveEnvironment(momentFromText('2026-08-16', '08:00')))
    const afternoon = themeForEnvironment(deriveEnvironment(momentFromText('2026-08-16', '16:00')))
    expect(morning.waterTop).not.toBe(afternoon.waterTop)
    expect(morning.fishFilter).not.toBe(afternoon.fishFilter)
  })
})
