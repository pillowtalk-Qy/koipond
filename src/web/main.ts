import { gridFromDays, type Day } from '../github'
import { deriveEnvironment, momentAtTimezone, momentFromText, type PondEnvironment } from '../environment'
import { plan } from '../planner'
import { THEMES, themeForEnvironment } from '../render/palette'
import { renderSVG } from '../render/svg'
import type { Grid, Plan } from '../types'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const form = $<HTMLFormElement>('form')
const input = $<HTMLInputElement>('user')
const button = $<HTMLButtonElement>('go')
const status = $<HTMLParagraphElement>('status')
const result = $<HTMLDivElement>('result')
const pond = $<HTMLDivElement>('pond')
const tabs = $<HTMLDivElement>('tabs')
const download = $<HTMLAnchorElement>('download')
const installLink = $<HTMLAnchorElement>('install-link')
const installNote = $<HTMLSpanElement>('install-note')
const repoLink = $<HTMLAnchorElement>('repo-link')
const snippet = $<HTMLElement>('snippet')
const copy = $<HTMLButtonElement>('copy')
const live = $<HTMLInputElement>('live')
const date = $<HTMLInputElement>('date')
const time = $<HTMLInputElement>('time')
const momentLabel = $<HTMLSpanElement>('moment-label')

const workflowFor = () => `name: koipond
on:
  schedule:
    - cron: "17 * * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: pillowtalk-Qy/koipond@34504b81de2a26b443629e6f9b61c004afde1cee
        with:
          github_user_name: ${'$'}{{ github.repository_owner }}
          outputs: |
            dist/koipond.svg?environment=auto&timezone=480&latitude=22.3193&longitude=114.1694
      - uses: crazy-max/ghaction-github-pages@df5cc2bfa78282ded844b354faee141f06b41865 # v4
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: ${'$'}{{ secrets.GITHUB_TOKEN }}
`

const snippetFor = (user: string) => `<img alt="koipond" src="https://raw.githubusercontent.com/${user}/${user}/output/koipond.svg">
<br>
<sub>This pond follows Hong Kong time and season. Contributions feed it; its fish remember. · <a href="https://raw.githubusercontent.com/${user}/${user}/output/pond-state.json">verify state</a></sub>`

function fillInstall(user: string) {
  const params = new URLSearchParams({
    filename: '.github/workflows/koipond.yml',
    value: workflowFor(),
  })
  installLink.href = `https://github.com/${user}/${user}/new/main?${params}`
  installNote.textContent = `opens ${user}/${user} prefilled, just press commit`
  repoLink.href = `https://github.com/new?name=${encodeURIComponent(user)}`
  snippet.textContent = snippetFor(user)
}

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

type ViewMode = 'auto' | 'light' | 'dark'

const svgs: Record<ViewMode, string> = { auto: '', light: '', dark: '' }
let active: ViewMode = 'auto'
let currentGrid: Grid | null = null
let currentPlan: Plan | null = null
let currentUser = ''

const pad = (value: number) => String(value).padStart(2, '0')

function updateLiveInputs() {
  const moment = momentAtTimezone(new Date())
  date.value = `${moment.year}-${pad(moment.month)}-${pad(moment.day)}`
  time.value = `${pad(Math.floor(moment.minuteOfDay / 60))}:${pad(moment.minuteOfDay % 60)}`
}

function selectedEnvironment(): PondEnvironment {
  return deriveEnvironment(momentFromText(date.value, time.value))
}

function renderAuto() {
  if (!currentGrid || !currentPlan) return
  if (live.checked) updateLiveInputs()
  const environment = selectedEnvironment()
  const environmentPlan = plan(currentGrid, currentUser, undefined, environment)
  svgs.auto = renderSVG(
    currentGrid,
    environmentPlan,
    themeForEnvironment(environment),
    currentUser,
    { environment },
  ).svg
  const clock = `${pad(Math.floor(environment.minuteOfDay / 60))}:${pad(environment.minuteOfDay % 60)}`
  momentLabel.textContent = `${environment.date} · ${clock} HKT · ${environment.season} · ${environment.phase}`
  for (const button of document.querySelectorAll<HTMLButtonElement>('.season-jump')) {
    button.classList.toggle('on', button.dataset.season === environment.season)
  }
}

function show(mode: ViewMode) {
  active = mode
  if (mode === 'auto') renderAuto()
  pond.innerHTML = svgs[mode]
  const svg = pond.querySelector('svg')
  if (svg) {
    svg.removeAttribute('width')
    svg.removeAttribute('height')
  }
  download.href = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgs[mode])))}`
  download.download = `koipond-${mode}.svg`
  for (const b of tabs.querySelectorAll('button')) {
    b.classList.toggle('on', b.dataset.theme === mode)
  }
  document.body.classList.toggle('fixed-environment', mode !== 'auto')
}

async function generate(user: string) {
  button.disabled = true
  status.textContent = 'Fetching contributions and simulating the pond...'
  result.hidden = true
  try {
    const grid = await fetchGrid(user)
    const p = plan(grid, user)
    currentGrid = grid
    currentPlan = p
    currentUser = user
    svgs.light = renderSVG(grid, p, THEMES.light, user).svg
    svgs.dark = renderSVG(grid, p, THEMES.dark, user).svg
    renderAuto()
    status.textContent = ''
    result.hidden = false
    show(active)
    fillInstall(user)
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

document.querySelectorAll<HTMLButtonElement>('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const user = chip.dataset.user ?? ''
    if (user) {
      input.value = user
      void generate(user)
    }
  })
})

tabs.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button')
  if (b?.dataset.theme) show(b.dataset.theme as ViewMode)
})

live.addEventListener('change', () => {
  if (live.checked) updateLiveInputs()
  if (active === 'auto') show('auto')
})

for (const control of [date, time]) {
  control.addEventListener('input', () => {
    live.checked = false
    if (active === 'auto') show('auto')
  })
}

document.querySelectorAll<HTMLButtonElement>('.season-jump').forEach(button => {
  button.addEventListener('click', () => {
    const year = date.value.slice(0, 4) || String(momentAtTimezone(new Date()).year)
    date.value = `${year}-${button.dataset.monthDay}`
    time.value = '12:00'
    live.checked = false
    show('auto')
  })
})

copy.addEventListener('click', () => {
  void navigator.clipboard.writeText(snippet.textContent ?? '').then(() => {
    copy.textContent = 'Copied!'
    setTimeout(() => {
      copy.textContent = 'Copy snippet'
    }, 1500)
  })
})

const preset = new URLSearchParams(location.search).get('user')
updateLiveInputs()
setInterval(() => {
  if (live.checked && active === 'auto' && currentGrid) show('auto')
}, 60_000)
if (preset) {
  input.value = preset
  void generate(preset)
}
