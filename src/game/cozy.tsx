import { useMemo } from 'react'
import * as THREE from 'three'
import { Soft, pillowGeometry } from './soft'
import { fabricTexture, woodTexture } from './textures'
import { glowPlate, shadePlate } from './assets'
import { useLowQuality } from './quality'

/**
 * A baked pool of warm light: one additive, unlit quad. It fakes the falloff a
 * practical throws on the wall or floor for a fraction of a point light, and it
 * keeps glowing when the light budget puts the real lamp to sleep.
 */
export function LightPool({
  position,
  rotation = [-Math.PI / 2, 0, 0],
  size = 2.4,
  color = '#ff9f52',
  opacity = 0.5,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  size?: number
  color?: string
  opacity?: number
}) {
  const map = useMemo(() => glowPlate(), [])
  return (
    <mesh position={position} rotation={rotation} renderOrder={-1}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={map}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

/**
 * Soft furnishings and warm practicals: the pieces that carry the reference's
 * cozy-glamour read (velvet, brushed wood, linen, warm filament light) rather
 * than the bare boxes they replace.
 */

function useVelvet(color: string) {
  const low = useLowQuality()
  return useMemo(() => {
    const tex = fabricTexture().clone()
    tex.needsUpdate = true
    tex.repeat.set(3, 3)
    // sheen fakes the way velvet catches the practicals along its curves, but it
    // is a far heavier shader: the low tier gets a plain lit fabric instead
    if (low) {
      return new THREE.MeshStandardMaterial({ color, map: tex, roughness: 0.86 })
    }
    return new THREE.MeshPhysicalMaterial({
      color,
      map: tex,
      roughness: 0.86,
      metalness: 0,
      sheen: 1,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color(color).multiplyScalar(1.7),
    })
  }, [color, low])
}

function useLinen(color: string, repeat = 2) {
  return useMemo(() => {
    const tex = fabricTexture().clone()
    tex.needsUpdate = true
    tex.repeat.set(repeat, repeat)
    return new THREE.MeshStandardMaterial({ color, map: tex, roughness: 0.96 })
  }, [color, repeat])
}

function useWalnut(repeat = 1.4) {
  return useMemo(() => {
    const tex = woodTexture().clone()
    tex.needsUpdate = true
    tex.repeat.set(repeat, repeat)
    return new THREE.MeshStandardMaterial({ map: tex, color: '#9a7147', roughness: 0.46, metalness: 0.05 })
  }, [repeat])
}

/**
 * The cross-section of the curved sofa, read outward from the front of the
 * seat: front skirt, seat lip, seat, back cushion, rolled top, outer back,
 * base. Revolving it gives one continuous upholstered shell — no frame to
 * expose, no seam where a back meets an arm.
 */
const SOFA_PROFILE: [number, number][] = [
  [0.7, 0.0],
  [0.71, 0.14],
  [0.705, 0.34],
  [0.74, 0.44],
  [0.84, 0.475],
  [1.0, 0.46],
  [1.1, 0.5],
  [1.15, 0.64],
  [1.2, 0.82],
  [1.3, 0.93],
  [1.4, 0.88],
  [1.44, 0.62],
  [1.43, 0.16],
  [1.34, 0.02],
  [1.2, 0.0],
]

const ARC = Math.PI * 0.96
const Z_SQUASH = 0.8

/**
 * The burgundy velvet lounge: a single curved upholstered shell revolved from
 * one profile and squashed into an ellipse, with three proportioned seat
 * cushions and a few scatters. It sits inside the old sofa footprint, so
 * collisions are unchanged.
 */
export function VelvetPit() {
  const low = useLowQuality()
  const velvet = useVelvet('#5c1230')
  const velvetLight = useVelvet('#7d1f42')
  const seg = low ? 20 : 40

  const shell = useMemo(() => {
    const pts = SOFA_PROFILE.map(([r, y]) => new THREE.Vector2(r, y))
    const g = new THREE.LatheGeometry(pts, seg, -ARC / 2, ARC)
    // the upholstery breathes: a shallow swell between the seams rather than
    // the dead-straight extrusion a lathe gives you
    const p = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const y = p.getY(i)
      const z = p.getZ(i)
      const a = Math.atan2(z, x)
      const swell = 1 + Math.sin(a * 6) * 0.012 * Math.min(1, y * 2)
      p.setX(i, x * swell)
      p.setZ(i, z * swell)
    }
    p.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [seg])

  // the two open ends of the revolve, capped with the same outline so the arms
  // read as solid upholstery instead of a hollow shell
  const cap = useMemo(() => {
    const s = new THREE.Shape(SOFA_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)))
    s.autoClose = true
    return new THREE.ShapeGeometry(s)
  }, [])
  const capMat = useMemo(() => velvet.clone(), [velvet])
  capMat.side = THREE.DoubleSide

  const seats = useMemo(() => [-0.62, 0, 0.62], [])
  const scatters = useMemo(
    () =>
      [
        { a: -0.8, c: '#b98a4e', r: 0.24 },
        { a: -0.26, c: '#ddcbb0', r: 0.21 },
        { a: 0.3, c: '#8f3a52', r: 0.23 },
        { a: 0.8, c: '#a98459', r: 0.21 },
      ] as const,
    [],
  )

  return (
    <group position={[-3.8, 0, 3.24]} scale={[1, 1, Z_SQUASH]}>
      <mesh geometry={shell} castShadow receiveShadow material={velvet} />
      {[-ARC / 2, ARC / 2].map((a, i) => (
        <mesh key={i} geometry={cap} castShadow material={capMat} rotation={[0, a - Math.PI / 2, 0]} />
      ))}

      {/* seat cushions: three, proportioned to a real seat, following the arc */}
      {seats.map((a, i) => (
        <mesh
          key={i}
          geometry={pillowGeometry(0.8, 0.14, 0.58, 0.2)}
          castShadow
          receiveShadow
          position={[Math.sin(a) * 0.93, 0.525, Math.cos(a) * 0.93]}
          rotation={[0, a, 0]}
          scale={[1, 1, 1 / Z_SQUASH]}
          material={velvetLight}
        />
      ))}

      {/* scatter cushions propped against the back */}
      {scatters.map((s, i) => (
        <mesh
          key={i}
          geometry={pillowGeometry(s.r * 2, s.r * 1.9, s.r * 0.62, 0.42)}
          castShadow
          receiveShadow
          position={[Math.sin(s.a) * 1.02, 0.63 + s.r * 0.8, Math.cos(s.a) * 1.02]}
          rotation={[-0.34, s.a, 0.06 * (i % 2 ? 1 : -1)]}
          scale={[1, 1, 1 / Z_SQUASH]}
        >
          <meshStandardMaterial map={fabricTexture()} color={s.c} roughness={0.95} />
        </mesh>
      ))}

      {/* knitted throw folded over the seat, following the arc rather than
          balling up on the arm */}
      <mesh
        castShadow
        geometry={pillowGeometry(0.62, 0.05, 0.5, 0.18)}
        position={[Math.sin(0.92) * 0.9, 0.61, Math.cos(0.92) * 0.9]}
        rotation={[0.06, 0.92, 0.04]}
        scale={[1, 1, 1 / Z_SQUASH]}
      >
        <meshStandardMaterial map={fabricTexture()} color="#c9b089" roughness={0.98} />
      </mesh>
    </group>
  )
}

/** The reference's big amber mushroom lamp: glass dome over a warm filament. */
export function MushroomLamp({
  position,
  scale = 1,
  intensity = 9,
}: {
  position: [number, number, number]
  scale?: number
  intensity?: number
}) {
  const low = useLowQuality()
  const seg = low ? 14 : 28
  // the shade used to read as a flat orange surface: a vertical falloff on the
  // emissive channel gives it the hot rim and dim crown of real blown glass
  const falloff = useMemo(() => shadePlate(), [])
  return (
    <group position={position} scale={scale}>
      {/* stem */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.085, 0.17, 0.84, seg]} />
        <meshStandardMaterial
          color="#f0a04a"
          emissive="#ff8a2a"
          emissiveMap={falloff}
          emissiveIntensity={0.7}
          roughness={0.35}
          transparent
          opacity={0.95}
        />
      </mesh>
      {/* cap */}
      <mesh castShadow position={[0, 0.84, 0]} scale={[1, 0.62, 1]}>
        <sphereGeometry args={[0.27, seg, low ? 8 : 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#ffb15c"
          emissive="#ffa347"
          emissiveMap={falloff}
          emissiveIntensity={2.1}
          roughness={0.28}
          side={THREE.DoubleSide}
          transparent
          opacity={0.96}
        />
      </mesh>
      {/* pool the shade throws on whatever it stands on */}
      <LightPool position={[0, 0.02 / scale, 0]} size={2.9} color="#ff9d4e" opacity={0.42} />
      <mesh position={[0, 0.84, 0]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color="#fff0cf" emissive="#ffc27a" emissiveIntensity={3} />
      </mesh>
      <pointLight position={[0, 0.78, 0]} color="#ffb267" intensity={intensity} distance={7.5} decay={2} />
    </group>
  )
}

/**
 * A hung garment: lathed from a shoulder-to-hem profile with the radius
 * rippled around the axis, so it falls in folds and flares at the hem instead
 * of hanging as the tube a cylinder gives you.
 */
function Garment({
  x,
  color,
  width,
  height,
  flare = 1.5,
  low,
}: {
  x: number
  color: string
  width: number
  height: number
  flare?: number
  low: boolean
}) {
  const geo = useMemo(() => {
    // collar, shoulders, waist, hip, hem: a dress profile, not a cone
    const profile: [number, number][] = [
      [0, 0.1],
      [0.06, 0.42],
      [0.12, 0.5],
      [0.34, 0.4],
      [0.62, 0.46 * flare],
      [0.97, 0.55 * flare],
      [1, 0.52 * flare],
    ]
    const pts: THREE.Vector2[] = []
    const rows = 22
    for (let i = 0; i <= rows; i++) {
      const t = i / rows
      let k = 1
      while (k < profile.length - 1 && profile[k][0] < t) k++
      const [t0, r0] = profile[k - 1]
      const [t1, r1] = profile[k]
      const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0)
      // smoothstep between the control points so the cloth has no hard shelves
      const s = f * f * (3 - 2 * f)
      pts.push(new THREE.Vector2(width * (r0 + (r1 - r0) * s), -height * t))
    }
    const g = new THREE.LatheGeometry(pts, low ? 12 : 24)
    const p = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i)
      const pz = p.getZ(i)
      const a = Math.atan2(pz, px)
      const t = -p.getY(i) / height
      // folds: deepest at the hem, gone at the shoulder
      const fold = 1 + Math.sin(a * 9) * 0.1 * t + Math.sin(a * 4 + 1.4) * 0.06 * t
      p.setX(i, px * fold)
      p.setZ(i, pz * fold)
    }
    p.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [width, height, flare, low])
  return (
    <group position={[x, 1.94, 0.06]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.035, 0.005, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#b9b2a6" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* shoulders: the hanger's bar, softened */}
      <mesh castShadow position={[0, -0.05, 0]} rotation={[0, x * 3.1, 0.02]} scale={[1, 1, 0.55]}>
        <sphereGeometry args={[width * 0.44, low ? 8 : 14, low ? 6 : 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial map={fabricTexture()} color={color} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        geometry={geo}
        castShadow
        position={[0, -0.05, 0]}
        rotation={[0, x * 3.1, 0.02]}
        scale={[1, 1, 0.55]}
      >
        <meshStandardMaterial map={fabricTexture()} color={color} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** Open wardrobe: warm-lit carcass, rail, hung garments, shoes and baskets. */
export function Wardrobe() {
  const low = useLowQuality()
  const walnut = useWalnut(1.1)
  const inner = useLinen('#6b5442', 2)
  const garments = useMemo(
    () => [
      { x: -0.62, c: '#c98f6a', w: 0.2, h: 0.86 },
      { x: -0.38, c: '#7a2f4c', w: 0.22, h: 0.94 },
      { x: -0.12, c: '#e3d5bd', w: 0.19, h: 0.8 },
      { x: 0.14, c: '#3d5f57', w: 0.23, h: 1.0 },
      { x: 0.4, c: '#d8a24a', w: 0.2, h: 0.84 },
      { x: 0.64, c: '#41303f', w: 0.22, h: 0.92 },
    ],
    [],
  )
  return (
    <group position={[-1.1, 0, 4.06]} rotation={[0, Math.PI, 0]}>
      {/* carcass */}
      <Soft args={[1.86, 2.3, 0.06]} receiveShadow position={[0, 1.15, -0.16]} material={inner} />
      {[-0.96, 0.96].map((x) => (
        <Soft args={[0.07, 2.3, 0.58]} key={x} castShadow receiveShadow position={[x, 1.15, 0.1]} material={walnut} />
      ))}
      <Soft args={[2.0, 0.08, 0.62]} castShadow receiveShadow position={[0, 2.32, 0.1]} material={walnut} />
      <Soft args={[1.86, 0.12, 0.58]} receiveShadow position={[0, 0.06, 0.1]} material={walnut} />
      <Soft args={[1.86, 0.04, 0.56]} receiveShadow position={[0, 1.02, 0.1]} material={walnut} />

      {/* rail + hangers */}
      <mesh position={[0, 1.95, 0.06]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 1.8, 10]} />
        <meshStandardMaterial color="#c9a25a" metalness={0.9} roughness={0.25} />
      </mesh>
      {garments.map((g, i) => (
        <Garment
          key={i}
          x={g.x}
          color={g.c}
          width={g.w}
          height={g.h}
          flare={i % 3 === 1 ? 1.35 : 1.0}
          low={low}
        />
      ))}

      {/* folded stacks + shoes on the lower shelf */}
      {[0, 1, 2].map((i) => (
        <Soft args={[0.46, 0.08, 0.34]} key={i} castShadow position={[-0.55 + i * 0.03, 0.2 + i * 0.09, 0.08]} rotation={[0, i * 0.08, 0]}>
          <meshStandardMaterial map={fabricTexture()} color={['#e3d5bd', '#8d2f52', '#3d5f57'][i]} roughness={0.95} />
        </Soft>
      ))}
      {[0, 1].map((i) => (
        <mesh key={i} castShadow position={[0.3 + i * 0.26, 0.2, 0.1]} rotation={[0, 0.2 - i * 0.3, 0]}>
          <capsuleGeometry args={[0.055, 0.14, 3, 8]} />
          <meshStandardMaterial color={i ? '#2b2129' : '#7a4a2a'} roughness={0.5} metalness={0.15} />
        </mesh>
      ))}
      {/* warm strip light under the top shelf */}
      <Soft args={[1.6, 0.025, 0.025]} position={[0, 2.22, 0.3]}>
        <meshBasicMaterial color="#ffd9a8" toneMapped={false} />
      </Soft>
      <pointLight position={[0, 2.05, 0.3]} color="#ffc287" intensity={low ? 3 : 4.5} distance={4} decay={2} />
    </group>
  )
}

/**
 * The window seat: the old block bench, rebuilt as a slatted walnut base with a
 * linen pad, bolsters and a stack of books, so the clue planters sit on
 * furniture rather than on a box.
 */
export function WindowSeat() {
  const walnut = useWalnut(2.2)
  const pad = useLinen('#d8c4a4', 4)
  return (
    <group position={[-0.15, 0, -4.0]}>
      {/* plinth, inset so the top overhangs */}
      <mesh castShadow receiveShadow position={[0, 0.17, 0]} material={walnut}>
        <boxGeometry args={[4.06, 0.34, 0.52]} />
      </mesh>
      {/* slat fronts */}
      {Array.from({ length: 9 }, (_, i) => (
        <Soft args={[0.36, 0.26, 0.02]} key={i} position={[-1.8 + i * 0.45, 0.17, 0.27]} material={walnut} />
      ))}
      {/* top with a rounded lip */}
      <mesh castShadow receiveShadow position={[0, 0.4, 0]} material={walnut}>
        <boxGeometry args={[4.3, 0.08, 0.66]} />
      </mesh>
      <mesh position={[0, 0.4, 0.33]} rotation={[0, 0, Math.PI / 2]} material={walnut}>
        <cylinderGeometry args={[0.04, 0.04, 4.3, 12]} />
      </mesh>
      {/* sitting pad at the open end, away from the planters */}
      <Soft args={[0.72, 0.1, 0.56]} castShadow receiveShadow position={[1.75, 0.48, 0.02]} material={pad} />
      <mesh castShadow position={[1.75, 0.58, -0.2]} rotation={[0.4, 0, 0]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.2, 14, 10]} />
        <meshStandardMaterial map={fabricTexture()} color="#8d2f52" roughness={0.95} />
      </mesh>
      {/* stacked books and a mug at the far end */}
      <group position={[-1.95, 0.46, 0.02]}>
        {[0, 1, 2].map((i) => (
          <Soft args={[0.28, 0.042, 0.2]} key={i} castShadow position={[0, i * 0.045, 0]} rotation={[0, i * 0.18, 0]}>
            <meshStandardMaterial color={['#37536b', '#96603a', '#5d3a5a'][i]} roughness={0.9} />
          </Soft>
        ))}
      </group>
    </group>
  )
}

/** Sheer curtains at the glass: breaks up the facade grid and softens the light. */
export function Curtains({ low }: { low: boolean }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e9d6bb',
        roughness: 1,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  )
  const panel = (x: number, w: number, flip: number) => (
    <group position={[x, 1.62, -4.28]}>
      {Array.from({ length: low ? 4 : 7 }, (_, i) => {
        const t = i / (low ? 3 : 6)
        return (
          <mesh
            key={i}
            position={[flip * (t * w), 0, Math.sin(t * 7) * 0.05]}
            rotation={[0, Math.sin(t * 9) * 0.35, 0]}
            material={mat}
          >
            <planeGeometry args={[w / (low ? 3 : 5), 2.76]} />
          </mesh>
        )
      })}
    </group>
  )
  return (
    <group>
      {panel(-5.55, 0.85, 1)}
      {panel(1.85, 0.8, -1)}
      {/* pelmet */}
      <mesh position={[-2.0, 3.03, -4.3]}>
        <boxGeometry args={[7.9, 0.12, 0.1]} />
        <meshStandardMaterial color="#6b5442" roughness={0.85} />
      </mesh>
    </group>
  )
}

/** Woven pouf — soft mass for the empty floor in the opening camera. */
export function Pouf({
  position,
  color = '#8a5a3c',
  radius = 0.36,
}: {
  position: [number, number, number]
  color?: string
  radius?: number
}) {
  const low = useLowQuality()
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, radius * 0.5, 0]} scale={[1, 0.62, 1]}>
        <sphereGeometry args={[radius, low ? 12 : 22, low ? 8 : 16]} />
        <meshStandardMaterial map={fabricTexture()} color={color} roughness={0.98} />
      </mesh>
      <mesh position={[0, radius * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.96, 0.02, 6, low ? 12 : 22]} />
        <meshStandardMaterial color="#e3d5bd" roughness={0.95} />
      </mesh>
    </group>
  )
}

/** Small round side table in walnut and brass. */
export function SideTable({ position }: { position: [number, number, number] }) {
  const walnut = useWalnut(1)
  const low = useLowQuality()
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.52, 0]} material={walnut}>
        <cylinderGeometry args={[0.32, 0.32, 0.05, low ? 14 : 26]} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.52, 10]} />
        <meshStandardMaterial color="#c9a25a" metalness={0.92} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.22, 0.24, 0.03, low ? 12 : 22]} />
        <meshStandardMaterial color="#c9a25a" metalness={0.92} roughness={0.24} />
      </mesh>
      {/* teacup */}
      <group position={[0.08, 0.57, 0.04]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.045, 0.035, 0.06, 14]} />
          <meshStandardMaterial color="#f2e7d5" roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.035, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.008, 16]} />
          <meshStandardMaterial color="#f2e7d5" roughness={0.35} />
        </mesh>
      </group>
    </group>
  )
}

/** Hanging basket planter — vertical layering above the window seat. */
export function HangingBasket({ position }: { position: [number, number, number] }) {
  const low = useLowQuality()
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.09, 0.26, Math.sin(a) * 0.09]} rotation={[0.1, 0, 0.1]}>
            <cylinderGeometry args={[0.004, 0.004, 0.52, 4]} />
            <meshStandardMaterial color="#9a8a6a" roughness={1} />
          </mesh>
        )
      })}
      <mesh castShadow>
        <sphereGeometry args={[0.2, low ? 12 : 20, low ? 8 : 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#8a6a48" roughness={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
