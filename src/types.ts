export interface Cell {
  week: number
  day: number
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

export interface Grid {
  weeks: number
  cells: Cell[]
}

export interface Point {
  x: number
  y: number
}

export interface Waypoint extends Point {
  t: number
}

export type Species = 'koi' | 'minnow'

export interface FishPlan {
  id: number
  species: Species
  size: number
  start: Point
  waypoints: Waypoint[]
}

export interface EatEvent {
  cell: number
  t: number
  level: number
  x: number
  y: number
}

export interface Plan {
  duration: number
  fishes: FishPlan[]
  eats: EatEvent[]
}
