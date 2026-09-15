import { useEffect, useMemo, useRef, useState } from 'react'
import { ACCESS_CODE, HINTS, MESSAGES, TERMINAL_BANNER } from '../content/mission'
import { PLANT_CLUES, getInspectable } from '../content/inspectables'
import { useGame, type TermTheme } from '../state/store'
import { audio } from '../audio/audio'

type Tab = 'inbox' | 'access' | 'notes' | 'display'

const THEMES: { id: TermTheme; name: string; blurb: string }[] = [
  { id: 'amber', name: 'Amber CRT', blurb: 'the factory phosphor. warm, slightly tired.' },
  { id: 'green', name: 'Terminal Green', blurb: 'for when you want to feel like a felony.' },
  { id: 'magenta', name: 'Hot Magenta', blurb: 'unserious. you love it.' },
  { id: 'ice', name: 'Ice Blue', blurb: 'the corporate default you never removed.' },
]

interface Line {
  text: string
  tone?: 'ok' | 'bad' | 'dim'
}

export function Terminal({ onClose }: { onClose: () => void }) {
  const stage = useGame((s) => s.stage)
  const inspected = useGame((s) => s.inspected)
  const hintsUsed = useGame((s) => s.hintsUsed)
  const brief = useGame((s) => s.brief)
  const unlock = useGame((s) => s.unlock)
  const useHint = useGame((s) => s.useHint)
  const bumpAttempts = useGame((s) => s.bumpAttempts)
  const theme = useGame((s) => s.settings.termTheme)
  const setSettings = useGame((s) => s.setSettings)

  const [tab, setTab] = useState<Tab>(stage === 'arrived' ? 'inbox' : 'access')
  const [code, setCode] = useState('')
  const [bad, setBad] = useState(false)
  const [lines, setLines] = useState<Line[]>([
    { text: 'panel handshake ok — awaiting four digit key', tone: 'dim' },
  ])
  const input = useRef<HTMLInputElement>(null)
  const unlocked = stage === 'unlocked' || stage === 'crossed'

  useEffect(() => {
    if (tab === 'inbox') brief()
    if (tab === 'access') {
      const t = window.setTimeout(() => input.current?.focus(), 60)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [tab, brief])

  const visibleMessages = useMemo(
    () => MESSAGES.filter((_m, i) => i === 0 || stage === 'crossed'),
    [stage],
  )

  const notes = useMemo(
    () =>
      inspected
        .map((id) => getInspectable(id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e)),
    [inspected],
  )

  const foundAllTags = PLANT_CLUES.every((c) => inspected.includes(c.id))

  function submit() {
    const value = code.trim()
    if (value.length !== 4) {
      setLines((l) => [...l, { text: `> ${value || '----'}`, tone: 'dim' }, { text: 'key must be four digits.', tone: 'bad' }])
      setBad(true)
      audio.denied()
      window.setTimeout(() => setBad(false), 340)
      return
    }
    if (value === ACCESS_CODE) {
      audio.granted()
      setLines((l) => [
        ...l,
        { text: `> ${value}` },
        { text: 'key accepted — KINGSLEY ROW 12F', tone: 'ok' },
        { text: 'releasing balcony gate ........ ok', tone: 'ok' },
        { text: 'extending maintenance span .... ok', tone: 'ok' },
        { text: 'go and look out the window.', tone: 'ok' },
      ])
      unlock()
      return
    }
    bumpAttempts()
    audio.denied()
    setBad(true)
    window.setTimeout(() => setBad(false), 340)
    const feedback = describeMiss(value)
    setLines((l) => [...l, { text: `> ${value}` }, { text: feedback, tone: 'bad' }])
  }

  function describeMiss(value: string): string {
    let right = 0
    for (let i = 0; i < 4; i++) if (value[i] === ACCESS_CODE[i]) right++
    if (right === 0) return 'rejected — no digit in the right place. the garden is the key.'
    if (right === 3) return 'rejected — three of four in place. one tag is out of order.'
    return `rejected — ${right} of 4 digits are in the right place.`
  }

  const hintIndex = Math.min(hintsUsed, HINTS.length) - 1

  return (
    <div className="panel terminal" data-theme={theme} role="dialog" aria-label="Kestrel terminal">
      <div className="rail">
        <div className="brand">KESTREL OS 4.2</div>
        <button className={`tab ${tab === 'inbox' ? 'on' : ''}`} onClick={() => { setTab('inbox'); audio.uiTick() }}>
          Inbox
          {stage === 'arrived' && <span className="dot" />}
        </button>
        <button className={`tab ${tab === 'access' ? 'on' : ''}`} onClick={() => { setTab('access'); audio.uiTick() }}>
          Access
          {unlocked && <span className="dot" style={{ background: '#6ff0c8', boxShadow: '0 0 10px #6ff0c8' }} />}
        </button>
        <button className={`tab ${tab === 'notes' ? 'on' : ''}`} onClick={() => { setTab('notes'); audio.uiTick() }}>
          Notes
        </button>
        <button className={`tab ${tab === 'display' ? 'on' : ''}`} onClick={() => { setTab('display'); audio.uiTick() }}>
          Display
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn ghost small" onClick={onClose}>
          Esc — step away
        </button>
      </div>

      <div className="view">
        <div className="banner">
          {TERMINAL_BANNER.map((l, i) => (
            <div key={i}>{i === 2 && unlocked ? 'link: KINGSLEY ROW ACCESS PANEL ... OPEN, span extended' : l}</div>
          ))}
        </div>

        {tab === 'inbox' && (
          <div>
            {visibleMessages.map((m) => (
              <article key={m.id} style={{ marginBottom: 28 }}>
                <div className="msg-head">
                  <span>from {m.from}</span>
                  <span>{m.time}</span>
                </div>
                <h3 className="msg-subject">{m.subject}</h3>
                <div className="msg-body">
                  {m.body.map((p, i) => (
                    <p key={i} className={p.startsWith('—') ? 'msg-sig' : undefined}>
                      {p}
                    </p>
                  ))}
                </div>
              </article>
            ))}
            {stage !== 'crossed' && (
              <p className="locked-note">1 thread pending — she said she would be quiet until you are across.</p>
            )}
          </div>
        )}

        {tab === 'access' && (
          <div className="code-panel">
            <div>
              <div style={{ color: 'var(--tt)', letterSpacing: '0.16em', fontSize: 11, textTransform: 'uppercase' }}>
                Kingsley Row — 12F balcony panel
              </div>
              <p style={{ color: '#8b9bab', margin: '6px 0 0' }}>
                {unlocked
                  ? 'Gate released. Span extended from your railing. Walk out when you are ready.'
                  : 'Four digit key. Unlimited attempts — the panel is already thinned, it will not lock you out.'}
              </p>
            </div>

            <div className="code-row">
              <input
                ref={input}
                className={`code-input ${bad ? 'bad' : ''}`}
                value={code}
                inputMode="numeric"
                maxLength={4}
                disabled={unlocked}
                placeholder="0000"
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, '').slice(0, 4)
                  if (next.length > code.length) audio.keypress()
                  setCode(next)
                }}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') submit()
                  if (e.key === 'Escape') onClose()
                }}
              />
              <button className="btn primary" onClick={submit} disabled={unlocked}>
                Send key
              </button>
              <button
                className="btn ghost small"
                disabled={hintsUsed >= HINTS.length}
                onClick={() => {
                  useHint()
                  audio.uiTick()
                }}
              >
                Hint
              </button>
            </div>

            <div className="readout">
              {lines.map((l, i) => (
                <div key={i} className={l.tone === 'ok' ? 'ok' : l.tone === 'bad' ? 'bad' : undefined} style={l.tone === 'dim' ? { opacity: 0.6 } : undefined}>
                  {l.text}
                </div>
              ))}
              {hintIndex >= 0 && <p className="hint-line">{HINTS[hintIndex]}</p>}
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div>
            <p style={{ color: '#8b9bab', marginTop: 0 }}>
              {notes.length === 0
                ? 'Nothing written down yet. Walk up to things in the apartment and press E.'
                : `${notes.length} things noticed${foundAllTags ? ' — all four tags are here. Order them by bloom date.' : ''}`}
            </p>
            <div className="notes-grid">
              {notes.map((n) => (
                <div key={n.id} className="note-card">
                  <b>{n.title}</b>
                  {n.clue ? (
                    <span>
                      bloomed {n.clue.bloom} · no. {n.clue.digit}
                    </span>
                  ) : (
                    <span>{n.subtitle ?? n.body[0]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'display' && (
          <div>
            <p style={{ color: '#8b9bab', marginTop: 0 }}>
              Phosphor profile. Changes the whole panel and sticks to your save.
            </p>
            <div className="notes-grid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`note-card theme-card ${theme === t.id ? 'on' : ''}`}
                  data-theme={t.id}
                  onClick={() => {
                    setSettings({ termTheme: t.id })
                    audio.uiTick()
                  }}
                >
                  <span className="swatch" />
                  <b>{t.name}</b>
                  <span>{t.blurb}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
