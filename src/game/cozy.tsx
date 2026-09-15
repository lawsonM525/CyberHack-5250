import { useMemo } from 'react'
import * as THREE from 'three'
import { Soft } from './soft'
import { fabricTexture, woodTexture } from './textures'
import { useLowQuality } from './quality'

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
 * The sunken burgundy velvet lounge: a raised plinth with a curved bolster
 * running around a recessed cushioned well, dressed with pillows and a throw.
 * It sits entirely inside the old sofa footprint, so collisions are unchanged.
 */
export function VelvetPit() {
  const low = useLowQuality()
  const velvet = useVelvet('#5c1230')
  const velvetLight = useVelvet('#7d1f42')
  const plinth = useLinen('#4a3b34', 3)
  const seg = low ? 18 : 28

  return (
    <group position={[-3.8, 0, 3.6]}>
      {/* plinth the pit is cut into */}
      <Soft args={[3.4, 0.32, 1.6]} radius={0.09} receiveShadow position={[0, 0.16, 0.12]} material={plinth} />
      <mesh receiveShadow position={[0, 0.33, -0.66]} material={plinth}>
        <boxGeometry args={[3.4, 0.02, 0.12]} />
      </mesh>

      {/* the well: recessed velvet floor */}
      <mesh receiveShadow position={[0, 0.2, 0.1]} rotation={[-Math.PI / 2, 0, 0]} material={velvet}>
        <circleGeometry args={[1.18, seg]} />
      </mesh>

      {/* curved bolster around the back half of the well */}
      <mesh castShadow receiveShadow position={[0, 0.36, 0.1]} rotation={[Math.PI / 2, 0, 0]} material={velvet}>
        <torusGeometry args={[1.2, 0.3, low ? 8 : 12, seg, Math.PI * 1.35]} />
      </mesh>
      {/* seat pad ring, slightly lighter so the curve reads */}
      <mesh castShadow receiveShadow position={[0, 0.26, 0.1]} rotation={[Math.PI / 2, 0, 0]} material={velvetLight}>
        <torusGeometry args={[0.86, 0.2, low ? 8 : 10, seg, Math.PI * 2]} />
      </mesh>

      {/* scatter cushions */}
      {[
        [-0.86, 0.5, -0.34, 0.34, '#d8a24a'],
        [0.9, 0.5, -0.3, 0.3, '#a8455f'],
        [-0.16, 0.46, -0.62, 0.26, '#e6d6bd'],
        [0.42, 0.44, 0.52, 0.28, '#8d2f52'],
        [-0.52, 0.47, 0.44, 0.27, '#b4536f'],
        [0.18, 0.52, -0.48, 0.24, '#caa06a'],
      ].map(([x, y, z, r, c], i) => (
        <mesh
          key={i}
          castShadow
          receiveShadow
          position={[Number(x), Number(y), Number(z)]}
          rotation={[0.3 + i * 0.2, i * 0.9, 0.2]}
          scale={[1.12, 0.66, 0.94]}
        >
          <sphereGeometry args={[Number(r), low ? 14 : 24, low ? 10 : 18]} />
          <meshStandardMaterial map={fabricTexture()} color={String(c)} roughness={0.95} />
        </mesh>
      ))}

      {/* satin throw spilling over the rim */}
      <mesh castShadow position={[1.02, 0.44, 0.26]} rotation={[0.5, -0.4, 0.3]} scale={[1, 0.5, 1.5]}>
        <sphereGeometry args={[0.3, low ? 14 : 26, low ? 10 : 18]} />
        {low ? (
          <meshStandardMaterial color="#4d6f38" roughness={0.35} />
        ) : (
          <meshPhysicalMaterial color="#4d6f38" roughness={0.35} sheen={1} sheenColor="#b9d98a" />
        )}
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
  return (
    <group position={position} scale={scale}>
      {/* stem */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.085, 0.17, 0.84, seg]} />
        <meshStandardMaterial
          color="#f0a04a"
          emissive="#ff8a2a"
          emissiveIntensity={0.55}
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
          emissive="#ff8f33"
          emissiveIntensity={1.25}
          roughness={0.28}
          side={THREE.DoubleSide}
          transparent
          opacity={0.96}
        />
      </mesh>
      <mesh position={[0, 0.84, 0]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color="#fff0cf" emissive="#ffc27a" emissiveIntensity={3} />
      </mesh>
      <pointLight position={[0, 0.78, 0]} color="#ffb267" intensity={intensity} distance={7.5} decay={2} />
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
        <group key={i} position={[g.x, 1.94, 0.06]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.035, 0.005, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#b9b2a6" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh castShadow position={[0, -g.h / 2 - 0.04, 0]}>
            <cylinderGeometry args={[g.w * 0.42, g.w * 0.62, g.h, low ? 6 : 12, 1, true]} />
            <meshStandardMaterial
              map={fabricTexture()}
              color={g.c}
              roughness={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
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
