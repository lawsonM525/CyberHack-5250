import { useMemo } from 'react'
import * as THREE from 'three'

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

function useLeafGeo(len: number, width: number, notch = false) {
  return useMemo(() => {
    const g = new THREE.ShapeGeometry(leafShape(len, width, notch), 18)
    g.computeVertexNormals()
    return g
  }, [len, width, notch])
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
  const geo = useLeafGeo(0.52, 0.3, true)
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
              color={i % 2 ? greenA : greenB}
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
  const frondGeo = useLeafGeo(0.1, 0.035)
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
            {Array.from({ length: 7 }, (_, j) => {
              const t = (j + 1) / 8
              return [-1, 1].map((s) => (
                <mesh
                  key={`${j}-${s}`}
                  geometry={frondGeo}
                  position={[0, f.len * t, 0]}
                  rotation={[0, 0, (s * Math.PI) / 2.4]}
                  scale={1 - t * 0.45}
                >
                  <meshStandardMaterial color={greenC} roughness={0.7} side={THREE.DoubleSide} />
                </mesh>
              ))
            })}
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

export function CornerPalm({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const leafGeo = useLeafGeo(0.75, 0.16)
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
          <mesh geometry={leafGeo} castShadow rotation={[-f.tilt, 0, 0]} position={[0, 0, 0.02]}>
            <meshStandardMaterial color={i % 3 ? greenA : greenC} roughness={0.68} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
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
