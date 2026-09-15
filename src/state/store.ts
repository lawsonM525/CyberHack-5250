import { create } from 'zustand'
import { DEFAULT_LOOK, type LookId, LOOKS } from '../content/presets'

export type Phase =
  | 'title'
  | 'select'
  | 'playing'

export type MissionStage =
  | 'arrived'
  | 'briefed'
  | 'unlocked'
  | 'crossed'

export type Overlay = null | 'computer' | 'inspect' | 'pause' | 'complete'

export type TermTheme = 'amber' | 'green' | 'magenta' | 'ice'

export interface Settings {
  termTheme: TermTheme
  music: number
  sfx: number
  muted: boolean
  reducedMotion: boolean
  quality: 'low' | 'medium' | 'high'
  invertY: boolean
  sensitivity: number
}

export interface SaveShape {
  version: number
  look: LookId
  stage: MissionStage
  inspected: string[]
  hintsUsed: number
  position: [number, number]
  facing: number
  settings: Settings
}

const SAVE_KEY = 'cyberhack5250.save.v1'
const SAVE_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  termTheme: 'amber',
  music: 0.6,
  sfx: 0.8,
  muted: false,
  reducedMotion: false,
  quality: 'high',
  invertY: false,
  sensitivity: 1,
}

export const SPAWN: [number, number] = [0.6, 1.3]

interface GameState {
  phase: Phase
  overlay: Overlay
  look: LookId
  stage: MissionStage
  inspected: string[]
  inspectingId: string | null
  hintsUsed: number
  /** Objective line shown in the HUD. */
  objective: string
  toast: { id: number; title: string; body: string } | null
  hasSave: boolean
  /** Bumped to command the player controller to teleport (load / reset). */
  respawn: { at: [number, number]; facing: number; nonce: number }
  bridgeDeployedAt: number | null
  codeAttempts: number
  cityGlitch: number

  setPhase: (p: Phase) => void
  setOverlay: (o: Overlay) => void
  setLook: (l: LookId) => void
  startNew: () => void
  continueSave: () => void
  resetGame: () => void
  openInspect: (id: string) => void
  closeOverlay: () => void
  brief: () => void
  unlock: () => void
  cross: () => void
  useHint: () => void
  bumpAttempts: () => void
  pushToast: (title: string, body: string) => void
  clearToast: () => void
  setSettings: (patch: Partial<Settings>) => void
  settings: Settings
  savePosition: (pos: [number, number], facing: number) => void
  lastPosition: [number, number]
  lastFacing: number
}

function readSave(): SaveShape | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const s = parsed as Partial<SaveShape>
    if (s.version !== SAVE_VERSION) return null
    const stages: MissionStage[] = ['arrived', 'briefed', 'unlocked', 'crossed']
    const look = LOOKS.some((l) => l.id === s.look) ? (s.look as LookId) : DEFAULT_LOOK
    const stage = stages.includes(s.stage as MissionStage) ? (s.stage as MissionStage) : 'arrived'
    const position: [number, number] =
      Array.isArray(s.position) &&
      s.position.length === 2 &&
      s.position.every((n) => typeof n === 'number' && Number.isFinite(n))
        ? [s.position[0], s.position[1]]
        : SPAWN
    return {
      version: SAVE_VERSION,
      look,
      stage,
      inspected: Array.isArray(s.inspected) ? s.inspected.filter((i) => typeof i === 'string') : [],
      hintsUsed: typeof s.hintsUsed === 'number' && s.hintsUsed >= 0 ? Math.floor(s.hintsUsed) : 0,
      position,
      facing: typeof s.facing === 'number' && Number.isFinite(s.facing) ? s.facing : 0,
      settings: { ...DEFAULT_SETTINGS, ...(typeof s.settings === 'object' && s.settings ? s.settings : {}) },
    }
  } catch {
    return null
  }
}

const booted = readSave()

function objectiveFor(stage: MissionStage): string {
  switch (stage) {
    case 'arrived':
      return 'Settle in. Something came through on your terminal.'
    case 'briefed':
      return 'Find the four digit key Orchid left in the apartment.'
    case 'unlocked':
      return 'The span is out. Cross to the Kingsley Row balcony.'
    case 'crossed':
      return 'Take it in. The night is yours.'
  }
}

export const useGame = create<GameState>((set, get) => ({
  phase: 'title',
  overlay: null,
  look: booted?.look ?? DEFAULT_LOOK,
  stage: 'arrived',
  inspected: [],
  inspectingId: null,
  hintsUsed: 0,
  objective: objectiveFor('arrived'),
  toast: null,
  hasSave: booted !== null,
  respawn: { at: SPAWN, facing: 0, nonce: 0 },
  bridgeDeployedAt: null,
  codeAttempts: 0,
  cityGlitch: 0,
  settings: booted?.settings ?? DEFAULT_SETTINGS,
  lastPosition: SPAWN,
  lastFacing: 0,

  setPhase: (phase) => set({ phase }),
  setOverlay: (overlay) => set({ overlay }),
  setLook: (look) => set({ look }),

  startNew: () =>
    set((s) => ({
      phase: 'playing',
      overlay: null,
      stage: 'arrived',
      inspected: [],
      hintsUsed: 0,
      codeAttempts: 0,
      bridgeDeployedAt: null,
      objective: objectiveFor('arrived'),
      respawn: { at: SPAWN, facing: 0, nonce: s.respawn.nonce + 1 },
    })),

  continueSave: () => {
    const save = readSave()
    if (!save) {
      get().startNew()
      return
    }
    set((s) => ({
      phase: 'playing',
      overlay: null,
      look: save.look,
      stage: save.stage,
      inspected: save.inspected,
      hintsUsed: save.hintsUsed,
      settings: save.settings,
      objective: objectiveFor(save.stage),
      bridgeDeployedAt: save.stage === 'unlocked' || save.stage === 'crossed' ? -1 : null,
      respawn: { at: save.position, facing: save.facing, nonce: s.respawn.nonce + 1 },
    }))
  },

  resetGame: () => {
    try {
      localStorage.removeItem(SAVE_KEY)
    } catch {
      /* storage unavailable — in-memory reset still applies */
    }
    set((s) => ({
      phase: 'select',
      overlay: null,
      hasSave: false,
      stage: 'arrived',
      inspected: [],
      hintsUsed: 0,
      codeAttempts: 0,
      bridgeDeployedAt: null,
      objective: objectiveFor('arrived'),
      respawn: { at: SPAWN, facing: 0, nonce: s.respawn.nonce + 1 },
    }))
  },

  openInspect: (id) =>
    set((s) => ({
      overlay: 'inspect',
      inspectingId: id,
      inspected: s.inspected.includes(id) ? s.inspected : [...s.inspected, id],
    })),

  closeOverlay: () => set({ overlay: null, inspectingId: null }),

  brief: () =>
    set((s) =>
      s.stage === 'arrived' ? { stage: 'briefed', objective: objectiveFor('briefed') } : {},
    ),

  unlock: () =>
    set((s) =>
      s.stage === 'briefed' || s.stage === 'arrived'
        ? {
            stage: 'unlocked',
            objective: objectiveFor('unlocked'),
            bridgeDeployedAt: performance.now(),
            cityGlitch: s.cityGlitch + 1,
          }
        : {},
    ),

  cross: () =>
    set((s) =>
      s.stage === 'unlocked'
        ? { stage: 'crossed', objective: objectiveFor('crossed'), overlay: 'complete' }
        : {},
    ),

  useHint: () => set((s) => ({ hintsUsed: Math.min(s.hintsUsed + 1, 4) })),
  bumpAttempts: () => set((s) => ({ codeAttempts: s.codeAttempts + 1 })),

  pushToast: (title, body) => set({ toast: { id: Date.now(), title, body } }),
  clearToast: () => set({ toast: null }),

  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  savePosition: (pos, facing) => set({ lastPosition: pos, lastFacing: facing }),
}))

if (import.meta.env.DEV) {
  // handle for scripted play-through checks in the dev build
  ;(window as unknown as { __game?: typeof useGame }).__game = useGame
}

/** Persist a snapshot of the current run. Safe to call often. */
export function persist(): void {
  const s = useGame.getState()
  if (s.phase !== 'playing') return
  const data: SaveShape = {
    version: SAVE_VERSION,
    look: s.look,
    stage: s.stage,
    inspected: s.inspected,
    hintsUsed: s.hintsUsed,
    position: s.lastPosition,
    facing: s.lastFacing,
    settings: s.settings,
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    if (!useGame.getState().hasSave) useGame.setState({ hasSave: true })
  } catch {
    /* quota or private mode — the run simply will not persist */
  }
}
