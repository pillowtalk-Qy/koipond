import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { demoGrid } from './demo'
import { fetchGrid, fetchGridPublic } from './github'
import { plan } from './planner'
import { THEMES } from './render/palette'
import { renderSVG } from './render/svg'
import { renderVideo } from './video'
import type { Grid } from './types'

const { values } = parseArgs({
  options: {
    user: { type: 'string' },
    token: { type: 'string' },
    demo: { type: 'boolean', default: false },
    seed: { type: 'string' },
    theme: { type: 'string', default: 'both' },
    out: { type: 'string', default: 'dist' },
    video: { type: 'string' },
  },
})

const seed = values.seed ?? values.user ?? 'koipond'

let grid: Grid
if (values.demo) {
  grid = demoGrid(seed)
} else {
  if (!values.user) {
    console.error('Usage: koipond --user <login> [--token <pat>] | koipond --demo [--seed <s>]')
    process.exit(1)
  }
  const token = values.token ?? process.env.GITHUB_TOKEN
  try {
    if (token) {
      grid = await fetchGrid(values.user, token)
    } else {
      console.log('No token, falling back to the public contributions page (levels only)')
      grid = await fetchGridPublic(values.user)
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

const themes = values.theme === 'both' ? (['light', 'dark'] as const) : ([values.theme] as ('light' | 'dark')[])
const p = plan(grid, seed)

mkdirSync(values.out, { recursive: true })
const outputs: Record<string, string> = {}
for (const key of themes) {
  const theme = THEMES[key]
  if (!theme) {
    console.error(`Unknown theme: ${key} (expected light | dark | both)`)
    process.exit(1)
  }
  const { svg, meta } = renderSVG(grid, p, theme, seed)
  const file = join(values.out, `koipond-${key}.svg`)
  writeFileSync(file, svg)
  outputs[key] = svg
  console.log(
    `${file}  ${(meta.bytes / 1024).toFixed(1)} KB | ${meta.plankton} plankton, ${meta.fish} fish, ` +
      `${meta.duration}s loop${meta.turtle ? ', turtle 🐢' : ''}${meta.lotus ? ', lotus 🪷' : ''}`,
  )
}

if (values.video) {
  const key = values.video.includes('dark') && outputs.dark ? 'dark' : themes[0]
  await renderVideo(outputs[key], values.video, p.duration)
  console.log(`${values.video}  rendered from the ${key} theme`)
}

if (outputs.light && outputs.dark) {
  const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  const preview = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>koipond preview</title>
<style>
body{margin:0;padding:32px;background:#0d1117;color:#e6edf3;font-family:ui-sans-serif,system-ui,sans-serif;display:grid;gap:28px;justify-items:center}
section{width:100%;max-width:960px}
h2{font-size:14px;font-weight:600;color:#8b949e;margin:0 0 10px}
img{width:100%;height:auto;display:block}
</style></head><body>
<h1 style="margin:0;font-size:20px">🎏 koipond: your contribution graph as a living koi pond</h1>
<section><h2>light</h2><img alt="light pond" src="${uri(outputs.light)}"></section>
<section><h2>dark (bioluminescent)</h2><img alt="dark pond" src="${uri(outputs.dark)}"></section>
</body></html>`
  const file = join(values.out, 'preview.html')
  writeFileSync(file, preview)
  console.log(`${file}  (open in a browser to watch the animation)`)
}
