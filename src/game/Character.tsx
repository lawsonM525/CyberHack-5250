import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LookPreset } from '../content/presets'

export interface MotionState {
  /** 0 idle, ~1 walking, ~2 running. */
  gait: number
  turning: number
  /** Seconds of continuous stillness, used for idle flourishes. */
  still: number
}

interface Props {
  look: LookPreset
  motion: React.RefObject<MotionState>
  reducedMotion?: boolean
}

const JOINT = { hip: 0.9, knee: 0.46, ankle: 0.09, shoulder: 1.4, elbow: 1.14, wrist: 0.9, neck: 1.5 }

export function Character({ look, motion, reducedMotion = false }: Props) {
  const mats = useMemo(() => {
    const skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.52, metalness: 0.03 })
    const skinDark = new THREE.MeshStandardMaterial({ color: look.skinShadow, roughness: 0.6 })
    const hair = new THREE.MeshStandardMaterial({ color: look.hairColor, roughness: 0.72, metalness: 0.06 })
    const hairAccent = new THREE.MeshStandardMaterial({ color: look.hairAccent, roughness: 0.6 })
    const outfit = new THREE.MeshStandardMaterial({ color: look.outfit, roughness: 0.62, metalness: 0.08 })
    const accent = new THREE.MeshStandardMaterial({
      color: look.outfitAccent,
      roughness: 0.34,
      metalness: 0.22,
      emissive: new THREE.Color(look.outfitAccent).multiplyScalar(0.16),
    })
    const trim = new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.22, metalness: 0.92 })
    const nails = new THREE.MeshStandardMaterial({
      color: look.nails,
      roughness: 0.15,
      metalness: 0.55,
      emissive: new THREE.Color(look.nails).multiplyScalar(0.1),
    })
    const lip = new THREE.MeshStandardMaterial({ color: look.lip, roughness: 0.3 })
    const eyeWhite = new THREE.MeshStandardMaterial({ color: '#f4ece2', roughness: 0.3 })
    const eyeDark = new THREE.MeshStandardMaterial({ color: '#150d0a', roughness: 0.18 })
    const boot = new THREE.MeshStandardMaterial({ color: '#191019', roughness: 0.42, metalness: 0.3 })
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#d8a24a',
      transmission: 0.82,
      thickness: 0.02,
      roughness: 0.12,
      transparent: true,
      opacity: 0.55,
    })
    return { skin, skinDark, hair, hairAccent, outfit, accent, trim, nails, lip, eyeWhite, eyeDark, boot, glass }
  }, [look])

  const hips = useRef<THREE.Group>(null)
  const spine = useRef<THREE.Group>(null)
  const chest = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const hairRef = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const foreL = useRef<THREE.Group>(null)
  const foreR = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const shinL = useRef<THREE.Group>(null)
  const shinR = useRef<THREE.Group>(null)

  const phase = useRef(0)

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const m = motion.current ?? { gait: 0, turning: 0, still: 0 }
    const gait = THREE.MathUtils.clamp(m.gait, 0, 2)
    const moving = gait > 0.05
    const cadence = moving ? 4.2 + gait * 2.6 : 0
    phase.current += delta * cadence
    const p = phase.current
    const swing = moving ? Math.min(gait, 2) * 0.52 : 0
    const t = performance.now() / 1000
    const breath = reducedMotion ? 0 : Math.sin(t * 1.5) * 0.016
    const sway = reducedMotion ? 0 : Math.sin(t * 0.6) * 0.03

    if (hips.current) {
      hips.current.position.y = JOINT.hip + (moving ? Math.abs(Math.sin(p)) * 0.035 * gait : breath)
      hips.current.rotation.y = moving ? Math.sin(p) * 0.12 * gait : sway * 0.6
      hips.current.rotation.z = moving ? Math.sin(p) * 0.045 * gait : Math.sin(t * 0.5) * 0.02
      hips.current.rotation.x = moving ? 0.03 * gait : 0
    }
    if (spine.current) {
      spine.current.rotation.y = moving ? -Math.sin(p) * 0.09 * gait : -sway * 0.5
      spine.current.rotation.x = moving ? 0.04 * gait : breath * 0.6
    }
    if (chest.current) {
      chest.current.rotation.y = moving ? -Math.sin(p) * 0.1 * gait : 0
      chest.current.scale.setScalar(1 + breath * 0.5)
    }
    if (head.current) {
      head.current.rotation.y = moving ? Math.sin(p) * 0.05 : Math.sin(t * 0.45) * 0.14
      head.current.rotation.x = moving ? -0.04 * gait : Math.sin(t * 0.33) * 0.05
    }
    if (hairRef.current) {
      hairRef.current.rotation.x = moving ? -Math.abs(Math.sin(p)) * 0.09 * gait : Math.sin(t * 0.8) * 0.02
      hairRef.current.rotation.z = moving ? Math.sin(p) * 0.06 * gait : Math.sin(t * 0.55) * 0.02
    }
    const armIdleL = Math.sin(t * 1.2) * 0.03
    if (armL.current) armL.current.rotation.x = -Math.sin(p) * swing * 0.9 + armIdleL
    if (armR.current) armR.current.rotation.x = Math.sin(p) * swing * 0.9 - armIdleL
    if (foreL.current) foreL.current.rotation.x = -0.25 - Math.max(0, -Math.sin(p)) * swing * 0.8
    if (foreR.current) foreR.current.rotation.x = -0.25 - Math.max(0, Math.sin(p)) * swing * 0.8
    if (legL.current) legL.current.rotation.x = Math.sin(p) * swing
    if (legR.current) legR.current.rotation.x = -Math.sin(p) * swing
    if (shinL.current) shinL.current.rotation.x = Math.max(0, -Math.sin(p + 0.7)) * swing * 1.25
    if (shinR.current) shinR.current.rotation.x = Math.max(0, Math.sin(p + 0.7)) * swing * 1.25
  })

  const hairNode = useMemo(() => buildHair(look, mats), [look, mats])

  return (
    <group>
      {/* hips */}
      <group ref={hips} position={[0, JOINT.hip, 0]}>
        {/* pelvis */}
        <mesh castShadow position={[0, 0.02, 0]}>
          <capsuleGeometry args={[0.145, 0.1, 4, 16]} />
          <primitive object={mats.outfit} attach="material" />
        </mesh>

        <group ref={spine} position={[0, 0.06, 0]}>
          <mesh castShadow position={[0, 0.12, 0]} scale={[1, 1, 0.78]}>
            <capsuleGeometry args={[0.135, 0.13, 4, 16]} />
            <primitive object={mats.skin} attach="material" />
          </mesh>
          {/* belt */}
          <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.145, 0.018, 8, 24]} />
            <primitive object={mats.trim} attach="material" />
          </mesh>

          <group ref={chest} position={[0, 0.24, 0]}>
            {/* chest / jacket */}
            <mesh castShadow position={[0, 0.1, 0]} scale={[1.06, 1, 0.82]}>
              <capsuleGeometry args={[0.165, 0.17, 4, 18]} />
              <primitive object={mats.outfit} attach="material" />
            </mesh>
            {/* open collar showing accent camisole */}
            <mesh position={[0, 0.11, 0.1]} scale={[0.5, 1, 0.42]}>
              <capsuleGeometry args={[0.1, 0.14, 4, 12]} />
              <primitive object={mats.accent} attach="material" />
            </mesh>
            <mesh position={[0, 0.2, 0.085]} rotation={[0.25, 0, 0]}>
              <torusGeometry args={[0.1, 0.014, 8, 20, Math.PI]} />
              <primitive object={mats.trim} attach="material" />
            </mesh>
            {/* shoulders */}
            <mesh position={[-0.17, 0.17, 0]}>
              <sphereGeometry args={[0.072, 16, 12]} />
              <primitive object={mats.outfit} attach="material" />
            </mesh>
            <mesh position={[0.17, 0.17, 0]}>
              <sphereGeometry args={[0.072, 16, 12]} />
              <primitive object={mats.outfit} attach="material" />
            </mesh>

            {/* neck + head */}
            <group position={[0, JOINT.neck - JOINT.hip - 0.3, 0]}>
              <mesh position={[0, 0.02, 0]}>
                <cylinderGeometry args={[0.048, 0.056, 0.1, 12]} />
                <primitive object={mats.skinDark} attach="material" />
              </mesh>
              <group ref={head} position={[0, 0.07, 0]}>
                <mesh castShadow position={[0, 0.1, 0.004]} scale={[0.92, 1.06, 0.98]}>
                  <sphereGeometry args={[0.108, 28, 24]} />
                  <primitive object={mats.skin} attach="material" />
                </mesh>
                {/* jaw */}
                <mesh position={[0, 0.048, 0.016]} scale={[0.8, 0.62, 0.86]}>
                  <sphereGeometry args={[0.1, 20, 16]} />
                  <primitive object={mats.skin} attach="material" />
                </mesh>
                {/* eyes */}
                {[-1, 1].map((s) => (
                  <group key={s} position={[s * 0.043, 0.114, 0.088]}>
                    <mesh scale={[1, 0.62, 0.5]}>
                      <sphereGeometry args={[0.022, 14, 12]} />
                      <primitive object={mats.eyeWhite} attach="material" />
                    </mesh>
                    <mesh position={[0, 0, 0.011]}>
                      <sphereGeometry args={[0.0105, 12, 10]} />
                      <primitive object={mats.eyeDark} attach="material" />
                    </mesh>
                    {/* brow */}
                    <mesh position={[0, 0.026, 0.004]} rotation={[0, 0, s * -0.18]} scale={[1, 0.24, 0.3]}>
                      <boxGeometry args={[0.05, 0.02, 0.02]} />
                      <primitive object={mats.hair} attach="material" />
                    </mesh>
                  </group>
                ))}
                {/* nose + lips */}
                <mesh position={[0, 0.082, 0.099]} scale={[0.7, 0.8, 0.9]}>
                  <sphereGeometry args={[0.018, 12, 10]} />
                  <primitive object={mats.skin} attach="material" />
                </mesh>
                <mesh position={[0, 0.045, 0.094]} scale={[1.5, 0.55, 0.5]}>
                  <sphereGeometry args={[0.024, 16, 12]} />
                  <primitive object={mats.lip} attach="material" />
                </mesh>
                {/* ears + jewellery */}
                {[-1, 1].map((s) => (
                  <group key={s} position={[s * 0.1, 0.092, 0.006]}>
                    <mesh scale={[0.4, 1, 0.7]}>
                      <sphereGeometry args={[0.026, 10, 10]} />
                      <primitive object={mats.skinDark} attach="material" />
                    </mesh>
                    {look.earrings === 'hoops' ? (
                      <mesh position={[0, -0.032, 0]} rotation={[0, Math.PI / 2, 0]}>
                        <torusGeometry args={[0.026, 0.0042, 8, 22]} />
                        <primitive object={mats.trim} attach="material" />
                      </mesh>
                    ) : (
                      <group position={[0, -0.03, 0]}>
                        <mesh>
                          <cylinderGeometry args={[0.002, 0.002, 0.03, 6]} />
                          <primitive object={mats.trim} attach="material" />
                        </mesh>
                        <mesh position={[0, -0.024, 0]}>
                          <octahedronGeometry args={[0.012, 0]} />
                          <primitive object={mats.trim} attach="material" />
                        </mesh>
                      </group>
                    )}
                  </group>
                ))}
                {look.glasses && (
                  <group position={[0, 0.114, 0.1]}>
                    {[-1, 1].map((s) => (
                      <mesh key={s} position={[s * 0.043, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.031, 0.031, 0.006, 18]} />
                        <primitive object={mats.glass} attach="material" />
                      </mesh>
                    ))}
                    <mesh position={[0, 0, 0]}>
                      <boxGeometry args={[0.03, 0.004, 0.004]} />
                      <primitive object={mats.trim} attach="material" />
                    </mesh>
                    {[-1, 1].map((s) => (
                      <mesh key={s} position={[s * 0.078, 0, -0.04]} rotation={[0, s * 0.35, 0]}>
                        <boxGeometry args={[0.004, 0.004, 0.08]} />
                        <primitive object={mats.trim} attach="material" />
                      </mesh>
                    ))}
                  </group>
                )}
                <group ref={hairRef}>{hairNode}</group>
              </group>
            </group>

            {/* arms */}
            {([-1, 1] as const).map((side) => {
              const upper = side === -1 ? armL : armR
              const fore = side === -1 ? foreL : foreR
              return (
                <group key={side} ref={upper} position={[side * 0.185, 0.16, 0]}>
                  <mesh castShadow position={[0, -0.13, 0]} scale={[1, 1, 0.95]}>
                    <capsuleGeometry args={[0.046, 0.19, 4, 12]} />
                    <primitive object={mats.skin} attach="material" />
                  </mesh>
                  {/* sleeve cuff */}
                  <mesh position={[0, -0.03, 0]}>
                    <cylinderGeometry args={[0.055, 0.05, 0.07, 14]} />
                    <primitive object={mats.outfit} attach="material" />
                  </mesh>
                  <group ref={fore} position={[0, -0.26, 0]}>
                    <mesh castShadow position={[0, -0.11, 0]}>
                      <capsuleGeometry args={[0.038, 0.17, 4, 12]} />
                      <primitive object={mats.skin} attach="material" />
                    </mesh>
                    {/* bracelet */}
                    <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                      <torusGeometry args={[0.04, 0.007, 8, 18]} />
                      <primitive object={mats.trim} attach="material" />
                    </mesh>
                    {/* hand */}
                    <group position={[0, -0.235, 0]}>
                      <mesh scale={[0.75, 1.15, 0.45]}>
                        <sphereGeometry args={[0.048, 14, 12]} />
                        <primitive object={mats.skin} attach="material" />
                      </mesh>
                      {[-1, -0.35, 0.35, 1].map((f, i) => (
                        <mesh key={i} position={[f * 0.022, -0.055, 0]} scale={[0.5, 1.4, 0.5]}>
                          <sphereGeometry args={[0.013, 8, 8]} />
                          <primitive object={mats.skin} attach="material" />
                        </mesh>
                      ))}
                      {[-1, -0.35, 0.35, 1].map((f, i) => (
                        <mesh key={`n${i}`} position={[f * 0.022, -0.072, 0.004]} scale={[0.5, 0.8, 0.45]}>
                          <sphereGeometry args={[0.0095, 8, 8]} />
                          <primitive object={mats.nails} attach="material" />
                        </mesh>
                      ))}
                    </group>
                  </group>
                </group>
              )
            })}
          </group>
        </group>

        {/* legs */}
        {([-1, 1] as const).map((side) => {
          const thigh = side === -1 ? legL : legR
          const shin = side === -1 ? shinL : shinR
          return (
            <group key={side} ref={thigh} position={[side * 0.085, -0.02, 0]}>
              <mesh castShadow position={[0, -0.22, 0]} scale={[1.05, 1, 1]}>
                <capsuleGeometry args={[0.072, 0.28, 4, 14]} />
                <primitive object={mats.outfit} attach="material" />
              </mesh>
              <group ref={shin} position={[0, -0.44, 0]}>
                <mesh castShadow position={[0, -0.17, 0]}>
                  <capsuleGeometry args={[0.055, 0.24, 4, 14]} />
                  <primitive object={mats.outfit} attach="material" />
                </mesh>
                {/* boot */}
                <mesh castShadow position={[0, -0.34, 0.012]}>
                  <capsuleGeometry args={[0.062, 0.12, 4, 12]} />
                  <primitive object={mats.boot} attach="material" />
                </mesh>
                <mesh castShadow position={[0, -0.415, 0.05]}>
                  <boxGeometry args={[0.105, 0.06, 0.22]} />
                  <primitive object={mats.boot} attach="material" />
                </mesh>
                <mesh position={[0, -0.3, 0]}>
                  <cylinderGeometry args={[0.068, 0.064, 0.03, 14]} />
                  <primitive object={mats.accent} attach="material" />
                </mesh>
              </group>
            </group>
          )
        })}
      </group>
    </group>
  )
}

function buildHair(look: LookPreset, mats: Record<string, THREE.Material>) {
  const hair = mats.hair
  const accent = mats.hairAccent
  const trim = mats.trim
  if (look.hair === 'afro') {
    const puffs: Array<[number, number, number, number]> = [
      [0, 0.2, -0.01, 0.125],
      [-0.1, 0.17, 0.02, 0.085],
      [0.1, 0.17, 0.02, 0.085],
      [0, 0.15, -0.1, 0.095],
      [-0.09, 0.1, -0.07, 0.08],
      [0.09, 0.1, -0.07, 0.08],
      [0, 0.24, 0.05, 0.075],
      [-0.06, 0.22, 0.07, 0.06],
      [0.06, 0.22, 0.07, 0.06],
    ]
    return (
      <group>
        {puffs.map((p, i) => (
          <mesh key={i} castShadow position={[p[0], p[1], p[2]]}>
            <sphereGeometry args={[p[3], 16, 14]} />
            <primitive object={i % 4 === 3 ? accent : hair} attach="material" />
          </mesh>
        ))}
        <mesh position={[0, 0.215, 0.04]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.1, 0.008, 8, 26, Math.PI * 1.1]} />
          <primitive object={trim} attach="material" />
        </mesh>
      </group>
    )
  }
  if (look.hair === 'braids') {
    const braids: Array<[number, number]> = [
      [-0.085, -0.02],
      [-0.045, -0.055],
      [0, -0.07],
      [0.045, -0.055],
      [0.085, -0.02],
      [-0.065, -0.085],
      [0.065, -0.085],
    ]
    return (
      <group>
        <mesh castShadow position={[0, 0.14, -0.012]} scale={[1.04, 1.02, 1.06]}>
          <sphereGeometry args={[0.112, 20, 16]} />
          <primitive object={hair} attach="material" />
        </mesh>
        {braids.map((b, i) => (
          <group key={i} position={[b[0], 0.1, b[1] - 0.05]} rotation={[0.18 + i * 0.005, 0, b[0] * 0.8]}>
            <mesh castShadow position={[0, -0.16, 0]}>
              <capsuleGeometry args={[0.014, 0.3, 4, 8]} />
              <primitive object={i % 3 === 2 ? accent : hair} attach="material" />
            </mesh>
            <mesh position={[0, -0.33, 0]}>
              <torusGeometry args={[0.016, 0.004, 6, 12]} />
              <primitive object={trim} attach="material" />
            </mesh>
          </group>
        ))}
      </group>
    )
  }
  // locs, pinned up
  const locs: Array<[number, number, number]> = [
    [-0.055, 0.25, 0.02],
    [0.05, 0.255, -0.01],
    [0, 0.27, 0.04],
    [-0.02, 0.24, -0.05],
    [0.03, 0.235, -0.06],
  ]
  return (
    <group>
      <mesh castShadow position={[0, 0.145, -0.01]} scale={[1.03, 1.0, 1.04]}>
        <sphereGeometry args={[0.112, 20, 16]} />
        <primitive object={hair} attach="material" />
      </mesh>
      <mesh castShadow position={[0, 0.235, -0.015]}>
        <sphereGeometry args={[0.078, 16, 14]} />
        <primitive object={hair} attach="material" />
      </mesh>
      {locs.map((l, i) => (
        <mesh key={i} castShadow position={l} rotation={[i * 0.3, i * 0.7, i * 0.2]}>
          <capsuleGeometry args={[0.012, 0.075, 4, 8]} />
          <primitive object={i % 2 ? accent : hair} attach="material" />
        </mesh>
      ))}
      {/* face-framing locs */}
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[s * 0.092, 0.06, 0.05]} rotation={[0.1, 0, s * 0.2]}>
          <capsuleGeometry args={[0.013, 0.12, 4, 8]} />
          <primitive object={hair} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0.235, 0.05]} rotation={[0.4, 0, 0]}>
        <torusGeometry args={[0.07, 0.007, 8, 22]} />
        <primitive object={trim} attach="material" />
      </mesh>
    </group>
  )
}
