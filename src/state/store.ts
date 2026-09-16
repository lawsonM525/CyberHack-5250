import { create } from 'zustand'
import { DEFAULT_LOOK, type LookId, LOOKS } from '../content/presets'
import { BEATS, getFriend } from '../content/friends'
import { getBakeryItem } from '../content/bakery'
import type { PingTone, TrackId } from '../audio/audio'

export type Phase =
  | 'title'
  | 'select'
  | 'playing'

export type MissionStage =
  | 'arrived'
  | 'briefed'
  | 'unlocked'
  | 'crossed'

export type Overlay = null | 'computer' | 'inspect' | 'pause' | 'complete' | 'bakery'

export interface ChatLine {
  id: string
  friend: string
  from: 'them' | 'you'
  text: string
}

export interface Notif {
  id: number
  title: string
  body: string
  accent: string
  kind: 'story' | 'text' | 'credit' | 'treat'
  /** Signature sound, so each friend is recognisable without looking. */
  tone?: PingTone
  /** Arrival time, printed in the log the way a terminal timestamps a line. */
  at: number
}

let nextNotifId = 1

export const GIFT_AMOUNT = 25
/** Fictional credits. Nothing here touches real money. */
export const RETAINER = 60
export const CLUE_BOUNTY = 25
export const PANEL_BOUNTY = 250
export const CROSSING_BOUNTY = 400

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
  track: TrackId
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
  /** Added after the first release; older saves simply start empty. */
  credits?: number
  chats?: ChatLine[]
  delivered?: string[]
  gifted?: string[]
  pantry?: string[]
}

const SAVE_KEY = 'cyberhack5250.save.v1'
const SAVE_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  termTheme: 'green',
  music: 0.6,
  sfx: 0.8,
  muted: false,
  reducedMotion: false,
  quality: 'high',
  invertY: false,
  sensitivity: 1,
  track: 'rhodes',
}

/** Standing on the rug, angled into the velvet pit so the opening frame is the lounge. */
export const SPAWN: [number, number] = [-1.35, 1.55]
export const SPAWN_FACING = 2.3

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
  notifs: Notif[]
  hasSave: boolean
  credits: number
  chats: ChatLine[]
  /** Beat ids already delivered this run. */
  delivered: string[]
  unreadChats: number
  gifted: string[]
  /** Bakery items bought this run. */
  pantry: string[]
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
  notify: (n: Omit<Notif, 'id' | 'at'>) => void
  dismissNotif: (id: number) => void
  clearNotifs: () => void
  earn: (amount: number, reason: string) => void
  deliverBeat: (beatId: string) => void
  markChatsRead: () => void
  sendReply: (beatId: string, replyIndex: number) => void
  giftCredits: (friendId: string) => void
  buyBread: (itemId: string) => void
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
      credits: typeof s.credits === 'number' && s.credits >= 0 ? Math.floor(s.credits) : 0,
      chats: Array.isArray(s.chats) ? s.chats.filter(isChatLine) : [],
      delivered: strings(s.delivered),
      gifted: strings(s.gifted),
      pantry: strings(s.pantry),
    }
  } catch {
    return null
  }
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((i): i is string => typeof i === 'string') : []
}

function isChatLine(v: unknown): v is ChatLine {
  if (!v || typeof v !== 'object') return false
  const c = v as Partial<ChatLine>
  return typeof c.id === 'string' && typeof c.friend === 'string' && typeof c.text === 'string' &&
    (c.from === 'them' || c.from === 'you')
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
  notifs: [],
  hasSave: booted !== null,
  credits: 0,
  chats: [],
  delivered: [],
  unreadChats: 0,
  gifted: [],
  pantry: [],
  respawn: { at: SPAWN, facing: SPAWN_FACING, nonce: 0 },
  bridgeDeployedAt: null,
  codeAttempts: 0,
  cityGlitch: 0,
  settings: booted?.settings ?? DEFAULT_SETTINGS,
  lastPosition: SPAWN,
  lastFacing: SPAWN_FACING,

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
      credits: 0,
      chats: [],
      delivered: [],
      unreadChats: 0,
      gifted: [],
      pantry: [],
      notifs: [],
      respawn: { at: SPAWN, facing: SPAWN_FACING, nonce: s.respawn.nonce + 1 },
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
      credits: save.credits ?? 0,
      chats: save.chats ?? [],
      delivered: save.delivered ?? [],
      unreadChats: 0,
      gifted: save.gifted ?? [],
      pantry: save.pantry ?? [],
      notifs: [],
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
      credits: 0,
      chats: [],
      delivered: [],
      unreadChats: 0,
      gifted: [],
      pantry: [],
      notifs: [],
      respawn: { at: SPAWN, facing: SPAWN_FACING, nonce: s.respawn.nonce + 1 },
    }))
  },

  openInspect: (id) => {
    const fresh = !get().inspected.includes(id)
    set((s) => ({
      overlay: 'inspect',
      inspectingId: id,
      inspected: fresh ? [...s.inspected, id] : s.inspected,
    }))
    if (fresh && id.startsWith('plant-')) get().earn(CLUE_BOUNTY, 'plant tag logged')
  },

  closeOverlay: () => set({ overlay: null, inspectingId: null }),

  brief: () => {
    if (get().stage !== 'arrived') return
    set({ stage: 'briefed', objective: objectiveFor('briefed') })
    get().earn(RETAINER, 'Orchid sent your retainer')
  },

  unlock: () => {
    const s = get()
    if (s.stage !== 'briefed' && s.stage !== 'arrived') return
    set({
      stage: 'unlocked',
      objective: objectiveFor('unlocked'),
      bridgeDeployedAt: performance.now(),
      cityGlitch: s.cityGlitch + 1,
    })
    get().earn(PANEL_BOUNTY, 'panel thinned — bounty cleared')
  },

  cross: () => {
    if (get().stage !== 'unlocked') return
    set({ stage: 'crossed', objective: objectiveFor('crossed'), overlay: 'complete' })
    get().earn(CROSSING_BOUNTY, 'delivery confirmed at Kingsley Row')
  },

  useHint: () => set((s) => ({ hintsUsed: Math.min(s.hintsUsed + 1, 4) })),
  bumpAttempts: () => set((s) => ({ codeAttempts: s.codeAttempts + 1 })),

  pushToast: (title, body) => get().notify({ title, body, accent: '#ffb877', kind: 'story' }),

  notify: (n) =>
    set((s) => ({ notifs: [...s.notifs, { ...n, id: nextNotifId++, at: Date.now() }].slice(-5) })),

  dismissNotif: (id) => set((s) => ({ notifs: s.notifs.filter((n) => n.id !== id) })),

  clearNotifs: () => set({ notifs: [] }),

  earn: (amount, reason) => {
    set((s) => ({ credits: s.credits + amount }))
    get().notify({
      title: 'credits',
      body: `+${amount} \u00a2r \u2014 ${reason}`,
      accent: '#ffd07a',
      kind: 'credit',
    })
  },

  deliverBeat: (beatId) => {
    const beat = BEATS.find((b) => b.id === beatId)
    if (!beat || get().delivered.includes(beatId)) return
    const friend = getFriend(beat.friend)
    set((s) => ({
      delivered: [...s.delivered, beatId],
      chats: [...s.chats, { id: `${beatId}-them`, friend: beat.friend, from: 'them', text: beat.text }],
      unreadChats: s.unreadChats + 1,
    }))
    get().notify({
      title: friend.name,
      body: beat.text,
      accent: friend.color,
      kind: 'text',
      tone: friend.tone,
    })
  },

  markChatsRead: () => set({ unreadChats: 0 }),

  sendReply: (beatId, replyIndex) => {
    const beat = BEATS.find((b) => b.id === beatId)
    const reply = beat?.replies[replyIndex]
    if (!beat || !reply) return
    if (get().chats.some((c) => c.id === `${beatId}-you`)) return
    set((s) => ({
      chats: [...s.chats, { id: `${beatId}-you`, friend: beat.friend, from: 'you', text: reply.text }],
    }))
    window.setTimeout(() => {
      const friend = getFriend(beat.friend)
      useGame.setState((s) => ({
        chats: [...s.chats, { id: `${beatId}-back`, friend: beat.friend, from: 'them', text: reply.back }],
      }))
      // she is looking at the thread; a card over it is just noise
      if (useGame.getState().overlay !== null) return
      useGame.getState().notify({
        title: friend.name,
        body: reply.back,
        accent: friend.color,
        kind: 'text',
        tone: friend.tone,
      })
    }, 2600)
  },

  giftCredits: (friendId) => {
    const s = get()
    const friend = getFriend(friendId)
    if (s.credits < GIFT_AMOUNT || s.gifted.includes(friendId)) return
    set({
      credits: s.credits - GIFT_AMOUNT,
      gifted: [...s.gifted, friendId],
      chats: [
        ...s.chats,
        { id: `gift-${friendId}`, friend: friendId, from: 'you', text: `sent you ${GIFT_AMOUNT} \u00a2r. no reason. love you` },
      ],
    })
    window.setTimeout(() => {
      useGame.setState((st) => ({
        chats: [...st.chats, { id: `gift-${friendId}-back`, friend: friendId, from: 'them', text: friend.thanks }],
      }))
      if (useGame.getState().overlay !== null) return
      useGame.getState().notify({
        title: friend.name,
        body: friend.thanks,
        accent: friend.color,
        kind: 'text',
        tone: friend.tone,
      })
    }, 2200)
  },

  buyBread: (itemId) => {
    const item = getBakeryItem(itemId)
    const s = get()
    if (!item || s.credits < item.price) return
    set({ credits: s.credits - item.price, pantry: [...s.pantry, itemId] })
    get().notify({
      title: 'Sugarloaf night hatch',
      body: `${item.name} — still warm through the bag.`,
      accent: '#ffcf9a',
      kind: 'treat',
    })
  },

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
    credits: s.credits,
    chats: s.chats,
    delivered: s.delivered,
    gifted: s.gifted,
    pantry: s.pantry,
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
