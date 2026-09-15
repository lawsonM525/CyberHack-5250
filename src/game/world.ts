export interface Rect {
  x0: number
  z0: number
  x1: number
  z1: number
}

export const rect = (x0: number, z0: number, x1: number, z1: number): Rect => ({ x0, z0, x1, z1 })

export const ROOM = { x0: -6, z0: -4.5, x1: 6, z1: 4.5, height: 3.3, wall: 0.25 }

/** North wall opening that leads to the private balcony. */
export const DOORWAY = { x0: 2.6, x1: 4.4 }

export const WALKABLE = {
  room: rect(-5.85, -4.35, 5.85, 4.35),
  doorway: rect(DOORWAY.x0 + 0.1, -4.62, DOORWAY.x1 - 0.1, -4.3),
  balcony: rect(1.75, -6.65, 5.05, -4.55),
  bridge: rect(3.05, -16.6, 4.15, -6.6),
  far: rect(1.95, -18.65, 5.45, -16.5),
} as const

export const FAR_BALCONY = { z: -16.6, y: 0 }

/** Axis-aligned furniture/wall footprints the player cannot walk through. */
export const BLOCKERS: Rect[] = [
  rect(-5.55, -4.4, -2.7, -3.45), // desk
  rect(-4.45, -3.45, -3.35, -2.55), // desk chair
  rect(-2.25, -4.4, 1.95, -3.6), // window garden planters
  rect(-5.45, 2.85, -2.15, 4.4), // sunken velvet lounge, plinth included
  rect(-4.65, 1.45, -3.15, 2.45), // coffee table
  rect(-5.9, 2.55, -5.2, 3.25), // floor lamp
  rect(0.45, 3.85, 2.95, 4.4), // bookshelf
  rect(3.35, 3.85, 4.75, 4.4), // record console
  rect(4.95, -1.25, 5.9, 1.45), // vanity
  rect(4.15, -0.25, 4.95, 0.65), // vanity stool
  rect(4.95, 2.15, 5.9, 3.65), // kitchenette counter
  rect(5.15, -3.25, 5.9, -2.35), // corner palm
  rect(-2.1, 3.7, -0.1, 4.4), // open wardrobe
  rect(-2.7, -4.4, -2.2, -3.6), // mushroom lamp, tucked between desk and planters
  rect(0.03, -2.62, 0.67, -1.98), // side table
  rect(-2.72, 0.98, -2.08, 1.62), // floor cushion by the lounge
  rect(-5.42, 0.63, -4.78, 1.27), // floor cushion by the west wall
  rect(-2.0, -1.9, -1.2, -1.1), // pouf (west)
  rect(1.41, -1.26, 2.09, -0.54), // pouf (east)
  rect(-5.75, -1.55, -5.05, -0.75), // tall monstera pot
  rect(-5.78, -0.08, -5.22, 0.48), // fern pot on the west wall
  rect(2.18, -3.72, 2.82, -3.08), // window palm pot
  rect(1.75, -6.65, 3.0, -6.45), // balcony railing (outer, west of the gate)
  rect(4.2, -6.65, 5.05, -6.45), // balcony railing (outer, east of the gate)
  rect(1.7, -4.78, 2.6, -4.5), // north wall pier, west of the balcony door
  rect(4.4, -4.78, 5.15, -4.5), // north wall pier, east of the balcony door
  rect(1.75, -6.65, 1.95, -4.55), // balcony railing (west)
  rect(4.85, -6.65, 5.05, -4.55), // balcony railing (east)
]

/** The railing segment that retracts when the span deploys. */
export const GATE: Rect = rect(3.0, -6.66, 4.2, -6.44)

export const PLAYER_RADIUS = 0.3

function inside(r: Rect, x: number, z: number, pad = 0): boolean {
  return x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad
}

export function isWalkable(x: number, z: number, bridgeOpen: boolean): boolean {
  const areas: Rect[] = [WALKABLE.room, WALKABLE.doorway, WALKABLE.balcony]
  if (bridgeOpen) {
    areas.push(WALKABLE.bridge, WALKABLE.far)
  }
  let ok = false
  for (const a of areas) {
    if (inside(a, x, z)) {
      ok = true
      break
    }
  }
  if (!ok) return false
  for (const b of BLOCKERS) {
    if (b === GATE) continue
    if (inside(b, x, z, PLAYER_RADIUS)) return false
  }
  if (!bridgeOpen && inside(GATE, x, z, PLAYER_RADIUS)) return false
  return true
}

/** Per-axis slide so the player never sticks on a corner. */
export function resolveMove(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  bridgeOpen: boolean,
): [number, number] {
  let x = fromX
  let z = fromZ
  // spawned or nudged inside geometry: let her walk straight back out
  if (!isWalkable(fromX, fromZ, bridgeOpen)) return [toX, toZ]
  if (isWalkable(toX, z, bridgeOpen)) x = toX
  if (isWalkable(x, toZ, bridgeOpen)) z = toZ
  if (x === fromX && z === fromZ && isWalkable(toX, toZ, bridgeOpen)) {
    x = toX
    z = toZ
  }
  return [x, z]
}

/**
 * Solid masses the camera must stay out of. They run well past the wall itself:
 * a slab only as thick as the wall lets the boom overshoot and frame the city
 * from outside the flat.
 */
export const CAMERA_WALLS: Rect[] = [
  rect(ROOM.x0 - 12, ROOM.z1, ROOM.x1 + 12, ROOM.z1 + 24), // south wall and the block behind it
  rect(ROOM.x0 - 12, ROOM.z0 - 0.3, ROOM.x0, ROOM.z1 + 24), // west
  rect(ROOM.x1, ROOM.z0 - 0.3, ROOM.x1 + 12, ROOM.z1 + 24), // east
  rect(ROOM.x0 - 12, -6.4, 1.7, ROOM.z0), // north, window side and the air outside it
  rect(1.7, ROOM.z0 - 0.28, DOORWAY.x0, ROOM.z0), // north, beside the balcony
  rect(DOORWAY.x1, ROOM.z0 - 0.28, 5.15, ROOM.z0), // north, balcony-side pier
  rect(5.15, -6.4, ROOM.x1 + 12, ROOM.z0), // north, east of the balcony
  rect(-10, -30, 14, -18.7), // Kingsley Row facade and balcony recess wall
]

/** Tall furniture the boom should ride around instead of burying itself in. */
const CAMERA_PROPS: Rect[] = [
  rect(-5.45, 2.85, -2.15, 4.4), // sunken velvet lounge
  rect(0.45, 3.85, 2.95, 4.4), // bookshelf
  rect(3.35, 3.85, 4.75, 4.4), // record console
  rect(4.95, -1.25, 5.9, 1.45), // vanity
  rect(4.95, 2.15, 5.9, 3.65), // kitchenette counter
  rect(5.15, -3.25, 5.9, -2.35), // corner palm
  rect(-2.25, -4.4, 1.95, -3.6), // window garden planters
  rect(-5.55, -4.4, -2.7, -3.45), // desk
  rect(-2.1, 3.7, -0.1, 4.4), // open wardrobe
  rect(-5.75, -1.55, -5.05, -0.75), // tall monstera pot
]

/** Keeps the boom a body's width off any wall, so it never grazes through one. */
const CAMERA_SKIN = 0.45

export function cameraBlocked(x: number, z: number): boolean {
  for (const w of CAMERA_WALLS) {
    if (inside(w, x, z, CAMERA_SKIN)) return true
  }
  for (const p of CAMERA_PROPS) {
    if (inside(p, x, z, 0.22)) return true
  }
  return false
}

export type InteractKind = 'computer' | 'inspect' | 'mirror' | 'doorbell' | 'bakery'

export interface Interactable {
  id: string
  kind: InteractKind
  label: string
  /** World position of the prompt. */
  at: [number, number, number]
  radius: number
}

export const INTERACTABLES: Interactable[] = [
  { id: 'computer', kind: 'computer', label: 'Use terminal', at: [-4.1, 1.05, -3.75], radius: 1.35 },
  { id: 'plant-jasmine', kind: 'inspect', label: 'Read tag — Night Jasmine', at: [-1.7, 0.75, -3.75], radius: 0.95 },
  { id: 'plant-fern', kind: 'inspect', label: 'Read tag — Silver Fern', at: [-0.6, 0.75, -3.75], radius: 0.95 },
  { id: 'plant-monstera', kind: 'inspect', label: 'Read tag — Monstera', at: [0.55, 0.75, -3.75], radius: 0.95 },
  { id: 'plant-orchid', kind: 'inspect', label: 'Read tag — Night Orchid', at: [1.65, 0.75, -3.75], radius: 0.95 },
  { id: 'record', kind: 'inspect', label: 'Look at record sleeve', at: [4.05, 1.0, 3.8], radius: 1.0 },
  { id: 'speaker', kind: 'inspect', label: 'Listen to the speaker', at: [3.55, 0.7, 3.8], radius: 0.9 },
  { id: 'incense', kind: 'inspect', label: 'Incense burner', at: [-3.9, 0.55, 1.95], radius: 1.0 },
  { id: 'photo', kind: 'inspect', label: 'Framed photograph', at: [1.0, 1.55, 3.85], radius: 1.0 },
  { id: 'books', kind: 'inspect', label: 'Stack of books', at: [2.3, 1.15, 3.85], radius: 1.0 },
  { id: 'vanity', kind: 'mirror', label: 'Check yourself out', at: [5.2, 1.2, 0.1], radius: 1.2 },
  { id: 'bakery', kind: 'bakery', label: 'Sugarloaf night hatch', at: [5.45, 1.15, 2.9], radius: 1.35 },
  { id: 'window', kind: 'inspect', label: 'Look out the window', at: [-0.1, 1.5, -4.3], radius: 1.1 },
  { id: 'doorbell', kind: 'doorbell', label: 'Ring the bell', at: [4.48, 1.17, -18.6], radius: 1.5 },
]
