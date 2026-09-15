import { useCallback, useEffect, useRef, useState } from 'react'
import { Scene, LookPreview } from '../game/Scene'
import { Terminal } from './Terminal'
import { useGame, persist, type Settings } from '../state/store'
import { useUi } from '../state/ui'
import { LOOKS, getLook } from '../content/presets'
import { getInspectable } from '../content/inspectables'
import { INTERACTABLES } from '../game/world'
import { installInput, setInputEnabled } from '../game/input'
import { audio } from '../audio/audio'
import './styles.css'

export function App() {
  const phase = useGame((s) => s.phase)
  const overlay = useGame((s) => s.overlay)
  const [glitch, setGlitch] = useState(false)

  useEffect(() => installInput(), [])

  useEffect(() => {
    setInputEnabled(phase === 'playing' && overlay === null)
  }, [phase, overlay])

  // audio mixer follows settings
  const settings = useGame((s) => s.settings)
  useEffect(() => {
    audio.setMusicVolume(settings.music)
    audio.setSfxVolume(settings.sfx)
    audio.setMuted(settings.muted)
  }, [settings.music, settings.sfx, settings.muted])

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

  return (
    <div className={`app ${glitch && !settings.reducedMotion ? 'glitching' : ''}`}>
      <div className="scene">
        <Scene paused={overlay !== null} />
      </div>
      <div className="grade" />
      <Hud />
      {overlay === 'computer' && <ComputerOverlay />}
      {overlay === 'inspect' && <InspectOverlay />}
      {overlay === 'pause' && <PauseMenu />}
      {overlay === 'complete' && <Finale />}
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
  const toast = useGame((s) => s.toast)
  const clearToast = useGame((s) => s.clearToast)
  const setOverlay = useGame((s) => s.setOverlay)
  const openInspect = useGame((s) => s.openInspect)
  const overlay = useGame((s) => s.overlay)
  const muted = useGame((s) => s.settings.muted)
  const setSettings = useGame((s) => s.setSettings)
  const focus = useUi((s) => s.focus)
  const fps = useUi((s) => s.fps)
  const [tipVisible, setTipVisible] = useState(true)
  const focusRef = useRef(focus)
  focusRef.current = focus

  useEffect(() => {
    const t = window.setTimeout(() => setTipVisible(false), 14000)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(clearToast, 6000)
    return () => window.clearTimeout(t)
  }, [toast, clearToast])

  const interact = useCallback(() => {
    const id = focusRef.current
    if (!id) return
    const entry = INTERACTABLES.find((i) => i.id === id)
    if (!entry) return
    audio.uiTick()
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

      <div className="fps">{fps ? `${fps} fps` : ''}</div>

      {toast && (
        <div className="toast">
          <b>{toast.title}</b>
          {toast.body}
        </div>
      )}
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
