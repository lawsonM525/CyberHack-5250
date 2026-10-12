import { useEffect } from 'react'
import { LookStage } from '../game/LookStage'
import { useGame } from '../state/store'
import { LOOKS, getLook, type LookId } from '../content/presets'
import { audio } from '../audio/audio'
import './select.css'
import './magazine.css'

interface Dossier {
  art: string
  emblem: string
  accent: string
  accent2: string
  role: string
  home: string
  signature: string
  vice: string
  traits: [string, string, string]
  stats: { nerve: number; charm: number; snacks: number }
}

const DOSSIER: Record<LookId, Dossier> = {
  orchid: {
    art: 'card-orchid.webp',
    emblem: 'em-orchid.webp',
    accent: '#4fd0c0',
    accent2: '#ff5fa2',
    role: 'Netrunner · lead',
    home: 'Marrow Heights, 14F',
    signature: 'Teal bomber, gold beads',
    vice: 'Cardamom knots',
    traits: ['locs & beads', 'teal bomber', 'unbothered'],
    stats: { nerve: 82, charm: 90, snacks: 70 },
  },
  nova: {
    art: 'card-nova.webp',
    emblem: 'em-nova.webp',
    accent: '#ff5fa2',
    accent2: '#dfe6f2',
    role: 'Fixer · wheels',
    home: 'Glasswater Docks',
    signature: 'Chrome bob, moto jacket',
    vice: 'Milk bread, still warm',
    traits: ['platinum bob', 'moto jacket', 'all gas'],
    stats: { nerve: 72, charm: 96, snacks: 58 },
  },
  jade: {
    art: 'card-jade.webp',
    emblem: 'em-jade.webp',
    accent: '#3fd39a',
    accent2: '#e8b94a',
    role: 'Climber · rooftops',
    home: 'Lantern Row, 9F',
    signature: 'Silk dragon wrap, cargo',
    vice: 'Rosemary olive loaf',
    traits: ['silk wrap', 'cargo & kicks', 'no railings'],
    stats: { nerve: 95, charm: 76, snacks: 88 },
  },
}

const STAT_LABELS: Record<keyof Dossier['stats'], string> = {
  nerve: 'Nerve',
  charm: 'Charm',
  snacks: 'Snack budget',
}

export function CharacterSelect() {
  const look = useGame((s) => s.look)
  const setLook = useGame((s) => s.setLook)
  const startNew = useGame((s) => s.startNew)
  const setPhase = useGame((s) => s.setPhase)
  const reducedMotion = useGame((s) => s.settings.reducedMotion)
  const preset = getLook(look)
  const d = DOSSIER[look]
  const art = `${import.meta.env.BASE_URL}art/select/`
  const index = LOOKS.findIndex((l) => l.id === look)

  const pick = (id: LookId) => {
    if (id === look) return
    setLook(id)
    audio.uiTick()
  }
  const step = (dir: 1 | -1) => pick(LOOKS[(index + dir + LOOKS.length) % LOOKS.length].id)
  const go = () => {
    audio.uiTick()
    startNew()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') step(-1)
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') step(1)
      else if (e.code === 'Enter' || e.code === 'Space') go()
      else if (e.code === 'Escape') setPhase('title')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div
      className={`screen csel ${reducedMotion ? 'still' : ''}`}
      style={{ '--acc': d.accent, '--acc2': d.accent2 } as React.CSSProperties}
    >
      <img className="csel-room" src={`${art}room.webp`} alt="" />
      <div className="csel-grade" />
      <img key={`em-${look}`} className="csel-emblem-bg" src={`${art}${d.emblem}`} alt="" />
      <img className="csel-dust" src={`${art}sel-dust.webp`} alt="" />

      <div className="csel-stage">
        <LookStage lookId={look} reducedMotion={reducedMotion} />
      </div>

      <header className="csel-head" key={`head-${look}`}>
        <p className="csel-kicker">
          <span>Runner select</span>
          <span className="dim">//</span>
          <span>CyberHack 5250</span>
          <span className="dim">//</span>
          <span>
            {String(index + 1).padStart(2, '0')} of {String(LOOKS.length).padStart(2, '0')}
          </span>
        </p>
        <h2 className="csel-name">{preset.name}</h2>
        <p className="csel-tag">{preset.tagline}</p>
        <ul className="csel-traits">
          {d.traits.map((t) => (
            <li key={t} className="csel-chip">
              {t}
            </li>
          ))}
        </ul>
      </header>

      <aside className="csel-dossier" key={`doss-${look}`}>
        <div className="csel-doss-top">
          <img src={`${art}${d.emblem}`} alt="" />
          <div>
            <span className="csel-doss-k">Dossier</span>
            <b>{preset.name.toUpperCase()}</b>
          </div>
        </div>
        <dl className="csel-rows">
          <dt>Role</dt>
          <dd>{d.role}</dd>
          <dt>Home</dt>
          <dd>{d.home}</dd>
          <dt>Signature</dt>
          <dd>{d.signature}</dd>
          <dt>Weakness</dt>
          <dd>{d.vice}</dd>
        </dl>
        <div className="csel-stats">
          {(Object.keys(d.stats) as (keyof Dossier['stats'])[]).map((k) => (
            <div key={k} className="csel-stat">
              <span>{STAT_LABELS[k]}</span>
              <i>
                <b style={{ width: `${d.stats[k]}%` }} />
              </i>
              <em>{d.stats[k]}</em>
            </div>
          ))}
        </div>
        <p className="csel-doss-foot">Her own model, her own wardrobe. Saved with the run.</p>
      </aside>

      <nav className="csel-roster" aria-label="Runners">
        {LOOKS.map((l, i) => (
          <button
            key={l.id}
            className={`csel-tile ${l.id === look ? 'on' : ''}`}
            style={{ '--tile-acc': DOSSIER[l.id].accent } as React.CSSProperties}
            onClick={() => pick(l.id)}
            aria-pressed={l.id === look}
          >
            <span className="csel-tile-num">{String(i + 1).padStart(2, '0')}</span>
            <img className="csel-tile-art" src={`${art}${DOSSIER[l.id].art}`} alt={l.name} />
            <img className="csel-tile-em" src={`${art}${DOSSIER[l.id].emblem}`} alt="" />
            <span className="csel-tile-name">{l.name}</span>
          </button>
        ))}
      </nav>

      <div className="csel-foot-l">
        <button className="csel-plate back" onClick={() => setPhase('title')}>
          Back
        </button>
        <p className="csel-hints">
          <kbd>◂</kbd>
          <kbd>▸</kbd>
          <span>switch runner</span>
          <kbd className="wide">Esc</kbd>
          <span>back</span>
        </p>
      </div>

      <div className="csel-foot-r">
        <p className="csel-hints">
          <kbd className="wide">Enter</kbd>
          <span>lock in</span>
        </p>
        <button className="csel-plate go" onClick={go}>
          Step inside
        </button>
      </div>
    </div>
  )
}
