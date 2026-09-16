import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { Character, type MotionState } from './Character'
import type { LookPreset } from '../content/presets'

const ANIMS = ['idle', 'walk', 'run'] as const
type AnimName = (typeof ANIMS)[number]

/**
 * Sitting is posed, not animated: the retargeted clip set is idle/walk/run only.
 * The deltas are written in the character's own frame — she faces +X, so +Z
 * swings a limb forward and Y spreads it sideways — and converted into each
 * bone's parent space at runtime, because the retargeted rig's local bone axes
 * do not agree with each other.
 */
const SIT_POSE: { bone: string; swing: number; spread: number }[] = [
  { bone: 'L_Thigh', swing: 1.45, spread: 0.12 },
  { bone: 'R_Thigh', swing: 1.45, spread: -0.12 },
  { bone: 'L_Calf', swing: -1.5, spread: 0 },
  { bone: 'R_Calf', swing: -1.5, spread: 0 },
  { bone: 'L_Foot', swing: 0.0, spread: 0 },
  { bone: 'R_Foot', swing: 0.0, spread: 0 },
  { bone: 'Waist', swing: -0.16, spread: 0 },
  { bone: 'Spine01', swing: -0.08, spread: 0 },
  { bone: 'L_Upperarm', swing: 1.15, spread: 0.14 },
  { bone: 'R_Upperarm', swing: 1.15, spread: -0.14 },
  { bone: 'L_Forearm', swing: 0.7, spread: 0 },
  { bone: 'R_Forearm', swing: 0.7, spread: 0 },
]

if (import.meta.env.DEV) {
  // live handle for tuning the desk pose against the real chair and keyboard
  ;(window as unknown as { __sit?: unknown }).__sit = SIT_POSE
}

const animUrl = (clips: string, name: AnimName) =>
  `${import.meta.env.BASE_URL}models/${clips}-${name}.glb`
const modelUrl = (file: string) => `${import.meta.env.BASE_URL}models/${file}`

/** Per-look recolour of the shared generated body texture. */
function useOutfitMap(file: string | undefined): THREE.Texture | null {
  const [map, setMap] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!file) {
      setMap(null)
      return
    }
    let live = true
    const loader = new THREE.TextureLoader()
    loader.load(modelUrl(file), (t) => {
      if (!live) {
        t.dispose()
        return
      }
      t.colorSpace = THREE.SRGBColorSpace
      t.flipY = false
      setMap(t)
    })
    return () => {
      live = false
    }
  }, [file])
  return map
}

/**
 * Generated heroine: a rigged GLB driven by three retargeted clips, cross-faded
 * by the gait value the player controller writes every frame.
 */
export function Heroine({
  look,
  motion,
  reducedMotion = false,
}: {
  look: LookPreset
  motion: React.RefObject<MotionState>
  reducedMotion?: boolean
}) {
  const { scene } = useGLTF(modelUrl(look.model))
  const outfitMap = useOutfitMap(look.skinTexture)
  const idle = useGLTF(animUrl(look.clips, 'idle'))
  const walk = useGLTF(animUrl(look.clips, 'walk'))
  const run = useGLTF(animUrl(look.clips, 'run'))

  const object = useMemo(() => {
    const o = clone(scene)
    o.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true
      child.receiveShadow = true
      child.frustumCulled = false
      // generated PBR maps bake in a plastic specular sheen; keep skin and cloth matte
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      for (const mat of mats) {
        if (!(mat instanceof THREE.MeshStandardMaterial)) continue
        if (outfitMap) {
          const swapped = mat.clone()
          swapped.map = outfitMap
          child.material = swapped
          swapped.roughness = Math.max(swapped.roughness, 0.82)
          swapped.metalness = Math.min(swapped.metalness, 0.05)
          swapped.envMapIntensity = 0.35
          swapped.needsUpdate = true
          continue
        }
        mat.roughness = Math.max(mat.roughness, 0.82)
        mat.metalness = Math.min(mat.metalness, 0.05)
        mat.envMapIntensity = 0.35
        mat.needsUpdate = true
      }
    })
    return o
  }, [scene, outfitMap])

  const mixer = useMemo(() => new THREE.AnimationMixer(object), [object])
  const actions = useMemo(() => {
    const pick = (clips: THREE.AnimationClip[]) =>
      clips.length ? mixer.clipAction(clips[0]) : null
    const map: Record<AnimName, THREE.AnimationAction | null> = {
      idle: pick(idle.animations),
      walk: pick(walk.animations),
      run: pick(run.animations),
    }
    for (const a of Object.values(map)) {
      if (!a) continue
      a.setLoop(THREE.LoopRepeat, Infinity)
      a.enabled = true
      a.setEffectiveWeight(0)
      a.play()
    }
    map.idle?.setEffectiveWeight(1)
    return map
  }, [mixer, idle.animations, walk.animations, run.animations])

  useEffect(
    () => () => {
      mixer.stopAllAction()
    },
    [mixer],
  )

  const weights = useRef({ idle: 1, walk: 0, run: 0 })

  const seated = useMemo(
    () =>
      SIT_POSE.flatMap((spec) => {
        const bone = object.getObjectByName(spec.bone)
        if (!bone || !bone.parent) return []
        return [{ bone, parent: bone.parent, rest: bone.quaternion.clone(), spec }]
      }),
    [object],
  )
  const pose = useRef({
    euler: new THREE.Euler(0, 0, 0, 'YZX'),
    rot: new THREE.Quaternion(),
    frame: new THREE.Quaternion(),
    frameInv: new THREE.Quaternion(),
    parent: new THREE.Quaternion(),
    parentInv: new THREE.Quaternion(),
  })

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.25)
    const raw = motion.current?.gait
    const gait = Number.isFinite(raw) ? THREE.MathUtils.clamp(raw as number, 0, 2) : 0
    const target = {
      idle: Math.max(0, 1 - gait),
      walk: gait <= 1 ? gait : Math.max(0, 2 - gait),
      run: Math.max(0, gait - 1),
    }
    const k = Math.min(1, delta * 9)
    for (const name of ANIMS) {
      weights.current[name] += (target[name] - weights.current[name]) * k
      actions[name]?.setEffectiveWeight(weights.current[name])
    }
    // running reads better slightly quicker than the retargeted clip's own tempo
    if (actions.run) actions.run.timeScale = 1.15
    mixer.update(reducedMotion ? delta * 0.6 : delta)

    const sit = THREE.MathUtils.clamp(motion.current?.sit ?? 0, 0, 1)
    if (sit > 0.002) {
      const p = pose.current
      object.getWorldQuaternion(p.frame)
      p.frameInv.copy(p.frame).invert()
      for (const { bone, parent, rest, spec } of seated) {
        const { swing, spread } = spec
        // the clips do not key every one of these joints, so start from the
        // bind pose each frame rather than compounding the previous delta
        bone.quaternion.copy(rest)
        p.euler.set(0, spread * sit, swing * sit)
        p.rot.setFromEuler(p.euler)
        // character frame -> world, then world -> the bone's parent space
        p.rot.premultiply(p.frame).multiply(p.frameInv)
        parent.getWorldQuaternion(p.parent)
        p.parentInv.copy(p.parent).invert()
        bone.quaternion.premultiply(p.parent).premultiply(p.rot).premultiply(p.parentInv)
      }
    }
  })

  // the generated rig faces +X; the controller's yaw convention is -Z
  return <primitive object={object} rotation-y={Math.PI / 2} />
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** The generated heroine, falling back to the hand-built one if the GLB fails. */
export function HeroBody(props: {
  look: LookPreset
  motion: React.RefObject<MotionState>
  reducedMotion?: boolean
}) {
  const fallback = <Character {...props} />
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Heroine {...props} />
      </Suspense>
    </ModelBoundary>
  )
}

export function preloadHeroine(look: LookPreset) {
  useGLTF.preload(modelUrl(look.model))
  for (const name of ANIMS) useGLTF.preload(animUrl(look.clips, name))
}
