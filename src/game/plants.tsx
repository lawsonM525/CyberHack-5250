import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { leafTexture } from './textures'

/** A simple pointed leaf outline in the XY plane, tip at +Y. */
function leafShape(len: number, width: number, notch = false): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(width * 0.6, len * 0.18, width, len * 0.55, 0, len)
  s.bezierCurveTo(-width, len * 0.55, -width * 0.6, len * 0.18, 0, 0)
  if (notch) {
    for (let i = 1; i <= 3; i++) {
      const y = (len * i) / 4.2
      const hole = new THREE.Path()
      const w = width * (0.42 - i * 0.05)
      hole.ellipse(width * 0.34, y, w * 0.5, len * 0.055, 0, Math.PI * 2, false, 0)
      s.holes.push(hole)
      const hole2 = new THREE.Path()
      hole2.ellipse(-width * 0.34, y + len * 0.06, w * 0.5, len * 0.055, 0, Math.PI * 2, false, 0)
      s.holes.push(hole2)
    }
  }
  return s
}

/**
 * Curls a flat leaf outline into a cupped, drooping blade: the cross-section is
 * troughed around the midrib and the tip falls away, so leaves catch light along
 * an edge instead of reading as paper cut-outs.
 */
function curl(g: THREE.BufferGeometry, len: number, width: number, droop: number) {
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const t = Math.max(0, Math.min(1, y / len))
    const cup = -((x / Math.max(width, 0.001)) ** 2) * width * 0.55
    p.setZ(i, cup - droop * t * t * len * 0.45)
    p.setY(i, y * (1 - droop * 0.12 * t))
  }
  p.needsUpdate = true
  g.computeVertexNormals()
}

function useLeafGeo(len: number, width: number, notch = false, droop = 0.6) {
  return useMemo(() => {
    const g = new THREE.ShapeGeometry(leafShape(len, width, notch), 18)
    leafUvs(g, len, width)
    curl(g, len, width, droop)
    return g
  }, [len, width, notch, droop])
}

/**
 * A pinnate frond baked into one geometry: leaflets step up an arching rachis,
 * shrinking and drooping toward the tip, so a palm or fern reads as a spray of
 * blades rather than one flat paddle — and costs a single draw call.
 */
function usePinnateGeo(len: number, leafLen: number, leafWidth: number, pairs: number, arch = 0.45) {
  return useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    for (let i = 0; i < pairs; i++) {
      const t = (i + 1) / (pairs + 1)
      const s = 1 - t * 0.55
      const y = len * t
      const z = -arch * t * t * len
      for (const side of [-1, 1]) {
        const g = new THREE.ShapeGeometry(leafShape(leafLen, leafWidth, false), 8)
        curl(g, leafLen, leafWidth, 0.5)
        g.scale(s, s, s)
        g.rotateZ(side * (Math.PI / 2.6 - t * 0.35))
        g.rotateX(-arch * t * 0.8)
        g.translate(0, y, z)
        parts.push(g)
      }
    }
    const merged = mergeGeometries(parts, false) ?? new THREE.BufferGeometry()
    parts.forEach((g) => g.dispose())
    merged.computeVertexNormals()
    return merged
  }, [len, leafLen, leafWidth, pairs, arch])
}

const greenA = '#3e7f4e'
const greenB = '#2f6b45'
const greenC = '#5da368'

export function Planter({
  position,
  color = '#7d5b43',
  radius = 0.26,
  height = 0.34,
  tag,
}: {
  position: [number, number, number]
  color?: string
  radius?: number
  height?: number
  tag?: string
}) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius * 0.78, height, 20]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* thrown rim and a saucer: gives each pot a silhouette of its own */}
      <mesh castShadow position={[0, height - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.99, radius * 0.07, 6, 20]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh receiveShadow position={[0, 0.012, 0]}>
        <cylinderGeometry args={[radius * 0.92, radius * 0.86, 0.024, 20]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, height - 0.01, 0]}>
        <cylinderGeometry args={[radius * 0.94, radius * 0.94, 0.03, 20]} />
        <meshStandardMaterial color="#2a1f18" roughness={1} />
      </mesh>
      {tag && (
        <group position={[0, height * 0.62, radius * 0.96]} rotation={[-0.25, 0, 0.06]}>
          <mesh castShadow>
            <boxGeometry args={[0.17, 0.1, 0.006]} />
            <meshStandardMaterial color="#e8dcc4" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.004]}>
            <planeGeometry args={[0.13, 0.05]} />
            <meshStandardMaterial color="#5a4a3a" roughness={1} />
          </mesh>
        </group>
      )}
    </group>
  )
}

export function Monstera({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const geo = useLeafGeo(0.5, 0.4, true, 0.9)
  const map = useMemo(() => leafTexture(), [])
  const leaves = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        a: (i / 9) * Math.PI * 2 + 0.4,
        tilt: 0.55 + (i % 3) * 0.22,
        h: 0.35 + (i % 4) * 0.17,
        s: 0.8 + ((i * 37) % 10) / 22,
      })),
    [],
  )
  return (
    <group position={position} scale={scale}>
      {leaves.map((l, i) => (
        <group key={i} rotation={[0, l.a, 0]}>
          <mesh position={[0, l.h * 0.55, 0.06]} rotation={[Math.PI / 2 - l.tilt, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.016, l.h, 6]} />
            <meshStandardMaterial color="#4d7a45" roughness={0.8} />
          </mesh>
          <mesh
            geometry={geo}
            castShadow
            position={[0, l.h * 0.9, 0.06 + Math.sin(l.tilt) * l.h * 0.5]}
            rotation={[-l.tilt, 0, 0]}
            scale={l.s}
          >
            <meshStandardMaterial
              map={map}
              color={i % 2 ? '#c8ddb8' : '#9dc396'}
              roughness={0.62}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Fern({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const frondGeo = usePinnateGeo(0.36, 0.1, 0.035, 7, 0.5)
  const fronds = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        a: (i / 14) * Math.PI * 2,
        tilt: 0.5 + ((i * 13) % 7) * 0.09,
        len: 0.34 + ((i * 7) % 5) * 0.05,
      })),
    [],
  )
  return (
    <group position={position} scale={scale}>
      {fronds.map((f, i) => (
        <group key={i} rotation={[0, f.a, 0]}>
          <group rotation={[-f.tilt, 0, 0]}>
            <mesh position={[0, f.len / 2, 0]}>
              <cylinderGeometry args={[0.005, 0.008, f.len, 5]} />
              <meshStandardMaterial color="#3d6b3f" roughness={0.9} />
            </mesh>
            <mesh geometry={frondGeo} castShadow scale={f.len / 0.36}>
              <meshStandardMaterial
                color={i % 3 ? greenC : greenA}
                roughness={0.7}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

export function Jasmine({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const leafGeo = useLeafGeo(0.09, 0.035)
  const vines = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        a: (i / 7) * Math.PI * 2 + 0.2,
        drop: 0.3 + ((i * 11) % 5) * 0.11,
        out: 0.16 + ((i * 5) % 4) * 0.04,
      })),
    [],
  )
  return (
    <group position={position} scale={scale}>
      {vines.map((v, i) => (
        <group key={i} rotation={[0, v.a, 0]}>
          {Array.from({ length: 8 }, (_, j) => {
            const t = j / 7
            const x = v.out * (0.4 + t)
            const y = 0.14 - v.drop * t * t
            return (
              <group key={j} position={[x, y, 0]}>
                <mesh>
                  <sphereGeometry args={[0.009, 6, 6]} />
                  <meshStandardMaterial color="#4a7a4a" roughness={0.9} />
                </mesh>
                <mesh geometry={leafGeo} rotation={[0, (j % 2 ? 1 : -1) * 0.6, 1.4 + t]}>
                  <meshStandardMaterial color={greenA} roughness={0.7} side={THREE.DoubleSide} />
                </mesh>
                {j % 3 === 1 && (
                  <mesh position={[0.01, -0.02, 0.01]}>
                    <sphereGeometry args={[0.016, 8, 7]} />
                    <meshStandardMaterial
                      color="#f4ead6"
                      emissive="#4a3a22"
                      emissiveIntensity={0.4}
                      roughness={0.6}
                    />
                  </mesh>
                )}
              </group>
            )
          })}
        </group>
      ))}
    </group>
  )
}

export function NightOrchid({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const leafGeo = useLeafGeo(0.2, 0.07)
  const blooms = useMemo(() => [0.42, 0.52, 0.6, 0.66], [])
  return (
    <group position={position} scale={scale}>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={leafGeo} position={[s * 0.05, 0.03, 0]} rotation={[-1.1, 0, s * 0.5]}>
          <meshStandardMaterial color={greenB} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0.05, 0.36, 0]} rotation={[0, 0, -0.22]}>
        <cylinderGeometry args={[0.006, 0.01, 0.72, 6]} />
        <meshStandardMaterial color="#4d6b45" roughness={0.9} />
      </mesh>
      {blooms.map((h, i) => (
        <group key={i} position={[0.05 + i * 0.03, h, 0.01]} rotation={[0, i * 0.7, 0]}>
          {Array.from({ length: 5 }, (_, p) => (
            <mesh key={p} rotation={[0, 0, (p / 5) * Math.PI * 2]} position={[0, 0, 0]}>
              <circleGeometry args={[0.035, 10, 0, Math.PI / 2.1]} />
              <meshStandardMaterial
                color={i % 2 ? '#d86aa0' : '#c2447a'}
                emissive="#3a0e26"
                emissiveIntensity={0.5}
                roughness={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#e8b765" emissive="#5a3d10" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** A broad ovate blade: wide shoulders, rounded belly, drawn-out tip. */
function broadLeafShape(len: number, width: number): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(width * 0.85, len * 0.1, width, len * 0.42, width * 0.46, len * 0.82)
  s.bezierCurveTo(width * 0.26, len * 0.95, width * 0.1, len, 0, len)
  s.bezierCurveTo(-width * 0.1, len, -width * 0.26, len * 0.95, -width * 0.46, len * 0.82)
  s.bezierCurveTo(-width, len * 0.42, -width * 0.85, len * 0.1, 0, 0)
  return s
}

/** Maps the blade's own extent onto one tile of the leaf texture. */
function leafUvs(g: THREE.BufferGeometry, len: number, width: number) {
  const p = g.attributes.position as THREE.BufferAttribute
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    uv.setXY(i, (p.getX(i) / width + 1) / 2, Math.max(0, Math.min(1, p.getY(i) / len)))
  }
  uv.needsUpdate = true
}

/**
 * The room's hero foliage: a tub plant of broad veined blades on arching
 * petioles — the fiddle-leaf/bird-of-paradise silhouette the reference leans
 * on. Blades and stems are merged into one geometry, so the whole plant is a
 * single draw call.
 */
export function BroadLeafPlant({
  position,
  scale = 1,
  leaves = 11,
  height = 1.15,
}: {
  position: [number, number, number]
  scale?: number
  leaves?: number
  height?: number
}) {
  const map = useMemo(() => leafTexture(), [])
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    const rand = (n: number) => Math.abs((Math.sin(n * 91.7) * 4375.85) % 1)
    for (let i = 0; i < leaves; i++) {
      const t = i / leaves
      const a = t * Math.PI * 2 * 1.618
      const lean = 0.38 + rand(i + 3) * 0.5
      // short petioles, long blades: leaves have to start low or the plant
      // reads as a spider of bare stalks with paddles on the end
      const stalk = height * (0.16 + rand(i * 5 + 1) * 0.46)
      const len = height * (0.42 + rand(i * 7 + 2) * 0.24)
      const width = len * (0.54 + rand(i * 11 + 4) * 0.12)

      // petiole: a real curve from the crown out to where the blade starts
      const pts: THREE.Vector3[] = []
      for (let k = 0; k <= 6; k++) {
        const u = k / 6
        pts.push(
          new THREE.Vector3(
            Math.cos(a) * Math.sin(lean) * stalk * u * u,
            stalk * u * (1 - 0.12 * u),
            Math.sin(a) * Math.sin(lean) * stalk * u * u,
          ),
        )
      }
      const curve = new THREE.CatmullRomCurve3(pts)
      const stem = new THREE.TubeGeometry(curve, 8, 0.013, 5, false)
      // hold the stem on one green patch of the leaf sheet instead of letting
      // it smear the midrib and veins along its length
      const suv = stem.attributes.uv as THREE.BufferAttribute
      for (let v = 0; v < suv.count; v++) suv.setXY(v, 0.78, 0.3)
      suv.needsUpdate = true
      parts.push(stem)

      const tip = curve.getPointAt(1)
      const dir = curve.getTangentAt(1)
      const blade = new THREE.ShapeGeometry(broadLeafShape(len, width), 14)
      leafUvs(blade, len, width)
      // cup across the midrib and let the tip nod over
      const bp = blade.attributes.position as THREE.BufferAttribute
      for (let v = 0; v < bp.count; v++) {
        const x = bp.getX(v)
        const y = bp.getY(v)
        const ny = Math.max(0, Math.min(1, y / len))
        bp.setZ(v, -((x / width) ** 2) * width * 0.42 - ny * ny * len * 0.34)
      }
      bp.needsUpdate = true
      blade.computeVertexNormals()
      blade.rotateZ((rand(i * 13 + 6) - 0.5) * 0.5)
      // stand the blade up along the petiole's tangent
      const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0))
      blade.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
      blade.applyMatrix4(m)
      blade.translate(tip.x, tip.y, tip.z)
      parts.push(blade)
    }
    const merged = mergeGeometries(parts, false) ?? new THREE.BufferGeometry()
    parts.forEach((g) => g.dispose())
    merged.computeVertexNormals()
    return merged
  }, [leaves, height])

  return (
    <group position={position} scale={scale}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial map={map} roughness={0.66} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export function CornerPalm({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const frondGeo = usePinnateGeo(0.78, 0.2, 0.045, 9, 0.4)
  const fronds = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        a: (i / 11) * Math.PI * 2,
        tilt: 0.35 + ((i * 17) % 6) * 0.14,
        h: 0.9 + ((i * 23) % 5) * 0.14,
      })),
    [],
  )
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.035, 0.06, 1.0, 8]} />
        <meshStandardMaterial color="#6b5238" roughness={0.95} />
      </mesh>
      {fronds.map((f, i) => (
        <group key={i} position={[0, f.h, 0]} rotation={[0, f.a, 0]}>
          <group rotation={[-f.tilt, 0, 0]} position={[0, 0, 0.02]}>
            <mesh position={[0, 0.34, -0.06]} rotation={[0.24, 0, 0]}>
              <cylinderGeometry args={[0.007, 0.012, 0.72, 5]} />
              <meshStandardMaterial color="#4d6b45" roughness={0.9} />
            </mesh>
            <mesh geometry={frondGeo} castShadow>
              <meshStandardMaterial
                color={i % 3 ? greenA : greenC}
                roughness={0.68}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

/**
 * The reference's signature motif: ivy falling in long dense curtains off the
 * window head and the shelf tops. Every leaf and stem of one fall is baked into
 * a single geometry, so a curtain of ~200 leaves is still one draw call.
 */
export function IvyFall({
  position,
  rotation = [0, 0, 0],
  strands = 7,
  length = 1.6,
  spread = 0.5,
  scale = 1,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  strands?: number
  length?: number
  spread?: number
  scale?: number
}) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    const rand = (n: number) => (Math.sin(n * 127.1) * 43758.5453) % 1
    for (let s = 0; s < strands; s++) {
      const x0 = (s / Math.max(1, strands - 1) - 0.5) * spread
      const len = length * (0.55 + Math.abs(rand(s + 1)) * 0.75)
      const sway = (rand(s * 3 + 7) - 0.2) * 0.22
      const pts: THREE.Vector3[] = []
      const n = 10
      for (let i = 0; i <= n; i++) {
        const t = i / n
        pts.push(
          new THREE.Vector3(
            x0 + Math.sin(t * 2.4 + s) * 0.05 + sway * t * t,
            -len * t,
            Math.cos(t * 1.9 + s * 1.7) * 0.06,
          ),
        )
      }
      const curve = new THREE.CatmullRomCurve3(pts)
      const stem = new THREE.TubeGeometry(curve, 14, 0.008, 4, false)
      parts.push(stem)
      const leaves = Math.round(len * 26)
      for (let i = 1; i < leaves; i++) {
        const t = i / leaves
        const at = curve.getPointAt(t)
        const size = 0.042 + Math.abs(rand(s * 31 + i)) * 0.034
        const g = new THREE.ShapeGeometry(leafShape(size * 1.6, size * 0.7, false), 6)
        curl(g, size * 1.6, size * 0.7, 0.8)
        // leaves alternate down the stem and hang tip-down, like real ivy
        g.rotateZ(Math.PI * (i % 2 ? 0.78 : 1.22) + rand(i + s) * 0.35)
        g.rotateY(i * 1.9 + s)
        g.translate(at.x, at.y, at.z)
        parts.push(g)
      }
    }
    const merged = mergeGeometries(parts, false) ?? new THREE.BufferGeometry()
    parts.forEach((g) => g.dispose())
    merged.computeVertexNormals()
    return merged
  }, [strands, length, spread])
  return (
    <mesh geometry={geo} position={position} rotation={rotation} scale={scale} castShadow>
      <meshStandardMaterial color={greenB} roughness={0.78} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function HangingVine({
  position,
  length = 1.1,
  strands = 5,
}: {
  position: [number, number, number]
  length?: number
  strands?: number
}) {
  const leafGeo = useLeafGeo(0.075, 0.03)
  return (
    <group position={position}>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.11, 0.14, 0.14, 14]} />
        <meshStandardMaterial color="#8a6a4c" roughness={0.9} />
      </mesh>
      {Array.from({ length: strands }, (_, i) => {
        const a = (i / strands) * Math.PI * 2
        const r = 0.07
        const len = length * (0.6 + ((i * 13) % 5) / 8)
        return (
          <group key={i} position={[Math.cos(a) * r, -0.12, Math.sin(a) * r]}>
            {Array.from({ length: 9 }, (_, j) => {
              const t = j / 8
              return (
                <group key={j} position={[Math.sin(t * 3 + i) * 0.03, -len * t, Math.cos(t * 2 + i) * 0.03]}>
                  <mesh>
                    <sphereGeometry args={[0.008, 6, 6]} />
                    <meshStandardMaterial color="#4a7a4a" roughness={0.9} />
                  </mesh>
                  <mesh geometry={leafGeo} rotation={[0, j * 1.2, 2.2]}>
                    <meshStandardMaterial color={j % 2 ? greenA : greenC} roughness={0.7} side={THREE.DoubleSide} />
                  </mesh>
                </group>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}
