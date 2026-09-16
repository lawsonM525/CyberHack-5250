import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'
import * as THREE from 'three'
import { Apartment } from './Apartment'
import { City, HomeBalcony, KingsleyRow, Skybridge } from './city'
import { Player } from './Player'
import { HeroBody } from './Heroine'
import { useGame } from '../state/store'
import { useUi } from '../state/ui'
import { getLook, type LookId } from '../content/presets'
import type { MotionState } from './Character'

function skyTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 256
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#05060d')
  grad.addColorStop(0.45, '#0b1024')
  grad.addColorStop(0.72, '#1d2246')
  grad.addColorStop(0.88, '#3a2b44')
  grad.addColorStop(1, '#5c3350')
  g.fillStyle = grad
  g.fillRect(0, 0, 8, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.mapping = THREE.EquirectangularReflectionMapping
  return tex
}

function Sky() {
  const tex = useMemo(skyTexture, [])
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[320, 24, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/** Software rasterisers (SwiftShader, llvmpipe) cannot carry shadows + bloom. */
function isSoftwareRenderer(gl: THREE.WebGLRenderer) {
  const ctx = gl.getContext()
  const ext = ctx.getExtension('WEBGL_debug_renderer_info')
  const name = ext ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
  return /swiftshader|llvmpipe|software/i.test(name)
}

function Rig({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  const { gl, scene } = useThree()
  const setSettings = useGame((s) => s.setSettings)

  useEffect(() => {
    if (quality !== 'low' && isSoftwareRenderer(gl)) setSettings({ quality: 'low' })
  }, [gl, quality, setSettings])

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.06
    gl.shadowMap.enabled = quality !== 'low'
    gl.shadowMap.type = THREE.PCFShadowMap
    scene.fog = new THREE.FogExp2(new THREE.Color('#0a0e1c'), 0.0075)
    return () => {
      scene.fog = null
    }
  }, [gl, scene, quality])
  return null
}

function Lights({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  const shadows = quality !== 'low'
  const low = quality === 'low'
  return (
    <group>
      {/* warm lamplight bounce, not the cold blue wash the room used to sit in */}
      <ambientLight color="#6f5744" intensity={1.5} />
      <hemisphereLight color="#b58a5e" groundColor="#4a3222" intensity={1.25} />
      {/* city spill through the window */}
      <directionalLight color="#8fb0ff" intensity={0.85} position={[-2.5, 4.5, -12]} />
      <directionalLight color="#ffc188" intensity={0.8} position={[4, 3, 6]} />
      {/* desk lamp, floor lamp and vanity bulbs as warm pools */}
      <pointLight color="#ffb46a" intensity={9} distance={5.5} decay={2} position={[-3.4, 1.35, -3.3]} />
      <pointLight color="#ffc890" intensity={12} distance={6} decay={2} position={[-5.5, 1.7, 2.9]} />
      {!low && <pointLight color="#ffd2a8" intensity={8} distance={4.5} decay={2} position={[5.3, 1.75, 0.1]} />}
      {!low && <pointLight color="#6fd9ff" intensity={5} distance={4} decay={2} position={[-4.2, 1.25, -3.5]} />}
      {/* warm practical over the room */}
      <spotLight
        color="#ffc48c"
        intensity={44}
        distance={11}
        angle={0.95}
        penumbra={0.85}
        decay={2}
        position={[-0.6, 3.1, 1.0]}
        castShadow={shadows}
        shadow-mapSize-width={quality === 'high' ? 1024 : 512}
        shadow-mapSize-height={quality === 'high' ? 1024 : 512}
        shadow-bias={-0.0015}
      />
      {!low && <pointLight color="#ff9ad0" intensity={2.2} distance={5} decay={2} position={[5.2, 1.9, 0.1]} />}
    </group>
  )
}

const LIGHT_BUDGET = { low: 5, medium: 8, high: 12 } as const

/**
 * Every lit material pays for every visible point light, and the apartment plus
 * the street carry around twenty practicals. Keep the nearest few alive and let
 * the rest sleep: the count stays fixed, so the shaders are compiled once.
 */
function LightBudget({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  const { scene, camera } = useThree()
  const next = useRef(0)
  const budget = LIGHT_BUDGET[quality]

  useFrame((_, delta) => {
    next.current -= delta
    if (next.current > 0) return
    next.current = 0.3
    const points: THREE.PointLight[] = []
    scene.traverse((o) => {
      const l = o as THREE.PointLight
      if (l.isPointLight && l.intensity > 0) points.push(l)
    })
    // rank by how much of the frame a light actually warms, not by proximity
    // alone: a dim trinket light beside the lens used to evict the lamp lighting
    // the wall she is looking at
    const score = (l: THREE.PointLight, tmp: THREE.Vector3): number => {
      const d2 = l.getWorldPosition(tmp).distanceToSquared(camera.position)
      return (l.intensity * Math.max(1, l.distance)) / (1 + d2)
    }
    points.sort((a, b) => score(b, TMP_B) - score(a, TMP_A))
    points.forEach((l, i) => {
      l.visible = i < budget
    })
  })
  return null
}

const TMP_A = new THREE.Vector3()
const TMP_B = new THREE.Vector3()

export function Scene({ paused }: { paused: boolean }) {
  const quality = useGame((s) => s.settings.quality)
  const reducedMotion = useGame((s) => s.settings.reducedMotion)
  const stage = useGame((s) => s.stage)
  const setFocus = useUi((s) => s.setFocus)
  const deployedAt = useGame((s) => s.bridgeDeployedAt)
  const unlocked = stage === 'unlocked' || stage === 'crossed'

  // the player controller suspends on the rigged GLB; nothing it owns exists yet
  useEffect(() => {
    setFocus(null)
  }, [setFocus])

  const bootCamera = useMemo<[number, number, number]>(() => {
    const { at, facing } = useGame.getState().respawn
    return [at[0] + Math.sin(facing) * 2.9, 1.75, at[1] + Math.cos(facing) * 2.9]
  }, [])

  return (
    <Canvas
      shadows={quality !== 'low'}
      dpr={quality === 'high' ? [1, 1.75] : quality === 'medium' ? [1, 1.25] : 0.8}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      // seated where the boom will be, so the first frames are already the
      // gameplay view even while the heroine is still loading
      camera={{ fov: 52, near: 0.1, far: 500, position: bootCamera }}
    >
      <Rig quality={quality} />
      <LightBudget quality={quality} />
      <Sky />
      <Lights quality={quality} />
      <Suspense fallback={null}>
        <Apartment stage={stage} unread={stage === 'arrived'} reducedMotion={reducedMotion} />
      </Suspense>
      <HomeBalcony gateOpen={unlocked} />
      <City quality={quality} />
      <KingsleyRow unlocked={unlocked} crossed={stage === 'crossed'} />
      <Skybridge deployedAt={deployedAt} />
      <Suspense fallback={null}>
        <Player active={!paused} onFocus={setFocus} />
      </Suspense>
      <Grade quality={quality} />
      <FpsProbe />
    </Canvas>
  )
}

/** Bloom + vignette. The glow is what sells neon against warm practicals. */
function Grade({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  if (quality === 'low') return null
  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      <Bloom intensity={0.75} luminanceThreshold={0.62} luminanceSmoothing={0.28} mipmapBlur radius={0.72} />
      <Vignette offset={0.22} darkness={0.72} eskil={false} />
      {quality === 'high' ? <SMAA /> : <></>}
    </EffectComposer>
  )
}

function FpsProbe() {
  const setFps = useUi((s) => s.setFps)
  const setRenderInfo = useUi((s) => s.setRenderInfo)
  const { gl, size, scene, camera } = useThree()
  const acc = useRef({ t: 0, n: 0 })

  // dev-only handle so a profiling script can isolate the cost of each group
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __scene?: unknown; __three?: unknown }).__scene = { gl, scene, camera }
    ;(window as unknown as { __three?: unknown }).__three = THREE
  }, [gl, scene, camera])

  // the composer renders in several passes and three resets its counters on
  // every one of them, so reading after the frame only saw the final copy pass
  // (1 call, 0 triangles). Reset once before the frame, read once after it.
  useEffect(() => {
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
    }
  }, [gl])

  // sampled with the frame rate, not in an effect: the drawing buffer changes
  // when the quality tier changes the pixel ratio, and that leaves CSS size
  // untouched, so an effect keyed on size reported a stale resolution.
  // Priority must stay negative — a positive one takes rendering away from R3F,
  // and on the low tier there is no composer to render in its place.
  useFrame((_, d) => {
    acc.current.t += d
    acc.current.n += 1
    if (acc.current.t >= 0.5) {
      setFps(Math.round(acc.current.n / acc.current.t))
      const ctx = gl.getContext()
      setRenderInfo({
        width: ctx.drawingBufferWidth,
        height: ctx.drawingBufferHeight,
        cssWidth: size.width,
        cssHeight: size.height,
        samples: ctx.getParameter(ctx.SAMPLES) as number,
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      })
      acc.current.t = 0
      acc.current.n = 0
    }
    // counters carry the frame that was just presented; clear them for the next
    gl.info.reset()
  }, -1000)
  return null
}

/** Full-body turntable used by the look selector. */
export function LookPreview({ lookId }: { lookId: LookId }) {
  const look = useMemo(() => getLook(lookId), [lookId])
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
      camera={{ fov: 30, position: [0.1, 1.05, 2.25] }}
      style={{ width: '100%', height: '100%' }}
    >
      <PreviewCamera />
      <color attach="background" args={['#0b0a14']} />
      {/* backdrop with a soft plum falloff so the silhouette reads */}
      <mesh position={[0, 1.2, -2.2]}>
        <planeGeometry args={[9, 6]} />
        <meshStandardMaterial color="#1b1430" roughness={1} />
      </mesh>
      <pointLight color="#6a3cff" intensity={26} distance={7} decay={2} position={[0, 1.4, -1.5]} />
      <ambientLight color="#4a4460" intensity={0.45} />
      {/* key, warm and high */}
      <spotLight
        color="#ffd2a0"
        intensity={70}
        distance={12}
        angle={0.7}
        penumbra={0.9}
        decay={2}
        position={[2.1, 3.2, 2.6]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0012}
      />
      {/* teal rim from behind-left, magenta kicker from behind-right */}
      <pointLight color="#4fd0c0" intensity={22} distance={8} decay={2} position={[-2.2, 1.9, -1.6]} />
      <pointLight color="#ff5fae" intensity={18} distance={8} decay={2} position={[2.4, 1.1, -1.9]} />
      <Turntable look={look} />
      {/* pedestal */}
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.72, 0.8, 0.08, 56]} />
        <meshStandardMaterial color="#171426" roughness={0.28} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.66, 0.72, 56]} />
        <meshBasicMaterial color="#ff8ac0" toneMapped={false} />
      </mesh>
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <Bloom intensity={0.6} luminanceThreshold={0.7} luminanceSmoothing={0.3} mipmapBlur radius={0.65} />
        <Vignette offset={0.3} darkness={0.75} eskil={false} />
      </EffectComposer>
    </Canvas>
  )
}

/** R3F points the default camera at the origin, which frames her feet. */
function PreviewCamera() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0.1, 1.05, 2.25)
    camera.lookAt(0, 0.92, 0)
  }, [camera])
  return null
}

function Turntable({ look }: { look: ReturnType<typeof getLook> }) {
  const g = useRef<THREE.Group>(null)
  const motion = useRef<MotionState>({ gait: 0, turning: 0, still: 99 })
  // she sways around front-on rather than spinning away from camera
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = Math.PI + Math.sin(clock.elapsedTime * 0.35) * 0.6
  })
  return (
    <group ref={g} position={[0, 0, 0]}>
      <HeroBody look={look} motion={motion} />
    </group>
  )
}
