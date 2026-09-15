import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fabricTexture, woodTexture } from './textures'
import { artPlate } from './assets'
import { Prop } from './props'
import { MushroomLamp, VelvetPit } from './cozy'
import { useGame, type MissionStage, type TermTheme } from '../state/store'
import { useLowQuality } from './quality'

const wood = () => woodTexture()

function useWood(repeat = 1) {
  return useMemo(() => {
    const t = wood().clone()
    t.needsUpdate = true
    t.repeat.set(repeat, repeat)
    return t
  }, [repeat])
}

export const TERM_PHOSPHOR: Record<TermTheme, string> = {
  amber: '255,183,101',
  green: '110,240,154',
  magenta: '255,122,208',
  ice: '127,216,255',
}

/** Live monitor content drawn to a canvas so the screens read as a real desktop. */
function useScreenTexture(stage: MissionStage, unread: boolean) {
  const theme = useGame((s) => s.settings.termTheme)
  const rgb = TERM_PHOSPHOR[theme]
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 768
    c.height = 432
    return c
  }, [])
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [canvas])

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#07070a')
    g.addColorStop(1, '#040406')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = `rgba(${rgb},0.08)`
    ctx.lineWidth = 1
    for (let y = 0; y < h; y += 4) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    ctx.fillStyle = `rgba(${rgb},0.95)`
    ctx.font = '600 22px "Courier New", monospace'
    ctx.fillText('KESTREL OS 4.2', 32, 48)
    ctx.fillStyle = 'rgba(190,185,176,0.6)'
    ctx.font = '16px "Courier New", monospace'
    ctx.fillText('node 12F-WEST / orchidhouse', 32, 74)

    ctx.strokeStyle = `rgba(${rgb},0.28)`
    ctx.strokeRect(32, 100, w - 64, h - 150)

    const lines: Array<[string, string]> = [
      ['inbox', unread ? '1 unread — ORCHID' : 'no new messages'],
      [
        'kingsley row panel',
        stage === 'arrived' || stage === 'briefed' ? 'LOCKED — key required' : 'OPEN — span deployed',
      ],
      ['span', stage === 'arrived' || stage === 'briefed' ? 'stowed' : 'extended'],
      ['garden sensors', 'four planters nominal'],
    ]
    ctx.font = '18px "Courier New", monospace'
    lines.forEach(([k, v], i) => {
      const y = 140 + i * 36
      ctx.fillStyle = 'rgba(180,175,166,0.75)'
      ctx.fillText(k.toUpperCase(), 56, y)
      ctx.fillStyle = v.includes('LOCKED') ? '#e0624f' : v.includes('unread') ? '#f0c36b' : `rgb(${rgb})`
      ctx.fillText(v, 320, y)
    })

    ctx.fillStyle = `rgba(${rgb},0.7)`
    ctx.font = '15px "Courier New", monospace'
    ctx.fillText(unread ? '>> press E to read' : '>> press E to use terminal', 56, h - 34)
    tex.needsUpdate = true
  }, [canvas, tex, stage, unread, rgb])

  return tex
}

export function Desk({ stage, unread }: { stage: MissionStage; unread: boolean }) {
  const low = useLowQuality()
  const screenTheme = useGame((s) => s.settings.termTheme)
  const topTex = useWood(2)
  const screen = useScreenTexture(stage, unread)
  const glow = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    if (glow.current) {
      glow.current.intensity = 2.4 + Math.sin(clock.elapsedTime * 2.2) * 0.12
    }
  })

  return (
    <group position={[-4.12, 0, -3.92]}>
      {/* top */}
      {/* walnut top with a rounded front lip */}
      <mesh castShadow receiveShadow position={[0, 0.74, 0]}>
        <boxGeometry args={[2.85, 0.06, 0.92]} />
        <meshStandardMaterial map={topTex} color="#9a7147" roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.74, 0.46]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.032, 0.032, 2.85, 12]} />
        <meshStandardMaterial map={topTex} color="#9a7147" roughness={0.45} />
      </mesh>
      {/* frame */}
      {[-1.35, 1.35].map((x) => (
        <group key={x}>
          <mesh castShadow position={[x, 0.37, 0]}>
            <boxGeometry args={[0.06, 0.74, 0.8]} />
            <meshStandardMaterial color="#8a6a3a" roughness={0.32} metalness={0.85} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.2, -0.3]}>
        <boxGeometry args={[2.6, 0.04, 0.04]} />
        <meshStandardMaterial color="#2b2f36" roughness={0.35} metalness={0.8} />
      </mesh>

      {/* main screen, facing into the room (+z) */}
      <group position={[0, 1.08, -0.3]}>
        <mesh castShadow>
          <boxGeometry args={[1.32, 0.56, 0.035]} />
          <meshStandardMaterial color="#14161c" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[1.26, 0.5]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.36, 0.02]}>
          <cylinderGeometry args={[0.03, 0.03, 0.16, 10]} />
          <meshStandardMaterial color="#2b2f36" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.44, 0.06]}>
          <boxGeometry args={[0.34, 0.02, 0.2]} />
          <meshStandardMaterial color="#2b2f36" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* flanking displays, angled inward */}
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[s * 0.98, 0.98, -0.2]} rotation={[0, -s * 0.5, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.52, 0.34, 0.03]} />
            <meshStandardMaterial color="#14161c" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[0.48, 0.3]} />
            <meshBasicMaterial color={s < 0 ? '#1c4a52' : '#3a1f44'} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.22, 0.02]}>
            <cylinderGeometry args={[0.02, 0.025, 0.1, 8]} />
            <meshStandardMaterial color="#2b2f36" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}

      <pointLight
        ref={glow}
        position={[0, 1.05, 0.25]}
        color={`rgb(${TERM_PHOSPHOR[screenTheme]})`}
        intensity={2.4}
        distance={4.2}
        decay={2}
      />

      {/* keyboard */}
      <group position={[0, 0.78, 0.18]} rotation={[-0.06, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.66, 0.025, 0.21]} />
          <meshStandardMaterial color="#20232b" roughness={0.5} metalness={0.3} />
        </mesh>
        {Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 13 }, (_, c) => (
            <mesh key={`${r}-${c}`} position={[-0.3 + c * 0.05, 0.02, -0.07 + r * 0.045]}>
              <boxGeometry args={[0.04, 0.012, 0.035]} />
              <meshStandardMaterial
                color={(r + c) % 7 === 0 ? '#c2447a' : '#33373f'}
                emissive={(r + c) % 7 === 0 ? '#5a1030' : '#0b1418'}
                emissiveIntensity={0.7}
                roughness={0.6}
              />
            </mesh>
          )),
        )}
      </group>
      <mesh castShadow position={[0.48, 0.79, 0.2]}>
        <capsuleGeometry args={[0.035, 0.03, 4, 12]} />
        <meshStandardMaterial color="#26292f" roughness={0.4} metalness={0.4} />
      </mesh>

      {/* mug, notes, trinkets */}
      <group position={[-0.95, 0.77, 0.22]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.045, 0.04, 0.1, 14]} />
          <meshStandardMaterial color="#d9c7a8" roughness={0.6} />
        </mesh>
        <mesh position={[0.055, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.028, 0.008, 8, 14]} />
          <meshStandardMaterial color="#d9c7a8" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.048, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.004, 14]} />
          <meshStandardMaterial color="#3a2418" roughness={0.3} />
        </mesh>
      </group>
      {[
        [-0.62, 0.1, -0.12],
        [-0.5, -0.06, 0.24],
        [1.05, 0.12, 0.1],
      ].map((n, i) => (
        <mesh key={i} position={[n[0], 0.772, n[1] + 0.2]} rotation={[-Math.PI / 2, 0, n[2]]} receiveShadow>
          <planeGeometry args={[0.14, 0.1]} />
          <meshStandardMaterial color={i === 1 ? '#f0c36b' : '#e8dcc4'} roughness={0.95} />
        </mesh>
      ))}
      {/* desk lamp */}
      <group position={[1.18, 0.77, -0.12]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.02, 14]} />
          <meshStandardMaterial color="#8a6a3a" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.2, 0]} rotation={[0, 0, 0.25]}>
          <cylinderGeometry args={[0.008, 0.008, 0.4, 8]} />
          <meshStandardMaterial color="#8a6a3a" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[-0.11, 0.4, 0]} rotation={[0, 0, 1.0]}>
          <coneGeometry args={[0.075, 0.12, 14, 1, true]} />
          <meshStandardMaterial color="#c39a52" metalness={0.7} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
        {!low && <pointLight position={[-0.14, 0.34, 0]} color="#ffb765" intensity={1.6} distance={2.6} decay={2} />}
      </group>
    </group>
  )
}

export function Chair() {
  return (
    <group position={[-3.9, 0, -3.0]} rotation={[0, Math.PI, 0]}>
      <mesh castShadow position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.24, 0.26, 0.09, 18]} />
        <meshStandardMaterial color="#3a2b3a" roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, 0.74, -0.22]} rotation={[0.16, 0, 0]}>
        <boxGeometry args={[0.42, 0.5, 0.07]} />
        <meshStandardMaterial color="#3a2b3a" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.36, 10]} />
        <meshStandardMaterial color="#26292f" metalness={0.8} roughness={0.3} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.16, 0.06, Math.sin(a) * 0.16]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.3, 0.03, 0.05]} />
            <meshStandardMaterial color="#26292f" metalness={0.8} roughness={0.3} />
          </mesh>
        )
      })}
    </group>
  )
}

export function Vanity() {
  const low = useLowQuality()
  const tex = useWood(1)
  return (
    <group position={[5.45, 0, 0.1]} rotation={[0, -Math.PI / 2, 0]}>
      {/* table */}
      <mesh castShadow receiveShadow position={[0, 0.72, 0]}>
        <boxGeometry args={[2.3, 0.07, 0.62]} />
        <meshStandardMaterial map={tex} roughness={0.42} />
      </mesh>
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} castShadow position={[x, 0.36, 0]}>
          <boxGeometry args={[0.08, 0.72, 0.5]} />
          <meshStandardMaterial map={tex} roughness={0.5} />
        </mesh>
      ))}
      {/* drawers */}
      <mesh position={[0.6, 0.55, 0.02]}>
        <boxGeometry args={[0.7, 0.28, 0.54]} />
        <meshStandardMaterial map={tex} roughness={0.5} />
      </mesh>
      <mesh position={[0.6, 0.55, 0.3]}>
        <boxGeometry args={[0.62, 0.02, 0.02]} />
        <meshStandardMaterial color="#e8b765" metalness={0.9} roughness={0.25} />
      </mesh>

      {/* mirror */}
      <group position={[-0.25, 1.5, -0.24]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.56, 0.56, 0.05, 40]} />
          <meshStandardMaterial color="#c9a25a" metalness={0.92} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0, 0.032]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.5, 40]} />
          <meshStandardMaterial color="#1b2430" metalness={1} roughness={0.08} envMapIntensity={1.4} />
        </mesh>
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.66, 0.02, Math.sin(a) * 0.66]}>
              <sphereGeometry args={[0.035, 12, 10]} />
              <meshStandardMaterial color="#fff0d0" emissive="#ffb765" emissiveIntensity={1.6} />
            </mesh>
          )
        })}
        {!low && <pointLight position={[0, 0, 0.5]} color="#ffcf9a" intensity={1.8} distance={3.4} decay={2} />}
      </group>

      {/* jewellery dish, bottles, brushes */}
      <mesh castShadow position={[-0.75, 0.78, 0.06]}>
        <cylinderGeometry args={[0.11, 0.09, 0.035, 18]} />
        <meshStandardMaterial color="#c9a25a" metalness={0.9} roughness={0.25} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.78 + i * 0.03, 0.8, 0.05 + i * 0.02]} rotation={[Math.PI / 2, 0, i]}>
          <torusGeometry args={[0.035, 0.005, 8, 18]} />
          <meshStandardMaterial color="#e8b765" metalness={0.95} roughness={0.2} />
        </mesh>
      ))}
      {[
        ['#c2447a', -0.4],
        ['#4fd0c0', -0.3],
        ['#e8b765', -0.2],
      ].map(([c, x], i) => (
        <mesh key={i} castShadow position={[Number(x), 0.82, -0.05]}>
          <cylinderGeometry args={[0.028, 0.032, 0.14, 12]} />
          <meshStandardMaterial color={String(c)} roughness={0.25} metalness={0.4} />
        </mesh>
      ))}
      <group position={[0.15, 0.8, 0.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.12, 12]} />
          <meshStandardMaterial color="#3a2b3a" roughness={0.7} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[(i - 1.5) * 0.02, 0.12, 0]} rotation={[0, 0, (i - 1.5) * 0.08]}>
            <cylinderGeometry args={[0.008, 0.012, 0.18, 8]} />
            <meshStandardMaterial color="#d8b48a" roughness={0.6} />
          </mesh>
        ))}
      </group>
      {/* stool */}
      <group position={[0, 0, 0.9]}>
        <mesh castShadow position={[0, 0.44, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 18]} />
          <meshStandardMaterial map={fabricTexture()} color="#7a4a68" roughness={0.9} />
        </mesh>
        {Array.from({ length: 3 }, (_, i) => {
          const a = (i / 3) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.12, 0.2, Math.sin(a) * 0.12]} rotation={[0.12, 0, 0.12]}>
              <cylinderGeometry args={[0.014, 0.018, 0.42, 8]} />
              <meshStandardMaterial color="#c9a25a" metalness={0.85} roughness={0.3} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

export function Lounge() {
  const low = useLowQuality()
  const fab = fabricTexture()
  return (
    <group>
      <VelvetPit />

      {/* coffee table */}
      <group position={[-3.9, 0, 1.95]}>
        <mesh castShadow receiveShadow position={[0, 0.36, 0]}>
          <boxGeometry args={[1.4, 0.05, 0.85]} />
          {/* transmission costs a whole extra scene pass; the low tier fakes it */}
          {low ? (
            <meshStandardMaterial color="#20323a" roughness={0.12} metalness={0.1} transparent opacity={0.6} />
          ) : (
            <meshPhysicalMaterial
              color="#20323a"
              roughness={0.08}
              metalness={0.1}
              transmission={0.55}
              thickness={0.05}
              transparent
              opacity={0.85}
            />
          )}
        </mesh>
        {[
          [-0.6, -0.32],
          [0.6, -0.32],
          [-0.6, 0.32],
          [0.6, 0.32],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.18, z]}>
            <cylinderGeometry args={[0.022, 0.022, 0.36, 8]} />
            <meshStandardMaterial color="#c9a25a" metalness={0.9} roughness={0.25} />
          </mesh>
        ))}
        {/* incense burner */}
        <group position={[0.02, 0.39, 0]}>
          <Prop name="incense" height={0.26} position={[0, 0, 0]} />
          <mesh position={[0.01, 0.3, 0]}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <meshStandardMaterial color="#ff8a3a" emissive="#ff5a12" emissiveIntensity={3} />
          </mesh>
          {!low && <pointLight position={[0, 0.24, 0]} color="#ff9a4a" intensity={0.4} distance={1.2} decay={2} />}
        </group>
        {/* books + bowl */}
        <mesh castShadow position={[-0.42, 0.41, 0.06]} rotation={[0, 0.2, 0]}>
          <boxGeometry args={[0.3, 0.05, 0.22]} />
          <meshStandardMaterial color="#3a5a6a" roughness={0.85} />
        </mesh>
        <mesh castShadow position={[-0.42, 0.46, 0.04]} rotation={[0, -0.1, 0]}>
          <boxGeometry args={[0.28, 0.04, 0.2]} />
          <meshStandardMaterial color="#8a3a4a" roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0.48, 0.42, -0.06]}>
          <sphereGeometry args={[0.1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#2f4a44" roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* floor cushions */}
      {[
        [-2.4, 1.3, 0.3],
        [-5.1, 0.95, -0.4],
      ].map(([x, z, r], i) => (
        <mesh key={i} castShadow receiveShadow position={[x, 0.11, z]} rotation={[0, r, 0]} scale={[1, 0.55, 1]}>
          <sphereGeometry args={[0.32, 18, 14]} />
          <meshStandardMaterial map={fab} color={i ? '#4a6f6a' : '#7a3f5f'} roughness={0.95} />
        </mesh>
      ))}

      {/* mushroom lamp, the reference's warm anchor for this corner */}
      <MushroomLamp position={[-5.5, 0, 2.9]} scale={1.3} intensity={13} />
      {!low && (
        <pointLight position={[-5.3, 1.7, 2.9]} color="#ffbd7a" intensity={4} distance={7} decay={2} />
      )}
    </group>
  )
}

export function Bookshelf() {
  const poster = artPlate('botanical')
  return (
    <group position={[1.7, 0, 4.12]}>
      <Prop name="bookshelf" height={2.0} position={[-0.7, 0, 0]} rotation={Math.PI} />
      <Prop name="bookshelf" height={2.0} position={[0.35, 0, 0]} rotation={Math.PI} />
      <Prop name="monstera" height={1.15} position={[1.35, 0, -0.1]} />
      {/* framed photograph */}
      <group position={[-0.7, 1.55, 0.1]} rotation={[0, 0.12, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.24, 0.02]} />
          <meshStandardMaterial color="#c9a25a" metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <planeGeometry args={[0.25, 0.19]} />
          <meshStandardMaterial color="#5a3f52" roughness={0.6} />
        </mesh>
        <mesh position={[-0.04, -0.01, 0.014]}>
          <circleGeometry args={[0.035, 16]} />
          <meshStandardMaterial color="#4a2b1c" roughness={0.7} />
        </mesh>
        <mesh position={[0.045, -0.02, 0.014]}>
          <circleGeometry args={[0.032, 16]} />
          <meshStandardMaterial color="#3a2116" roughness={0.7} />
        </mesh>
      </group>
      {/* leaning stack of books */}
      <group position={[0.6, 1.5, 0.12]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} castShadow position={[0, i * 0.05, 0]} rotation={[0, i * 0.2, 0]}>
            <boxGeometry args={[0.26, 0.045, 0.2]} />
            <meshStandardMaterial color={['#2f4a64', '#8a6a3a', '#5a3a5a'][i]} roughness={0.85} />
          </mesh>
        ))}
      </group>
      {/* wall art above */}
      <mesh position={[0, 2.45, -0.19]}>
        <planeGeometry args={[0.78, 1.04]} />
        <meshStandardMaterial map={poster} color="#b8ad9a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.45, -0.2]}>
        <boxGeometry args={[0.86, 1.12, 0.02]} />
        <meshStandardMaterial color="#c9a25a" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  )
}

export function RecordConsole() {
  const tex = useWood(1)
  const disc = useRef<THREE.Mesh>(null)
  useFrame((_, d) => {
    if (disc.current) disc.current.rotation.y += d * 3.5
  })
  return (
    <group position={[4.05, 0, 4.12]}>
      <mesh castShadow receiveShadow position={[0, 0.34, 0]}>
        <boxGeometry args={[1.4, 0.68, 0.44]} />
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      {/* turntable */}
      <group position={[0.15, 0.72, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.06, 0.38]} />
          <meshStandardMaterial color="#20232b" roughness={0.45} metalness={0.4} />
        </mesh>
        <mesh ref={disc} position={[-0.04, 0.045, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.012, 32]} />
          <meshStandardMaterial color="#111116" roughness={0.35} />
        </mesh>
        <mesh position={[-0.04, 0.053, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.004, 24]} />
          <meshStandardMaterial color="#c2447a" roughness={0.6} />
        </mesh>
        <mesh position={[0.17, 0.06, -0.1]} rotation={[0, -0.6, 0]}>
          <boxGeometry args={[0.16, 0.012, 0.02]} />
          <meshStandardMaterial color="#c9c4bb" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      {/* record sleeve leaning */}
      <mesh castShadow position={[-0.48, 0.32, 0.26]} rotation={[-0.25, 0.1, 0]}>
        <boxGeometry args={[0.56, 0.56, 0.015]} />
        <meshStandardMaterial color="#1c2a38" roughness={0.8} />
      </mesh>
      <mesh position={[-0.48, 0.34, 0.272]} rotation={[-0.25, 0.1, 0]}>
        <circleGeometry args={[0.16, 24]} />
        <meshStandardMaterial color="#e8b765" roughness={0.6} />
      </mesh>
    </group>
  )
}

export function Speaker() {
  const cone = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (cone.current) {
      const t = clock.elapsedTime
      cone.current.position.z = 0.22 + Math.sin(t * 9) * 0.0035 + Math.sin(t * 2.3) * 0.002
    }
  })
  return (
    <group position={[3.55, 0, 4.1]}>
      <Prop name="speaker" height={0.95} position={[0, 0, 0]} rotation={Math.PI} />
      <mesh ref={cone} position={[0, 0.62, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.05, 0.04, 20]} />
        <meshStandardMaterial color="#1a1a1e" roughness={0.6} />
      </mesh>
    </group>
  )
}

export function Kitchenette() {
  const tex = useWood(1.2)
  return (
    <group position={[5.45, 0, 2.9]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.5, 0.9, 0.6]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <boxGeometry args={[1.56, 0.05, 0.64]} />
        <meshStandardMaterial color="#2c3138" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh castShadow position={[-0.45, 1.05, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 0.2, 16]} />
        <meshStandardMaterial color="#b0b6bd" metalness={0.9} roughness={0.22} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} castShadow position={[0.05 + i * 0.16, 1.0, 0.08]}>
          <cylinderGeometry args={[0.045, 0.04, 0.09, 14]} />
          <meshStandardMaterial color={['#d9c7a8', '#7a9a8a', '#c2447a'][i]} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 1.7, -0.22]}>
        <boxGeometry args={[1.3, 0.04, 0.24]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} castShadow position={[-0.5 + i * 0.3, 1.82, -0.22]}>
          <cylinderGeometry args={[0.055, 0.055, 0.2, 14]} />
          <meshStandardMaterial color="#6f7d6a" roughness={0.5} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  )
}

export function CeilingFan({ reducedMotion }: { reducedMotion: boolean }) {
  const low = useLowQuality()
  const blades = useRef<THREE.Group>(null)
  useFrame((_, d) => {
    if (blades.current && !reducedMotion) blades.current.rotation.y += d * 1.1
  })
  return (
    <group position={[0.4, 3.05, 0.4]}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
        <meshStandardMaterial color="#2b2f36" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.11, 0.09, 0.09, 16]} />
        <meshStandardMaterial color="#3a3f47" metalness={0.7} roughness={0.35} />
      </mesh>
      <group ref={blades}>
        {Array.from({ length: 4 }, (_, i) => {
          const a = (i / 4) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.4, -0.02, Math.sin(a) * 0.4]} rotation={[0.1, -a, 0]}>
              <boxGeometry args={[0.7, 0.012, 0.16]} />
              <meshStandardMaterial color="#5a4632" roughness={0.7} />
            </mesh>
          )
        })}
      </group>
      <mesh position={[0, -0.09, 0]}>
        <sphereGeometry args={[0.07, 14, 10]} />
        <meshStandardMaterial color="#f0d8b0" emissive="#ffbd7a" emissiveIntensity={0.7} />
      </mesh>
      {!low && <pointLight position={[0, -0.12, 0]} color="#ffcf9a" intensity={1.2} distance={5} decay={2} />}
    </group>
  )
}
