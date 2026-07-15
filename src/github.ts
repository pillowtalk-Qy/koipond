import { DAY_MS } from './util'
import type { Cell, Grid } from './types'

const QUERY = `query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
            weekday
          }
        }
      }
    }
  }
}`

const LEVELS: Record<string, Cell['level']> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
}

interface ApiDay {
  date: string
  contributionCount: number
  contributionLevel: string
  weekday: number
}

export async function fetchGrid(login: string, token: string): Promise<Grid> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'koipond',
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  })
  if (!res.ok) throw new Error(`GitHub API responded ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as {
    errors?: { message: string }[]
    data?: { user: { contributionsCollection: { contributionCalendar: { weeks: { contributionDays: ApiDay[] }[] } } } | null }
  }
  if (json.errors?.length) throw new Error(`GitHub API error: ${json.errors[0].message}`)
  const weeks = json.data?.user?.contributionsCollection.contributionCalendar.weeks
  if (!weeks) throw new Error(`GitHub user not found: ${login}`)

  const cells: Cell[] = []
  weeks.forEach((week, w) => {
    for (const day of week.contributionDays) {
      cells.push({
        week: w,
        day: day.weekday,
        date: day.date,
        count: day.contributionCount,
        level: LEVELS[day.contributionLevel] ?? 0,
      })
    }
  })
  return { weeks: weeks.length, cells }
}

export async function fetchGridPublic(login: string): Promise<Grid> {
  const res = await fetch(`https://github.com/users/${login}/contributions`, {
    headers: { 'user-agent': 'koipond' },
  })
  if (!res.ok) throw new Error(`GitHub responded ${res.status} for ${login}'s contribution page`)
  const html = await res.text()

  const days: { date: string; level: Cell['level'] }[] = []
  for (const m of html.matchAll(/<td[^>]+data-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const level = /data-level="(\d)"/.exec(m[0])?.[1]
    if (level !== undefined) days.push({ date: m[1], level: Number(level) as Cell['level'] })
  }
  if (days.length === 0) throw new Error(`No contribution cells found for ${login} (user missing or GitHub markup changed)`)

  days.sort((a, b) => a.date.localeCompare(b.date))
  const origin = new Date(days[0].date)
  const originSunday = origin.getTime() - origin.getUTCDay() * DAY_MS

  const cells: Cell[] = days.map(({ date, level }) => {
    const d = new Date(date)
    const week = Math.floor(Math.round((d.getTime() - originSunday) / DAY_MS) / 7)
    return { week, day: d.getUTCDay(), date, count: level, level }
  })
  return { weeks: Math.max(...cells.map(c => c.week)) + 1, cells }
}
