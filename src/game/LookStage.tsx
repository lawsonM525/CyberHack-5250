import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { HeroBody } from './Heroine'
import { getLook, rigFor, type LookId } from '../content/presets'
import type { MotionState } from './Character'

const EYE = new THREE.Vector3(0.3, 0.9, 4.1)
const AIM = new THREE.Vector3(0, 0.9, 0)

/**
 * Cinematic character-select stage: she stands full height on a transparent
 * canvas so the painted dressing-room plate shows through behind her. The lens
 * frames her feet on the canvas's bottom edge so the layout can set them down
 * on the plate's platform.
 */
export function LookStage({ lookId, reducedMotion = false }: { lookId: LookId; reducedMotion?: boolean }) {
  const look = useMemo(() => getLook(lookId), [lookId])
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 26, position: EYE.toArray() }}
      style={{ width: '100%', height: '100%' }}
    >
      <StageCamera />
      <ambientLight color="#c9bcd6" intensity={1.5} />
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
    </Canvas>
  )
}

function StageCamera() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.copy(EYE)
    camera.lookAt(AIM)
  }, [camera])
  return null
}

function Poser({ look, reducedMotion }: { look: ReturnType<typeof getLook>; reducedMotion: boolean }) {
  const g = useRef<THREE.Group>(null)
  const motion = useRef<MotionState>({ gait: 0, turning: 0, still: 99, sit: 0, speed: 0 })
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.3) * 0.36
    g.current.rotation.y = Math.PI + 0.18 + t
  })
  return (
    <group ref={g} scale={1.68 * rigFor(look).heightScale}>
      <HeroBody look={look} motion={motion} reducedMotion={reducedMotion} />
    </group>
  )
}
