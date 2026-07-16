import { gridFromDays, type Day } from '../github'
import { plan } from '../planner'
import { THEMES } from '../render/palette'
import { renderSVG } from '../render/svg'
import type { Grid } from '../types'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const form = $<HTMLFormElement>('form')
const input = $<HTMLInputElement>('user')
const button = $<HTMLButtonElement>('go')
const status = $<HTMLParagraphElement>('status')
const result = $<HTMLDivElement>('result')
const pond = $<HTMLDivElement>('pond')
const tabs = $<HTMLDivElement>('tabs')
const download = $<HTMLAnchorElement>('download')

interface ApiResponse {
  contributions: { date: string; count: number; level: Day['level'] }[]
}

async function fetchGrid(user: string): Promise<Grid> {
  const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`)
  if (!res.ok) throw new Error(res.status === 404 ? `User not found: ${user}` : `Contribution API responded ${res.status}`)
  const json = (await res.json()) as ApiResponse
  if (!json.contributions?.length) throw new Error(`No contributions found for ${user}`)
  return gridFromDays(json.contributions)
}

const svgs: Record<'light' | 'dark', string> = { light: '', dark: '' }
let active: 'light' | 'dark' = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

function show(theme: 'light' | 'dark') {
  active = theme
  pond.innerHTML = svgs[theme]
  const svg = pond.querySelector('svg')
  if (svg) {
    svg.removeAttribute('width')
    svg.removeAttribute('height')
  }
  download.href = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgs[theme])))}`
  download.download = `koipond-${theme}.svg`
  for (const b of tabs.querySelectorAll('button')) {
    b.classList.toggle('on', b.dataset.theme === theme)
  }
}

async function generate(user: string) {
  button.disabled = true
  status.textContent = 'Fetching contributions and simulating the pond...'
  result.hidden = true
  try {
    const grid = await fetchGrid(user)
    const p = plan(grid, user)
    svgs.light = renderSVG(grid, p, THEMES.light, user).svg
    svgs.dark = renderSVG(grid, p, THEMES.dark, user).svg
    status.textContent = ''
    result.hidden = false
    show(active)
    history.replaceState(null, '', `?user=${encodeURIComponent(user)}`)
  } catch (err) {
    status.textContent = err instanceof Error ? err.message : String(err)
  } finally {
    button.disabled = false
  }
}

form.addEventListener('submit', e => {
  e.preventDefault()
  const user = input.value.trim()
  if (user) void generate(user)
})

tabs.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button')
  if (b?.dataset.theme) show(b.dataset.theme as 'light' | 'dark')
})

const preset = new URLSearchParams(location.search).get('user')
if (preset) {
  input.value = preset
  void generate(preset)
}
