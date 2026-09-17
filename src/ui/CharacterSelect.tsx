import { LookStage } from '../game/LookStage'
import { useGame } from '../state/store'
import { LOOKS, getLook, type LookId } from '../content/presets'
import { audio } from '../audio/audio'
import './select.css'

const CARD: Record<LookId, { art: string; blurb: string }> = {
  orchid: { art: 'card-orchid.webp', blurb: 'teal bomber' },
  gold: { art: 'card-gold.webp', blurb: 'satin slip' },
  cozy: { art: 'card-cozy.webp', blurb: 'velvet set' },
}

/**
 * Character select: a painted dressing room with her standing full height on
 * the platform, and painted outfit cards instead of colour dots.
 */
export function CharacterSelect() {
  const look = useGame((s) => s.look)
  const setLook = useGame((s) => s.setLook)
  const startNew = useGame((s) => s.startNew)
  const setPhase = useGame((s) => s.setPhase)
  const reducedMotion = useGame((s) => s.settings.reducedMotion)
  const preset = getLook(look)
  const art = `${import.meta.env.BASE_URL}art/select/`

  return (
    <div className="screen cselect">
      <img className="cselect-room" src={`${art}room.webp`} alt="" />
      <div className="cselect-veil" />

      <div className="cselect-stage">
        <LookStage lookId={look} reducedMotion={reducedMotion} />
      </div>

      <header className="cselect-head">
        <p className="kicker">Choose tonight&rsquo;s look</p>
        <h2>{preset.name}</h2>
        <p className="tagline">{preset.tagline}</p>
      </header>

      <div className="cselect-rack">
        {LOOKS.map((l) => (
          <button
            key={l.id}
            className={`outfit-card ${l.id === look ? 'on' : ''}`}
            onClick={() => {
              setLook(l.id)
              audio.uiTick()
            }}
            aria-pressed={l.id === look}
          >
            <img src={`${art}${CARD[l.id].art}`} alt={`${l.name} outfit`} />
            <span className="plate">
              <b>{l.name}</b>
              <span>{CARD[l.id].blurb}</span>
            </span>
          </button>
        ))}
      </div>

      <footer className="cselect-foot">
        <button
          className="plate-btn go"
          onClick={() => {
            audio.uiTick()
            startNew()
          }}
        >
          Step inside
        </button>
        <button className="plate-btn back" onClick={() => setPhase('title')}>
          Back
        </button>
        <p className="note">
          One rig, three wardrobes — hair beads, jewellery, nails and fabric all change with the card, and your
          pick is saved with the run.
        </p>
      </footer>
    </div>
  )
}
