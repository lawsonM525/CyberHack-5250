import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { Character, type MotionState } from './Character'
import { rigFor, type LookPreset, type RigProfile } from '../content/presets'

const ANIMS = ['idle', 'walk', 'run'] as const
type AnimName = (typeof ANIMS)[number]

/**
 * Sitting is posed, not animated: the retargeted clip set is idle/walk/run only.
 * The deltas are written in the character's own frame — a swing around the rig's
 * own forward-facing axis moves a limb forward and Y spreads it sideways — and
 * converted into each bone's parent space at runtime, because the retargeted
 * rigs' local bone axes do not agree with each other.
 */
function sitPose(rig: RigProfile): { bone: string; swing: number; spread: number }[] {
  const b = rig.bones
  const s = rig.sit
  return [
    { bone: b.thighL, swing: s.thigh, spread: s.spread },
    { bone: b.thighR, swing: s.thigh, spread: -s.spread },
    { bone: b.calfL, swing: s.calf, spread: 0 },
    { bone: b.calfR, swing: s.calf, spread: 0 },
    { bone: b.waist, swing: s.waist, spread: 0 },
    { bone: b.spine, swing: s.spine, spread: 0 },
    { bone: b.upperarmL, swing: s.upperarm, spread: s.armSpread },
    { bone: b.upperarmR, swing: s.upperarm, spread: -s.armSpread },
    { bone: b.forearmL, swing: s.forearm, spread: 0 },
    { bone: b.forearmR, swing: s.forearm, spread: 0 },
  ]
}

const animUrl = (clips: string, name: AnimName | 'sit') =>
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
  const rig = rigFor(look)
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
  const sitWeight = useRef(0)

  const seated = useMemo(
    () =>
      sitPose(rig).flatMap((spec) => {
        const bone = object.getObjectByName(spec.bone)
        if (!bone || !bone.parent) return []
        return [
          {
            bone,
            parent: bone.parent,
            rest: bone.quaternion.clone(),
            base: bone.quaternion.clone(),
            spec,
          },
        ]
      }),
    [object, rig],
  )
  const hips = useMemo(
    () => ({
      left: object.getObjectByName(rig.bones.thighL) ?? null,
      right: object.getObjectByName(rig.bones.thighR) ?? null,
    }),
    [object, rig],
  )
  const pose = useRef({
    euler: new THREE.Euler(0, 0, 0, 'YZX'),
    lateral: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    left: new THREE.Vector3(),
    right: new THREE.Vector3(),
    spreadRot: new THREE.Quaternion(),
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
    const sit = THREE.MathUtils.clamp(motion.current?.sit ?? 0, 0, 1)
    // a retargeted seated clip owns the whole body while she is at the desk, so
    // the gait clips fade out underneath it rather than fighting over the hips
    const gaitGain = rig.sitClip ? 1 - sit : 1
    const k = Math.min(1, delta * 9)
    for (const name of ANIMS) {
      weights.current[name] += (target[name] - weights.current[name]) * k
      actions[name]?.setEffectiveWeight(weights.current[name] * gaitGain)
    }
    sitWeight.current = sit
    // running reads better slightly quicker than the retargeted clip's own tempo
    if (actions.run) actions.run.timeScale = 1.15
    mixer.update(reducedMotion ? delta * 0.6 : delta)

    if (rig.sitClip) return
    if (sit <= 0.002) {
      // she is standing, so the clip owns these joints: keep a snapshot of the
      // standing pose to swing the desk pose out of, instead of compounding
      for (const s of seated) s.base.copy(s.bone.quaternion)
      if (rig.sit.anatomical && hips.left && hips.right) {
        // the flexion axis is the line through both hips, measured rather than
        // assumed: this rig's bind orientation does not match the world axes
        const p = pose.current
        hips.left.getWorldPosition(p.left)
        hips.right.getWorldPosition(p.right)
        if (p.left.distanceToSquared(p.right) > 1e-6) p.lateral.copy(p.left).sub(p.right).normalize()
      }
    } else {
      const p = pose.current
      object.getWorldQuaternion(p.frame)
      p.frameInv.copy(p.frame).invert()
      for (const { bone, parent, rest, base, spec } of seated) {
        const { swing, spread } = spec
        // start from a fixed pose every frame rather than compounding the last
        // delta: the bind pose where it is upright, the captured standing pose
        // on rigs whose retargeted bind has the legs folded away
        bone.quaternion.copy(rig.sit.anatomical ? base : rest)
        if (rig.sit.anatomical) {
          p.rot.setFromAxisAngle(p.lateral, swing * sit)
          p.spreadRot.setFromAxisAngle(p.up, spread * sit)
          p.rot.multiply(p.spreadRot)
        } else {
          if (rig.swingAxis === 'z') p.euler.set(0, spread * sit, swing * sit)
          else p.euler.set(swing * sit, spread * sit, 0)
          p.rot.setFromEuler(p.euler)
          // character frame -> world, then world -> the bone's parent space
          p.rot.premultiply(p.frame).multiply(p.frameInv)
        }
        parent.getWorldQuaternion(p.parent)
        p.parentInv.copy(p.parent).invert()
        bone.quaternion.premultiply(p.parent).premultiply(p.rot).premultiply(p.parentInv)
      }
    }
  })

  return (
    <>
      {rig.sitClip && (
        <Suspense fallback={null}>
          <SitClip mixer={mixer} url={animUrl(look.clips, 'sit')} weight={sitWeight} />
        </Suspense>
      )}
      <primitive object={object} position-y={-rig.footLift} rotation-y={rig.faceYaw} />
    </>
  )
}

/** Seated idle clip, faded in over the gait clips while she is at the desk. */
function SitClip({
  mixer,
  url,
  weight,
}: {
  mixer: THREE.AnimationMixer
  url: string
  weight: React.RefObject<number>
}) {
  const { animations } = useGLTF(url)
  const action = useMemo(() => {
    if (!animations.length) return null
    const a = mixer.clipAction(animations[0])
    a.setLoop(THREE.LoopRepeat, Infinity)
    return a
  }, [mixer, animations])

  useEffect(() => {
    if (!action) return
    action.reset()
    action.enabled = true
    action.setEffectiveWeight(0)
    action.play()
    return () => {
      action.stop()
    }
  }, [action])

  useFrame(() => {
    if (!action) return
    const w = weight.current ?? 0
    if (w > 0 && !action.isRunning()) {
      action.enabled = true
      action.play()
    }
    action.setEffectiveWeight(w)
  })

  return null
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
  if (rigFor(look).sitClip) useGLTF.preload(animUrl(look.clips, 'sit'))
}
