import { useGame } from '../state/store'
import { getInspectable } from '../content/inspectables'
import { BAKERY } from '../content/bakery'
import './popups.css'

/* Brief, Animal-Crossing-style popups: an illustrated object or character sits
   beside live text on a painted card. Art lives in public/art/ui; all copy
   stays in React so it remains readable and editable. */

const ART = '/art/ui'

export function Hint({ k, children, onClick }: { k: string; children: string; onClick?: () => void }) {
  return (
    <button className="hint" onClick={onClick}>
      <span className="hint-key">{k}</span>
      <span className="hint-text">{children}</span>
    </button>
  )
}

export function Coin({ amount, plus }: { amount: number; plus?: boolean }) {
  return (
    <span className="coinpill">
      <img src={`${ART}/coin.webp`} alt="" />
      {plus ? '+' : ''}¢{amount}
    </span>
  )
}

export function InspectOverlay() {
  const id = useGame((s) => s.inspectingId)
  const closeOverlay = useGame((s) => s.closeOverlay)
  const entry = id ? getInspectable(id) : undefined
  if (!entry) return null
  const clue = Boolean(entry.clue)
  return (
    <div className="overlay" onClick={closeOverlay}>
      <div className={`panel inspect ${clue ? 'is-clue' : 'is-note'}`} onClick={(e) => e.stopPropagation()}>
        {clue && <img className="inspect-sticker" src={`${ART}/${entry.id}.webp`} alt="" />}
        {clue && <span className="stamp">clue found</span>}
        <div className="inspect-copy">
          <h3>{entry.title}</h3>
          {entry.subtitle && <p className="sub">{entry.subtitle}</p>}
          {clue ? (
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
        </div>
        <div className="foot">
          <span className="foot-note">{clue ? 'noted in your terminal' : 'noticed'}</span>
          <Hint k="Esc" onClick={closeOverlay}>
            back
          </Hint>
        </div>
      </div>
    </div>
  )
}

export function BakeryOverlay() {
  const credits = useGame((s) => s.credits)
  const pantry = useGame((s) => s.pantry)
  const buyBread = useGame((s) => s.buyBread)
  const closeOverlay = useGame((s) => s.closeOverlay)
  return (
    <div className="overlay" onClick={closeOverlay}>
      <div className="panel bakery" onClick={(e) => e.stopPropagation()}>
        <div className="baker">
          <div className="speech">
            <b>Still baking at this hour.</b>
            <span>Tap the hatch, it comes up warm.</span>
          </div>
          <img src={`${ART}/baker.webp`} alt="" />
        </div>
        <div className="board">
          <div className="board-head">
            <span className="kicker">Sugarloaf · night hatch · 12F</span>
            <Coin amount={credits} />
          </div>
          <div className="shelf">
            {BAKERY.map((b) => {
              const bought = pantry.filter((p) => p === b.id).length
              const afford = credits >= b.price
              return (
                <div key={b.id} className="loaf-row">
                  <img className="loaf-art" src={`${ART}/bread-${b.id.split('-')[0]}.webp`} alt="" />
                  <span className="loaf-meta">
                    <b>{b.name}</b>
                    <span>{b.blurb}</span>
                  </span>
                  {bought > 0 && <span className="owned">×{bought}</span>}
                  <button className="price" disabled={!afford} onClick={() => buyBread(b.id)}>
                    <img src={`${ART}/coin.webp`} alt="" />¢{b.price}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
        <div className="foot">
          <span className="foot-note">fictional credits · no real money anywhere in this game</span>
          <Hint k="Esc" onClick={closeOverlay}>
            back
          </Hint>
        </div>
      </div>
    </div>
  )
}

export function Finale() {
  const closeOverlay = useGame((s) => s.closeOverlay)
  return (
    <div className="overlay">
      <div className="panel finale">
        <span className="tape tape-l" />
        <span className="tape tape-r" />
        <div className="postcard">
          <img src={`${ART}/postcard.webp`} alt="" />
          <span className="sticker">arrived</span>
        </div>
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
        <div className="finale-foot">
          <Coin amount={400} plus />
          <button className="go" onClick={closeOverlay}>
            Stay out here a while
          </button>
        </div>
      </div>
    </div>
  )
}
