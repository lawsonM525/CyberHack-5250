import { useCallback, useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { Scene, LookPreview } from '../game/Scene'
import { Terminal } from './Terminal'
import { useGame, persist, type Notif, type Settings } from '../state/store'
import { useUi } from '../state/ui'
import { LOOKS, getLook } from '../content/presets'
import { getInspectable } from '../content/inspectables'
import { BAKERY } from '../content/bakery'
import { BEATS } from '../content/friends'
import { INTERACTABLES } from '../game/world'
import { installInput, setInputEnabled } from '../game/input'
import { audio, TRACKS } from '../audio/audio'
import './styles.css'

export function App() {
  const phase = useGame((s) => s.phase)
  const overlay = useGame((s) => s.overlay)
  const [glitch, setGlitch] = useState(false)

  useEffect(() => installInput(), [])

  useEffect(() => {
    setInputEnabled(phase === 'playing' && overlay === null)
    if (overlay === null) useUi.getState().markOverlayClosed()
  }, [phase, overlay])

  // audio mixer follows settings
  const settings = useGame((s) => s.settings)
  useEffect(() => {
    audio.setMusicVolume(settings.music)
    audio.setSfxVolume(settings.sfx)
    audio.setMuted(settings.muted)
    audio.setTrack(settings.track)
  }, [settings.music, settings.sfx, settings.muted, settings.track])

  // save whenever anything meaningful changes, plus a slow heartbeat for position
  const stage = useGame((s) => s.stage)
  const look = useGame((s) => s.look)
  const inspected = useGame((s) => s.inspected)
  useEffect(() => {
    persist()
  }, [stage, look, inspected, settings, phase])
  useEffect(() => {
    const id = window.setInterval(persist, 5000)
    return () => window.clearInterval(id)
  }, [])

  useNotifSounds()
  useFriendTexts()

  // story beats
  useEffect(() => {
    if (phase !== 'playing' || stage !== 'arrived') return
    const t = window.setTimeout(() => {
      if (useGame.getState().stage !== 'arrived') return
      audio.notify()
      useGame.getState().pushToast('New message — ORCHID', 'Your terminal is lit up. Walk to the desk and press E.')
    }, 3200)
    return () => window.clearTimeout(t)
  }, [phase, stage])

  useEffect(() => {
    if (stage === 'unlocked') {
      audio.servo()
      setGlitch(true)
      audio.glitch()
      const t = window.setTimeout(() => setGlitch(false), 700)
      return () => window.clearTimeout(t)
    }
    if (stage === 'crossed') {
      audio.setMood('reveal')
      audio.reveal()
    }
    return undefined
  }, [stage])

  if (phase === 'title') return <Title />
  if (phase === 'select') return <LookSelect />
  return <Playing glitch={glitch} reducedMotion={settings.reducedMotion} overlay={overlay} />
}

function Playing({
  glitch,
  reducedMotion,
  overlay,
}: {
  glitch: boolean
  reducedMotion: boolean
  overlay: ReturnType<typeof useGame.getState>['overlay']
}) {
  const ready = useSceneReady()

  return (
    <div className={`app ${glitch && !reducedMotion ? 'glitching' : ''}`}>
      <div className="scene">
        <Scene paused={overlay !== null} />
      </div>
      <div className="grade" />
      {!ready && <SceneLoading />}
      {ready && <Hud />}
      {overlay === 'computer' && <ComputerOverlay />}
      {overlay === 'inspect' && <InspectOverlay />}
      {overlay === 'pause' && <PauseMenu />}
      {overlay === 'bakery' && <BakeryOverlay />}
      {overlay === 'complete' && <Finale />}
    </div>
  )
}

// ----------------------------------------------------- notifications & life

/** Each card announces itself once, with the sound that belongs to its kind. */
function useNotifSounds() {
  const notifs = useGame((s) => s.notifs)
  const played = useRef(new Set<number>())
  useEffect(() => {
    for (const n of notifs) {
      if (played.current.has(n.id)) continue
      played.current.add(n.id)
      if (n.kind === 'text' && n.tone) audio.ping(n.tone)
      else if (n.kind === 'credit') audio.coin()
      else if (n.kind === 'treat') audio.bakery()
      else audio.notify()
    }
  }, [notifs])
}

const FIRST_TEXT_DELAY = 75000
const TEXT_GAP = 165000
const TEXT_JITTER = 60000
/** Retry window used when she is mid-overlay, so a clue is never interrupted. */
const TEXT_RETRY = 12000
/** Reading a clue then getting pinged instantly is the same interruption, so
 *  the queue also waits out a beat after any panel closes. */
const AFTER_OVERLAY_QUIET = 8000

/** Friends text between missions, spaced out and never over an open panel. */
function useFriendTexts() {
  const phase = useGame((s) => s.phase)
  useEffect(() => {
    if (phase !== 'playing') return undefined
    let timer = window.setTimeout(tick, FIRST_TEXT_DELAY)
    function tick() {
      const state = useGame.getState()
      const next = BEATS.find((b) => !state.delivered.includes(b.id))
      if (!next) return
      const quiet = Date.now() - useUi.getState().overlayClosedAt
      if (state.overlay !== null || quiet < AFTER_OVERLAY_QUIET) {
        timer = window.setTimeout(tick, TEXT_RETRY)
        return
      }
      state.deliverBeat(next.id)
      timer = window.setTimeout(tick, TEXT_GAP + Math.random() * TEXT_JITTER)
    }
    return () => window.clearTimeout(timer)
  }, [phase])
}

/** How long the log stays open after the last arrival before it folds back
 *  into its taskbar chip. Nothing is lost when it folds. */
const LOG_LINGER = 9000

function clockLabel(at: number): string {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Short type tag in the corner of each line, like the reference's task cards. */
const TAG: Record<Notif['kind'], string> = {
  story: 'OPS',
  text: 'MSG',
  credit: '¢',
  treat: 'BUY',
}

/** Modelled on her SlaveHack shots: an OS-style window (flat bar, square
 *  _ □ × buttons) holding a column of compact task cards that stack, drain
 *  and can be killed one at a time — not floating toasts. */
function NotifStack() {
  const notifs = useGame((s) => s.notifs)
  const dismiss = useGame((s) => s.dismissNotif)
  const clear = useGame((s) => s.clearNotifs)
  const setOverlay = useGame((s) => s.setOverlay)
  const [open, setOpen] = useState(true)
  const [pinned, setPinned] = useState(false)
  const [hover, setHover] = useState(false)
  const last = notifs.length > 0 ? notifs[notifs.length - 1].id : 0

  // a new line pops the window back open, then it folds itself away again —
  // unless she pinned it or has the pointer on it, i.e. is reading
  useEffect(() => {
    if (last === 0) return undefined
    setOpen(true)
    if (pinned || hover) return undefined
    const t = window.setTimeout(() => setOpen(false), LOG_LINGER)
    return () => window.clearTimeout(t)
  }, [last, pinned, hover])

  // T toggles the log by hand, like any other window on her desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyT' || e.repeat) return
      setOpen((v) => !v)
      setPinned((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (notifs.length === 0) return null

  if (!open) {
    return (
      <div className="notifs">
        <button className="logchip" onClick={() => setOpen(true)}>
          <span className="logchip-dot" />
          inbox<span className="logchip-n">{notifs.length}</span>
          <span className="logchip-key">T</span>
        </button>
      </div>
    )
  }

  return (
    <div className="notifs" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="logwin">
        <div className="logwin-bar">
          <span className="logwin-glyph">{'>_'}</span>
          <span className="logwin-title">
            inbox ({notifs.length})
          </span>
          <span className="logwin-clock">{clockLabel(Date.now())}</span>
          <button className="wbtn" title="minimise (T)" onClick={() => setOpen(false)}>
            _
          </button>
          <button
            className="wbtn"
            title="open terminal"
            onClick={() => {
              document.exitPointerLock?.()
              setOverlay('computer')
            }}
          >
            □
          </button>
          <button className="wbtn close" title="clear all" onClick={clear}>
            ×
          </button>
        </div>
        <div className="logwin-body">
          {notifs.map((n) => (
              <div
                key={n.id}
                className={`logrow ${n.kind} ${hover || pinned ? 'held' : ''}`}
                style={{ '--accent': n.accent, '--life': `${LOG_LINGER}ms` } as React.CSSProperties}
              >
              <button className="logrow-x" title="dismiss" onClick={() => dismiss(n.id)}>
                ×
              </button>
              <button
                className="logrow-main"
                onClick={() => {
                  if (n.kind !== 'text') return
                  document.exitPointerLock?.()
                  setOverlay('computer')
                }}
              >
                <span className="logrow-head">
                  <span className="logrow-from">{n.title}</span>
                  <span className="logrow-time">{clockLabel(n.at)}</span>
                </span>
                <span className="logrow-text">{n.body}</span>
              </button>
              <span className="logrow-tag">{TAG[n.kind]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Wallet() {
  const credits = useGame((s) => s.credits)
  const pantry = useGame((s) => s.pantry)
  const [bump, setBump] = useState(false)
  const prev = useRef(credits)
  useEffect(() => {
    if (credits === prev.current) return undefined
    prev.current = credits
    setBump(true)
    const t = window.setTimeout(() => setBump(false), 520)
    return () => window.clearTimeout(t)
  }, [credits])
  return (
    <div className={`wallet ${bump ? 'bump' : ''}`}>
      <span className="coin">¢</span>
      {credits}
      {pantry.length > 0 && <span className="pantry" title={`${pantry.length} from the bakery`}>🥖 {pantry.length}</span>}
    </div>
  )
}

function BakeryOverlay() {
  const credits = useGame((s) => s.credits)
  const pantry = useGame((s) => s.pantry)
  const buyBread = useGame((s) => s.buyBread)
  const closeOverlay = useGame((s) => s.closeOverlay)
  return (
    <div className="overlay" onClick={closeOverlay}>
      <div className="panel bakery" onClick={(e) => e.stopPropagation()}>
        <div className="kicker">Sugarloaf · night hatch · 12F</div>
        <h3>Still baking at this hour</h3>
        <p className="sub">
          Tap the hatch, it comes up warm. Balance <b>¢{credits}</b>.
        </p>
        <div className="shelf">
          {BAKERY.map((b) => {
            const bought = pantry.filter((p) => p === b.id).length
            const afford = credits >= b.price
            return (
              <div key={b.id} className="loaf-row">
                <span className="loaf-swatch" style={{ background: b.color }} />
                <span className="loaf-meta">
                  <b>{b.name}</b>
                  <span>{b.blurb}</span>
                </span>
                <button
                  className={`btn ${afford ? 'primary' : 'ghost'} small`}
                  disabled={!afford}
                  onClick={() => buyBread(b.id)}
                >
                  ¢{b.price}
                </button>
                {bought > 0 && <span className="owned">×{bought}</span>}
              </div>
            )
          })}
        </div>
        <div className="foot">
          <span>fictional credits · no real money anywhere in this game</span>
          <button className="btn ghost small" onClick={closeOverlay}>
            Esc — back
          </button>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------- loading

/** The flat streams in over several seconds; until it has, the camera is
 *  looking at bare city geometry, so nothing of the game is shown yet. */
function useSceneReady(): boolean {
  const active = useProgress((s) => s.active)
  const progress = useProgress((s) => s.progress)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ready) return undefined
    if (!active && progress >= 100) {
      const t = window.setTimeout(() => setReady(true), 250)
      return () => window.clearTimeout(t)
    }
    // never strand the player behind the curtain if a request dies
    const bail = window.setTimeout(() => setReady(true), 45000)
    return () => window.clearTimeout(bail)
  }, [active, progress, ready])

  return ready
}

function SceneLoading() {
  const progress = useProgress((s) => s.progress)
  return (
    <div className="booting">
      <div className="booting-inner">
        <p className="eyebrow">Cyberhack 5250</p>
        <h2>Warming the flat</h2>
        <div className="bar">
          <span style={{ width: `${Math.max(6, Math.round(progress))}%` }} />
        </div>
        <p className="hint">Kettle on, rain on the glass, terminal booting.</p>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------- title

function Title() {
  const setPhase = useGame((s) => s.setPhase)
  const continueSave = useGame((s) => s.continueSave)
  const hasSave = useGame((s) => s.hasSave)

  const begin = async (fn: () => void) => {
    await audio.start()
    audio.uiTick()
    fn()
  }

  const reducedMotion = useGame((s) => s.settings.reducedMotion)

  return (
    <div className="screen title">
      <img
        className={`title-art ${reducedMotion ? '' : 'drift'}`}
        src={`${import.meta.env.BASE_URL}art/title-keyart.jpg`}
        alt="Orchid House at night"
      />
      <div className="title-veil" />
      <div className="title-menu">
        <div className="stack">
          {hasSave && (
            <button className="btn sticker primary" onClick={() => void begin(continueSave)}>
              <img src={`${import.meta.env.BASE_URL}art/icons/save.png`} alt="" />
              Continue
            </button>
          )}
          <button
            className={`btn sticker ${hasSave ? '' : 'primary'}`}
            onClick={() => void begin(() => setPhase('select'))}
          >
            <img src={`${import.meta.env.BASE_URL}art/icons/terminal.png`} alt="" />
            {hasSave ? 'New night' : 'Begin'}
          </button>
        </div>
        <p className="keys">
          WASD move · Shift run · E interact · R recenter · Esc pause
          <br />
          Sound starts when you press a button. Headphones are nice.
        </p>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ look selector

function LookSelect() {
  const look = useGame((s) => s.look)
  const setLook = useGame((s) => s.setLook)
  const startNew = useGame((s) => s.startNew)
  const preset = getLook(look)

  return (
    <div className="screen">
      <div className="select">
        <div className="preview">
          <LookPreview lookId={look} />
        </div>
        <div>
          <h2>Choose tonight&rsquo;s look</h2>
          <p className="name">{preset.name}</p>
          <p className="tagline">{preset.tagline}</p>
          <div className="looks">
            {LOOKS.map((l) => (
              <button
                key={l.id}
                className={`look-row ${l.id === look ? 'on' : ''}`}
                onClick={() => {
                  setLook(l.id)
                  audio.uiTick()
                }}
              >
                <span className="swatches">
                  <span className="swatch" style={{ background: l.hairColor }} />
                  <span className="swatch" style={{ background: l.outfit }} />
                  <span className="swatch" style={{ background: l.outfitAccent }} />
                  <span className="swatch" style={{ background: l.nails }} />
                </span>
                <span className="meta">
                  <b>{l.name}</b>
                  <span>
                    {l.hair} · {l.earrings} · {l.glasses ? 'glasses' : 'no glasses'}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn primary"
              onClick={() => {
                audio.uiTick()
                startNew()
              }}
            >
              Step inside
            </button>
            <button className="btn ghost" onClick={() => useGame.getState().setPhase('title')}>
              Back
            </button>
          </div>
          <p style={{ color: '#8b7f96', fontSize: 12, marginTop: 18, lineHeight: 1.6 }}>
            All three share one rig — hair, jewellery, nails, glasses and outfit change with the preset, and your
            choice is saved with the run.
          </p>
        </div>
      </div>
    </div>
  )
}

// --------------------------------------------------------------------- hud

function Hud() {
  const objective = useGame((s) => s.objective)
  const setOverlay = useGame((s) => s.setOverlay)
  const openInspect = useGame((s) => s.openInspect)
  const overlay = useGame((s) => s.overlay)
  const muted = useGame((s) => s.settings.muted)
  const setSettings = useGame((s) => s.setSettings)
  const focus = useUi((s) => s.focus)
  const fps = useUi((s) => s.fps)
  const render = useUi((s) => s.render)
  const quality = useGame((s) => s.settings.quality)
  const [tipVisible, setTipVisible] = useState(true)
  const focusRef = useRef(focus)
  focusRef.current = focus

  useEffect(() => {
    const t = window.setTimeout(() => setTipVisible(false), 14000)
    return () => window.clearTimeout(t)
  }, [])

  const interact = useCallback(() => {
    const id = focusRef.current
    if (!id) return
    const entry = INTERACTABLES.find((i) => i.id === id)
    if (!entry) return
    audio.uiTick()
    if (entry.kind === 'doorbell') {
      audio.chime()
      const state = useGame.getState()
      if (state.stage === 'unlocked') {
        document.exitPointerLock?.()
        state.cross()
      } else {
        state.pushToast('Kingsley Row', 'The bell rings somewhere deep in the flat. Orchid is taking her time.')
      }
      return
    }
    if (entry.kind === 'bakery') {
      document.exitPointerLock?.()
      setOverlay('bakery')
      return
    }
    if (entry.kind === 'computer') {
      document.exitPointerLock?.()
      setOverlay('computer')
    } else {
      document.exitPointerLock?.()
      openInspect(id)
    }
  }, [openInspect, setOverlay])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if (e.code === 'Escape') {
        e.preventDefault()
        const state = useGame.getState()
        if (state.overlay === 'complete') return
        if (state.overlay) state.closeOverlay()
        else state.setOverlay('pause')
        return
      }
      if (typing) return
      if (e.code === 'KeyE' && !e.repeat && useGame.getState().overlay === null) {
        e.preventDefault()
        interact()
      }
      if (e.code === 'KeyM' && !e.repeat) {
        const s = useGame.getState()
        s.setSettings({ muted: !s.settings.muted })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [interact])

  const entry = focus ? INTERACTABLES.find((i) => i.id === focus) : null

  return (
    <div className="hud">
      <div className="objective">
        <div className="label">Tonight</div>
        <div className="text">{objective}</div>
      </div>

      {entry && overlay === null && (
        <div className="prompt">
          <span className="keycap">E</span>
          <span>{entry.label}</span>
        </div>
      )}

      <div className="controls-tip" style={{ opacity: tipVisible ? 1 : 0 }}>
        <span className="pair">
          <span className="keycap">W</span>
          <span className="keycap">A</span>
          <span className="keycap">S</span>
          <span className="keycap">D</span> move
        </span>
        <span className="pair">
          <span className="keycap">Shift</span> run
        </span>
        <span className="pair">
          <span className="keycap">E</span> interact
        </span>
        <span className="pair">
          <span className="keycap">R</span> recenter
        </span>
        <span className="pair">
          <span className="keycap">Esc</span> pause
        </span>
      </div>

      <div className="corner">
        <button
          className="icon-btn"
          title={muted ? 'Unmute (M)' : 'Mute (M)'}
          onClick={() => setSettings({ muted: !muted })}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button className="icon-btn" title="Pause (Esc)" onClick={() => setOverlay('pause')}>
          ❚❚
        </button>
      </div>

      <div className="fps">
        {fps ? `${fps} fps` : ''}
        {fps && render
          ? ` · ${quality} · ${render.width}×${render.height}${render.samples > 1 ? ` msaa${render.samples}` : ''} · ${render.calls} calls · ${Math.round(render.triangles / 1000)}k tris`
          : ''}
      </div>

      <Wallet />
      <NotifStack />
    </div>
  )
}

// ---------------------------------------------------------------- overlays

function ComputerOverlay() {
  const closeOverlay = useGame((s) => s.closeOverlay)
  return (
    <div className="overlay">
      <Terminal onClose={closeOverlay} />
    </div>
  )
}

function InspectOverlay() {
  const id = useGame((s) => s.inspectingId)
  const closeOverlay = useGame((s) => s.closeOverlay)
  const entry = id ? getInspectable(id) : undefined
  if (!entry) return null
  return (
    <div className="overlay" onClick={closeOverlay}>
      <div className="panel inspect" onClick={(e) => e.stopPropagation()}>
        <h3>{entry.title}</h3>
        {entry.subtitle && <p className="sub">{entry.subtitle}</p>}
        {entry.clue ? (
          <div className="tag">
            {entry.body.map((b, i) => (
              <div key={i}>{b}</div>
            ))}
          </div>
        ) : (
          <div className="body">
            {entry.body.map((b, i) => (
              <p key={i}>{b}</p>
            ))}
          </div>
        )}
        <div className="foot">
          <span>{entry.clue ? 'noted in your terminal' : 'noticed'}</span>
          <button className="btn ghost small" onClick={closeOverlay}>
            Esc — back
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  children,
  value,
}: {
  label: string
  children: React.ReactNode
  value?: string
}) {
  return (
    <div className="setting">
      <label>{label}</label>
      {children}
      <span className="val">{value ?? ''}</span>
    </div>
  )
}

function PauseMenu() {
  const settings = useGame((s) => s.settings)
  const setSettings = useGame((s) => s.setSettings)
  const closeOverlay = useGame((s) => s.closeOverlay)
  const resetGame = useGame((s) => s.resetGame)
  const setPhase = useGame((s) => s.setPhase)

  const patch = (p: Partial<Settings>) => {
    setSettings(p)
    persist()
  }

  return (
    <div className="overlay">
      <div className="panel pause">
        <h3>Paused</h3>
        <Row label="Music" value={`${Math.round(settings.music * 100)}`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.music}
            onChange={(e) => patch({ music: Number(e.target.value) })}
          />
        </Row>
        <Row label="Effects" value={`${Math.round(settings.sfx * 100)}`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.sfx}
            onChange={(e) => patch({ sfx: Number(e.target.value) })}
          />
        </Row>
        <Row label="Track">
          <div className="tracks">
            {TRACKS.map((t) => (
              <button
                key={t.id}
                className={`chip ${settings.track === t.id ? 'on' : ''}`}
                onClick={() => patch({ track: t.id })}
              >
                {t.name}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Mute all">
          <button
            className={`switch ${settings.muted ? 'on' : ''}`}
            aria-pressed={settings.muted}
            onClick={() => patch({ muted: !settings.muted })}
          />
        </Row>
        <Row label="Reduced motion">
          <button
            className={`switch ${settings.reducedMotion ? 'on' : ''}`}
            aria-pressed={settings.reducedMotion}
            onClick={() => patch({ reducedMotion: !settings.reducedMotion })}
          />
        </Row>
        <Row label="Invert camera Y">
          <button
            className={`switch ${settings.invertY ? 'on' : ''}`}
            aria-pressed={settings.invertY}
            onClick={() => patch({ invertY: !settings.invertY })}
          />
        </Row>
        <Row label="Sensitivity" value={settings.sensitivity.toFixed(1)}>
          <input
            type="range"
            min={0.3}
            max={2.5}
            step={0.1}
            value={settings.sensitivity}
            onChange={(e) => patch({ sensitivity: Number(e.target.value) })}
          />
        </Row>
        <Row label="Quality">
          <div className="seg">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <button key={q} className={settings.quality === q ? 'on' : ''} onClick={() => patch({ quality: q })}>
                {q}
              </button>
            ))}
          </div>
        </Row>

        <div className="actions">
          <button className="btn primary" onClick={closeOverlay}>
            Resume
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              persist()
              setPhase('title')
            }}
          >
            Title screen
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              if (window.confirm('Reset this night? Your save is deleted and you start over.')) {
                audio.setMood('night')
                resetGame()
              }
            }}
          >
            Reset progress
          </button>
        </div>
      </div>
    </div>
  )
}

function Finale() {
  const closeOverlay = useGame((s) => s.closeOverlay)
  return (
    <div className="overlay">
      <div className="panel finale">
        <div className="kicker">Kingsley Row · 12F</div>
        <h2>You made it across</h2>
        <p>
          The span holds. From up here the whole grid opens out — towers stacked into the haze, the noodle sign
          blinking two streets over, somebody&rsquo;s roof garden breathing in the dark.
        </p>
        <p className="tease">
          Under the awning there is a crate with a name stencilled on it. It is not Orchid&rsquo;s name. She says
          you&rsquo;ll talk about the Marigold job tomorrow night.
        </p>
        <div className="stack" style={{ marginTop: 22 }}>
          <button className="btn primary" onClick={closeOverlay}>
            Stay out here a while
          </button>
        </div>
      </div>
    </div>
  )
}
