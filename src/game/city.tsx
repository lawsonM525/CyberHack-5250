import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { concreteTexture, signTexture } from './textures'
import { facadePlate, skylinePlate } from './assets'
import { CornerPalm, HangingVine, Planter } from './plants'

interface Tower {
  x: number
  z: number
  w: number
  d: number
  h: number
  seed: number
  hue: number
}

function buildTowers(quality: 'low' | 'medium' | 'high'): Tower[] {
  const count = quality === 'low' ? 26 : quality === 'medium' ? 44 : 62
  let s = 20260915
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  const towers: Tower[] = []
  for (let i = 0; i < count; i++) {
    const ring = i / count
    const z = -24 - ring * 190 - rnd() * 26
    const spread = 28 + ring * 190
    const x = (rnd() - 0.5) * spread * 2
    if (Math.abs(x) < 7 && z > -46) continue
    towers.push({
      x,
      z,
      w: 8 + rnd() * 20,
      d: 8 + rnd() * 18,
      h: 26 + rnd() * 96,
      seed: Math.floor(rnd() * 1000),
      hue: [188, 300, 268, 42, 330][Math.floor(rnd() * 5)],
    })
  }
  // the district wraps around the block, so turning back from the span still reads as a city
  const behind = quality === 'low' ? 10 : quality === 'medium' ? 16 : 22
  for (let i = 0; i < behind; i++) {
    const ring = i / behind
    const z = 26 + ring * 150 + rnd() * 24
    const x = (rnd() - 0.5) * (60 + ring * 220)
    towers.push({
      x,
      z,
      w: 10 + rnd() * 22,
      d: 10 + rnd() * 20,
      h: 30 + rnd() * 90,
      seed: Math.floor(rnd() * 1000),
      hue: [188, 300, 268, 42, 330][Math.floor(rnd() * 5)],
    })
  }
  const flanks = quality === 'low' ? 8 : 14
  for (let i = 0; i < flanks; i++) {
    const side = i % 2 ? 1 : -1
    const ring = i / flanks
    towers.push({
      x: side * (34 + ring * 120 + rnd() * 20),
      z: -14 + rnd() * 44,
      w: 12 + rnd() * 20,
      d: 12 + rnd() * 22,
      h: 34 + rnd() * 86,
      seed: Math.floor(rnd() * 1000),
      hue: [188, 300, 268, 42, 330][Math.floor(rnd() * 5)],
    })
  }
  return towers
}

export function City({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  const towers = useMemo(() => buildTowers(quality), [quality])
  const mats = useMemo(() => {
    const cache = new Map<string, THREE.MeshStandardMaterial>()
    return (seed: number, hue: number) => {
      const key = `${seed % 12}-${hue}`
      let m = cache.get(key)
      if (!m) {
        const variant = seed % 2 ? 'b' : 'a'
        const tex = facadePlate(variant, 1 + (seed % 3) * 0.5, 2 + (seed % 4))
        tex.offset.set((seed % 7) / 7, (seed % 5) / 5)
        m = new THREE.MeshStandardMaterial({
          color: '#8d93a8',
          map: tex,
          emissiveMap: tex,
          emissive: new THREE.Color('#ffffff'),
          emissiveIntensity: 1.15,
          roughness: 0.82,
          metalness: 0.08,
        })
        cache.set(key, m)
      }
      return m
    }
  }, [])

  return (
    <group>
      {towers.map((t, i) => (
        <mesh key={i} position={[t.x, t.h / 2 - 34, t.z]} material={mats(t.seed, t.hue)}>
          <boxGeometry args={[t.w, t.h, t.d]} />
        </mesh>
      ))}
      <HomeTower />
      <Haze />
      <SkylineBackdrop />
      <Signage />
      <Traffic quality={quality} />
      <Drones quality={quality} />
      <StreetBelow />
    </group>
  )
}

/** The block the apartment itself sits in, seen when the camera turns back from the span. */
function HomeTower() {
  const facade = useMemo(() => facadePlate('b', 3, 10), [])
  return (
    <group>
      {/* the front face clears the apartment's south wall (z = 4.7) instead of
          sitting on it, which made the two surfaces z-fight */}
      <mesh position={[0, 8, 14.8]}>
        <boxGeometry args={[34, 92, 17]} />
        <meshStandardMaterial
          color="#8f95a8"
          map={facade}
          emissiveMap={facade}
          emissive="#ffffff"
          emissiveIntensity={0.95}
          roughness={0.86}
        />
      </mesh>
      {/* the storeys below her floor, so the balcony reads as twelve floors up */}
      <mesh position={[0, -21, -1]}>
        <boxGeometry args={[24, 34, 13]} />
        <meshStandardMaterial
          color="#878da0"
          map={facade}
          emissiveMap={facade}
          emissive="#ffffff"
          emissiveIntensity={0.8}
          roughness={0.88}
        />
      </mesh>
    </group>
  )
}

/**
 * Depth cards: soft warm-grey veils between the tower rings so distance reads
 * as atmosphere rather than every facade sitting at the same contrast.
 */
function Haze() {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#2a3550',
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    [],
  )
  return (
    <group>
      {[-45, -85, -140, -210].map((z, i) => (
        <mesh key={z} position={[0, 0, z]} material={mat} scale={[1, 1, 1]} renderOrder={1 + i}>
          <planeGeometry args={[520, 360]} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Painted skyline plate far behind the modelled towers. It carries the depth
 * the box towers cannot: haze layers, distant spires, air traffic.
 */
function SkylineBackdrop() {
  const map = useMemo(() => skylinePlate(), [])
  return (
    <mesh position={[0, 12, -300]}>
      <planeGeometry args={[900, 600]} />
      <meshBasicMaterial map={map} toneMapped={false} fog={false} />
    </mesh>
  )
}

function Signage() {
  const signs = useMemo(
    () => [
      { text: 'KINGSLEY', hue: 320, pos: [-13, 9, -17.2] as [number, number, number], w: 5, h: 1.3, rot: 0 },
      { text: 'NOODLE 24H', hue: 42, pos: [14, -6, -26] as [number, number, number], w: 7, h: 1.8, rot: -0.3 },
      { text: 'SUNDIAL', hue: 188, pos: [-22, 16, -40] as [number, number, number], w: 10, h: 2.6, rot: 0.25 },
      { text: 'MARIGOLD', hue: 268, pos: [26, 2, -52] as [number, number, number], w: 12, h: 3, rot: -0.2 },
      { text: 'OPEN LATE', hue: 155, pos: [-32, -12, -30] as [number, number, number], w: 8, h: 2, rot: 0.4 },
    ],
    [],
  )
  const refs = useRef<Array<THREE.Mesh | null>>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (!m) return
      const mat = m.material as THREE.MeshBasicMaterial
      const flicker = i === 1 ? (Math.sin(t * 13 + 1) > 0.82 ? 0.25 : 1) : 0.82 + Math.sin(t * (0.8 + i * 0.3)) * 0.18
      mat.opacity = flicker
    })
  })
  return (
    <group>
      {signs.map((s, i) => (
        <mesh
          key={s.text}
          ref={(el) => {
            refs.current[i] = el
          }}
          position={s.pos}
          rotation={[0, s.rot, 0]}
        >
          <planeGeometry args={[s.w, s.h]} />
          <meshBasicMaterial map={signTexture(s.text, s.hue)} transparent toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Traffic({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  const count = quality === 'low' ? 10 : quality === 'medium' ? 18 : 28
  const group = useRef<THREE.InstancedMesh>(null)
  const lanes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        y: -26 - (i % 3) * 7,
        z: -30 - (i % 5) * 22,
        speed: (i % 2 ? 1 : -1) * (5 + (i % 4) * 2.5),
        offset: (i * 37) % 120,
      })),
    [count],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const mesh = group.current
    if (!mesh) return
    const t = clock.elapsedTime
    lanes.forEach((l, i) => {
      const x = (((l.offset + t * l.speed) % 120) + 120) % 120 - 60
      dummy.position.set(x, l.y, l.z)
      dummy.scale.set(l.speed > 0 ? 2.2 : 1.8, 0.16, 0.16)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={group} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
    </instancedMesh>
  )
}

function Drones({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  const count = quality === 'low' ? 4 : quality === 'medium' ? 8 : 12
  const refs = useRef<Array<THREE.Group | null>>([])
  const paths = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        r: 18 + i * 3.4,
        y: -6 + ((i * 13) % 17),
        z: -34 - (i % 4) * 16,
        speed: 0.16 + (i % 3) * 0.06,
        phase: i * 1.7,
        hue: ['#ff7aa8', '#7ae6ff', '#ffd27a'][i % 3],
      })),
    [count],
  )
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((g, i) => {
      if (!g) return
      const p = paths[i]
      const a = t * p.speed + p.phase
      g.position.set(Math.cos(a) * p.r, p.y + Math.sin(a * 2.1) * 1.6, p.z + Math.sin(a) * p.r * 0.4)
    })
  })
  return (
    <group>
      {paths.map((p, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
        >
          <mesh>
            <sphereGeometry args={[0.18, 8, 6]} />
            <meshBasicMaterial color={p.hue} toneMapped={false} />
          </mesh>
          {quality !== 'low' && <pointLight color={p.hue} intensity={1.2} distance={6} decay={2} />}
        </group>
      ))}
    </group>
  )
}

function StreetBelow() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -38, -60]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0a0c14" roughness={1} emissive="#141a2a" emissiveIntensity={0.5} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[-50 + i * 9, -37.6, -40 - (i % 3) * 30]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3, 60]} />
          <meshBasicMaterial color={i % 2 ? '#ff9a5a' : '#5ad2ff'} transparent opacity={0.18} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** The building across the gap, its balcony, and the access panel that responds to the code. */
export function KingsleyRow({ unlocked, crossed }: { unlocked: boolean; crossed: boolean }) {
  const concrete = useMemo(() => {
    const t = concreteTexture()
    const c = t.clone()
    c.needsUpdate = true
    c.repeat.set(6, 10)
    return c
  }, [])
  const facade = useMemo(() => facadePlate('a', 2, 6), [])
  const lamp = useRef<THREE.PointLight>(null)
  const panel = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (panel.current) {
      const c = unlocked ? new THREE.Color('#5ef0b0') : new THREE.Color('#e0503c')
      panel.current.emissive.copy(c)
      panel.current.emissiveIntensity = unlocked ? 2.2 : 1.1 + Math.sin(t * 2.4) * 0.5
    }
    if (lamp.current) {
      const target = unlocked ? 5.5 : 0.25
      lamp.current.intensity += (target - lamp.current.intensity) * Math.min(1, 0.9 * 0.05)
    }
  })

  return (
    <group>
      {/* tower body, held behind the balcony recess so it never fronts the deck */}
      <mesh position={[0, 10, -29]}>
        <boxGeometry args={[30, 96, 18]} />
        <meshStandardMaterial
          color="#9aa0b4"
          map={facade}
          emissiveMap={facade}
          emissive="#ffffff"
          emissiveIntensity={1.0}
          roughness={0.85}
        />
      </mesh>
      {/* setbacks, ledges and service masses: the facade read as architecture
          instead of one tiled wall of identical windows */}
      {[
        { y: -6, x: -11.5, w: 7, h: 30, d: 3.2 },
        // kept east of x=8: at w=9/x=9.5 this mass swallowed the balcony deck's
        // east rail, so the boom was solving against a wall she stood inside
        { y: 16, x: 11, w: 6, h: 40, d: 2.6 },
        { y: 30, x: -3, w: 12, h: 26, d: 2.0 },
      ].map((s, i) => (
        <mesh key={i} position={[s.x, s.y, -29 + 9 + s.d / 2]}>
          <boxGeometry args={[s.w, s.h, s.d]} />
          <meshStandardMaterial color="#3d3f4c" roughness={0.95} />
        </mesh>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={`ledge-${i}`} position={[0, -12 + i * 13, -29 + 9 + 0.45]}>
          <boxGeometry args={[30.4, 0.5, 0.9]} />
          <meshStandardMaterial color="#33353f" roughness={0.95} />
        </mesh>
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={`fin-${i}`} position={[-12 + i * 6, 14, -29 + 9 + 0.3]}>
          <boxGeometry args={[0.55, 64, 0.6]} />
          <meshStandardMaterial color="#2d2f38" roughness={0.95} />
        </mesh>
      ))}
      {/* balcony recess wall */}
      <mesh position={[3.7, 1.6, -19.55]}>
        <boxGeometry args={[6.2, 6, 1.6]} />
        <meshStandardMaterial map={concrete} color="#2a2d36" roughness={0.95} />
      </mesh>
      {/* her door, and the bell beside it */}
      <group position={[3.7, 1.02, -18.73]}>
        <mesh>
          <planeGeometry args={[1.15, 2.05]} />
          <meshStandardMaterial color="#241a22" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.5, 0.012]}>
          <planeGeometry args={[0.85, 0.7]} />
          <meshStandardMaterial
            color="#0b0d12"
            emissive={crossed ? '#ffb46a' : '#2a2030'}
            emissiveIntensity={crossed ? 1.5 : 0.35}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0.78, 0.15, 0.02]}>
          <circleGeometry args={[0.075, 16]} />
          <meshStandardMaterial
            color="#14161d"
            emissive={crossed ? '#7af0c0' : '#ff7ad0'}
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
      </group>
      {/* balcony deck */}
      <mesh receiveShadow position={[3.7, -0.05, -17.6]}>
        <boxGeometry args={[3.7, 0.16, 2.3]} />
        <meshStandardMaterial map={concrete} color="#32353f" roughness={0.9} />
      </mesh>
      {/* railings */}
      <BalconyRail x={2.4} z={-16.47} w={0.9} />
      <BalconyRail x={4.9} z={-16.47} w={1.1} />
      <mesh position={[1.9, 0.55, -17.6]} userData={{ camFade: true }}>
        <boxGeometry args={[0.08, 1.1, 2.3]} />
        <meshStandardMaterial color="#3c4049" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[5.5, 0.55, -17.6]} userData={{ camFade: true }}>
        <boxGeometry args={[0.08, 1.1, 2.3]} />
        <meshStandardMaterial color="#3c4049" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* awning */}
      <mesh castShadow position={[3.7, 2.5, -18.9]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[4.0, 0.08, 1.9]} />
        <meshStandardMaterial color="#4a2b3a" roughness={0.9} />
      </mesh>
      {/* access panel by the door */}
      <group position={[1.95, 1.2, -18.4]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[0.34, 0.5, 0.07]} />
          <meshStandardMaterial color="#1b1e26" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.1, 0.045]}>
          <planeGeometry args={[0.2, 0.16]} />
          <meshStandardMaterial ref={panel} color="#101218" emissive="#e0503c" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      </group>
      <pointLight
        ref={lamp}
        position={[3.7, 2.2, -18.2]}
        color="#7af0c0"
        intensity={0.25}
        distance={9}
        decay={2}
      />
      {/* warm porch light under the awning */}
      <pointLight position={[3.7, 2.25, -18.35]} color="#ffb877" intensity={crossed ? 7 : 3.4} distance={7.5} decay={2} />
      {/* planter box + crate reward */}
      <Planter position={[5.15, 0.03, -18.35]} radius={0.22} height={0.3} />
      <CornerPalm position={[5.15, 0.33, -18.35]} scale={0.5} />
      <group position={[2.45, 0.03, -18.4]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.36, 0.4]} />
          <meshStandardMaterial color="#3a3326" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.06, 0.205]}>
          <planeGeometry args={[0.3, 0.1]} />
          <meshStandardMaterial
            color="#101010"
            emissive={crossed ? '#f0c36b' : '#3a2a10'}
            emissiveIntensity={crossed ? 1.6 : 0.3}
          />
        </mesh>
      </group>
    </group>
  )
}

/** `camFade`: thin metalwork the boom cannot dodge, so the lens dissolves it
 *  instead of shoving itself into her back. */
function BalconyRail({ x, z, w }: { x: number; z: number; w: number }) {
  const bars = Math.max(4, Math.round(w / 0.24))
  return (
    <group position={[x, 0, z]} userData={{ camFade: true }}>
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[w, 0.06, 0.08]} />
        <meshStandardMaterial color="#4a4e58" metalness={0.75} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[w, 0.06, 0.08]} />
        <meshStandardMaterial color="#4a4e58" metalness={0.75} roughness={0.35} />
      </mesh>
      {Array.from({ length: bars }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (i + 0.5) * (w / bars), 0.54, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.98, 6]} />
          <meshStandardMaterial color="#454a54" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

/** Player-side balcony: deck, railing, retractable gate, greenery. */
export function HomeBalcony({ gateOpen }: { gateOpen: boolean }) {
  const concrete = useMemo(() => {
    const c = concreteTexture().clone()
    c.needsUpdate = true
    c.repeat.set(3, 2)
    return c
  }, [])
  const gate = useRef<THREE.Group>(null)
  useFrame((_, d) => {
    if (!gate.current) return
    const target = gateOpen ? -1.15 : 0
    gate.current.position.y += (target - gate.current.position.y) * Math.min(1, d * 2.2)
  })
  return (
    <group>
      <mesh receiveShadow position={[3.4, -0.05, -5.6]}>
        <boxGeometry args={[3.5, 0.16, 2.3]} />
        <meshStandardMaterial map={concrete} color="#2f323b" roughness={0.92} />
      </mesh>
      <mesh position={[1.72, 0.55, -5.6]} userData={{ camFade: true }}>
        <boxGeometry args={[0.08, 1.1, 2.3]} />
        <meshStandardMaterial color="#3c4049" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[5.08, 0.55, -5.6]} userData={{ camFade: true }}>
        <boxGeometry args={[0.08, 1.1, 2.3]} />
        <meshStandardMaterial color="#3c4049" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* fixed rail sections either side of the gate */}
      <BalconyRail x={2.35} z={-6.6} w={1.05} />
      <BalconyRail x={4.65} z={-6.6} w={0.8} />
      {/* retracting gate section */}
      <group ref={gate}>
        <BalconyRail x={3.6} z={-6.6} w={1.2} />
      </group>
      <Planter position={[4.75, 0.03, -5.0]} radius={0.2} height={0.28} />
      <CornerPalm position={[4.75, 0.31, -5.0]} scale={0.45} />
      <HangingVine position={[2.1, 2.3, -5.2]} length={0.9} strands={4} />
      <pointLight position={[3.4, 2.1, -5.4]} color="#ffb765" intensity={4.2} distance={7} decay={2} />
      <pointLight position={[3.4, 0.9, -6.3]} color="#ff7ad0" intensity={1.6} distance={4.5} decay={2} />
    </group>
  )
}

const BRIDGE_Z0 = -6.6
const BRIDGE_LEN = 10.1
const BRIDGE_DEPLOY_MS = 3400

/**
 * The span that extends across the gap once the code lands. Built at full length and
 * scaled along Z each frame so deploying it never re-renders the React tree.
 */
export function Skybridge({ deployedAt }: { deployedAt: number | null }) {
  const group = useRef<THREE.Group>(null)
  const lightRefs = useRef<Array<THREE.Mesh | null>>([])
  const lamp = useRef<THREE.PointLight>(null)
  const len = BRIDGE_LEN
  const centerZ = -len / 2
  useFrame(() => {
    const g = group.current
    if (!g) return
    let p = 0
    if (deployedAt === -1) p = 1
    else if (deployedAt !== null) p = Math.min(1, (performance.now() - deployedAt) / BRIDGE_DEPLOY_MS)
    p = Math.max(0.0001, p)
    g.visible = p > 0.01
    g.scale.z = p
    g.position.z = BRIDGE_Z0
    const lit = Math.round(p * 9)
    lightRefs.current.forEach((m, i) => {
      if (m) m.visible = i < lit
    })
    if (lamp.current) lamp.current.intensity = 1.4 * p
  })
  return (
    <group ref={group} position={[0, 0, BRIDGE_Z0]}>
      <mesh receiveShadow position={[3.6, -0.06, centerZ]}>
        <boxGeometry args={[1.25, 0.12, len]} />
        <meshStandardMaterial color="#2a2e38" metalness={0.55} roughness={0.5} />
      </mesh>
      {/* tread strip */}
      <mesh position={[3.6, 0.005, centerZ]}>
        <boxGeometry args={[0.95, 0.02, len]} />
        <meshStandardMaterial color="#1e2129" roughness={0.9} />
      </mesh>
      {/* side rails */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[3.6 + s * 0.62, 0.52, centerZ]}>
            <boxGeometry args={[0.05, 0.05, len]} />
            <meshStandardMaterial color="#454a54" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[3.6 + s * 0.62, 0.02, centerZ]}>
            <boxGeometry args={[0.05, 0.05, len]} />
            <meshStandardMaterial color="#454a54" metalness={0.7} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: Math.floor(len / 1.1) }, (_, i) => {
        const z = -0.5 - i * 1.1
        return (
          <group key={i}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[3.6 + s * 0.62, 0.27, z]}>
                <cylinderGeometry args={[0.018, 0.018, 0.5, 6]} />
                <meshStandardMaterial color="#3c4049" metalness={0.7} roughness={0.4} />
              </mesh>
            ))}
          </group>
        )
      })}
      {/* guide lights snap on as it extends */}
      {Array.from({ length: 9 }, (_, i) => {
        const z = -0.7 - i * 1.1
        return (
          <mesh
            key={i}
            visible={false}
            ref={(el) => {
              lightRefs.current[i] = el
            }}
            position={[3.6, 0.03, z]}
          >
            <boxGeometry args={[0.8, 0.012, 0.09]} />
            <meshBasicMaterial color="#6ff0c8" toneMapped={false} />
          </mesh>
        )
      })}
      <pointLight ref={lamp} position={[3.6, 0.8, centerZ]} color="#6ff0c8" intensity={0} distance={9} decay={2} />
    </group>
  )
}
