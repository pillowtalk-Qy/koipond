import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fetchGrid, fetchGridPublic } from './github'
import { plan } from './planner'
import { THEMES } from './render/palette'
import { renderSVG } from './render/svg'
import type { Plan } from './types'

const user = process.env.KOIPOND_USER
const token = process.env.KOIPOND_TOKEN
const outputs = (process.env.KOIPOND_OUTPUTS ?? 'dist/koipond-light.svg\ndist/koipond-dark.svg?theme=dark')
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)

if (!user) {
  console.error('Missing github_user_name input')
  process.exit(1)
}

const grid = token ? await fetchGrid(user, token) : await fetchGridPublic(user)

const plans = new Map<string, Plan>()
const planFor = (seed: string) => {
  let p = plans.get(seed)
  if (!p) {
    p = plan(grid, seed)
    plans.set(seed, p)
  }
  return p
}

for (const line of outputs) {
  const [file, query] = line.split('?')
  if (!file.endsWith('.svg')) {
    console.error(`Skipping ${file}: only .svg outputs are supported for now`)
    continue
  }
  const params = new URLSearchParams(query ?? '')
  const themeKey = params.get('theme') === 'dark' ? 'dark' : 'light'
  const seed = params.get('seed') ?? user
  const { svg, meta } = renderSVG(grid, planFor(seed), THEMES[themeKey], seed)
  mkdirSync(dirname(file) || '.', { recursive: true })
  writeFileSync(file, svg)
  console.log(
    `${file}  ${(meta.bytes / 1024).toFixed(1)} KB | ${meta.plankton} plankton, ${meta.fish} fish, ` +
      `${meta.duration}s loop${meta.turtle ? ', turtle' : ''}${meta.lotus ? ', lotus' : ''}`,
  )
}
