import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { HeroBody } from './Heroine'
import { getLook, rigFor, type LookId } from '../content/presets'
import type { MotionState } from './Character'

/**
 * Cinematic character-select stage: she stands full height on a transparent
 * canvas so the painted dressing-room plate shows through behind her.
 */
export function LookStage({ lookId, reducedMotion = false }: { lookId: LookId; reducedMotion?: boolean }) {
  const look = useMemo(() => getLook(lookId), [lookId])
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 26, position: [0.5, 0.98, 4.35] }}
      style={{ width: '100%', height: '100%' }}
    >
      <StageCamera />
      <ambientLight color="#6c5f7e" intensity={0.7} />
      {/* warm key from the vanity bulbs, camera left */}
      <spotLight
        color="#ffd6a6"
        intensity={90}
        distance={14}
        angle={0.75}
        penumbra={0.95}
        decay={2}
        position={[2.4, 3.1, 2.4]}
      />
      {/* window rim: teal from behind-left, magenta kicker behind-right */}
      <pointLight color="#63d6c6" intensity={26} distance={9} decay={2} position={[-2.1, 1.8, -1.5]} />
      <pointLight color="#ff6cb6" intensity={20} distance={9} decay={2} position={[2.2, 1.3, -1.7]} />
      <Suspense fallback={null}>
        <Poser look={look} reducedMotion={reducedMotion} />
      </Suspense>
      {/* brass glow on the platform she stands on, matched to the plate */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.52, 0.78, 64]} />
        <meshBasicMaterial color="#f0b463" transparent opacity={0.5} toneMapped={false} />
      </mesh>
    </Canvas>
  )
}

function StageCamera() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0.5, 0.98, 4.35)
    camera.lookAt(0, 0.92, 0)
  }, [camera])
  return null
}

function Poser({ look, reducedMotion }: { look: ReturnType<typeof getLook>; reducedMotion: boolean }) {
  const g = useRef<THREE.Group>(null)
  const motion = useRef<MotionState>({ gait: 0, turning: 0, still: 99, sit: 0 })
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.3) * 0.42
    g.current.rotation.y = Math.PI + 0.22 + t
  })
  return (
    <group ref={g} scale={1.68 * rigFor(look).heightScale}>
      <HeroBody look={look} motion={motion} reducedMotion={reducedMotion} />
    </group>
  )
}
