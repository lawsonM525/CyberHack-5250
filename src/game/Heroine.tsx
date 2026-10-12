import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { Character, type MotionState } from './Character'
import { rigFor, type LookPreset, type RigProfile } from '../content/presets'

const ANIMS = ['idle', 'walk'] as const
type AnimName = (typeof ANIMS)[number]

/**
 * Sitting is posed, not animated: the retargeted clip set is idle/walk only.
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

/**
 * Joint limits for the wrists, degrees. The retargeted clips roll some
 * forearms and wrists far past anatomy (one of Jade's hands arrives 140° off
 * its bind, Orchid's left forearm rolls ~150°), which candy-wraps the sleeve
 * and flips the palm; the clip's swing/twist is decomposed about the bone's
 * own axis each frame and clamped back into range.
 */
const WRIST_LIMITS = {
  forearm: { twist: 45, swing: 180 },
  hand: { twist: 25, swing: 30 },
}

interface JointLimit {
  bone: THREE.Object3D
  rest: THREE.Quaternion
  /** Bone axis in its parent's space, towards the child joint. */
  axis: THREE.Vector3
  twist: number
  swing: number
}

function wristLimits(object: THREE.Object3D, rig: RigProfile): JointLimit[] {
  const b = rig.bones
  const out: JointLimit[] = []
  const add = (name: string, childName: string | null, lim: { twist: number; swing: number }) => {
    const bone = object.getObjectByName(name)
    if (!bone) return
    const child = childName ? object.getObjectByName(childName) : null
    const axis = child ? child.position.clone().applyQuaternion(bone.quaternion) : bone.position.clone()
    if (axis.lengthSq() < 1e-8) return
    out.push({
      bone,
      rest: bone.quaternion.clone(),
      axis: axis.normalize(),
      twist: THREE.MathUtils.degToRad(lim.twist),
      swing: THREE.MathUtils.degToRad(lim.swing),
    })
  }
  add(b.forearmL, b.handL, WRIST_LIMITS.forearm)
  add(b.forearmR, b.handR, WRIST_LIMITS.forearm)
  add(b.handL, null, WRIST_LIMITS.hand)
  add(b.handR, null, WRIST_LIMITS.hand)
  return out
}

/**
 * Plays a clip in place: the net root travel over the loop is subtracted from
 * every position track so the controller alone moves her. The generated walk
 * and run loops for the AccuRig heroine carry real root motion (the hip
 * travels 1.5 / 2.9 rig units per loop), which otherwise blends in as a lurch
 * ahead when the gait fades up and a snap back on every loop wrap.
 */
function stripRootTravel(clip: THREE.AnimationClip): THREE.AnimationClip {
  const out = clip.clone()
  for (const track of out.tracks) {
    if (!(track instanceof THREE.VectorKeyframeTrack) || !track.name.endsWith('.position')) continue
    const { times, values } = track
    const n = times.length
    if (n < 2) continue
    const span = times[n - 1] - times[0]
    if (span <= 0) continue
    const last = (n - 1) * 3
    const drift = [values[last] - values[0], values[last + 1] - values[1], values[last + 2] - values[2]]
    if (Math.hypot(drift[0], drift[1], drift[2]) < 1e-4) continue
    for (let i = 0; i < n; i++) {
      const f = (times[i] - times[0]) / span
      for (let k = 0; k < 3; k++) values[i * 3 + k] -= drift[k] * f
    }
  }
  return out
}

/**
 * How far the idle stance is pulled toward straight, planted legs (0 leaves the
 * clip alone). The generated idles crouch: knees at ~135° with the feet 0.75 m
 * apart on the biped rigs, one knee folded to ~140° on the AccuRig one.
 */
const IDLE_LEG_RELAX = 0.85
/** Outward lean of each straightened thigh, so she stands hip-width rather than knock-kneed. */
const STANCE_TILT = Math.tan(THREE.MathUtils.degToRad(5))
/** Outward turn of each planted foot. */
const TOE_OUT = Math.tan(THREE.MathUtils.degToRad(8))

interface LegChain {
  thigh: THREE.Object3D
  calf: THREE.Object3D
  foot: THREE.Object3D
  toe: THREE.Object3D
  /** +1 left, -1 right, along the hip line. */
  side: 1 | -1
}

function legChains(object: THREE.Object3D, rig: RigProfile): LegChain[] {
  const b = rig.bones
  const out: LegChain[] = []
  const add = (thigh: string, calf: string, foot: string, toe: string, side: 1 | -1) => {
    const t = object.getObjectByName(thigh)
    const c = object.getObjectByName(calf)
    const f = object.getObjectByName(foot)
    const o = object.getObjectByName(toe)
    if (t && c && f && o) out.push({ thigh: t, calf: c, foot: f, toe: o, side })
  }
  add(b.thighL, b.calfL, b.footL, b.toeL, 1)
  add(b.thighR, b.calfR, b.footR, b.toeR, -1)
  return out
}

interface LegTmp {
  a: THREE.Vector3
  b: THREE.Vector3
  cur: THREE.Vector3
  target: THREE.Vector3
  lateral: THREE.Vector3
  forward: THREE.Vector3
  rot: THREE.Quaternion
  parent: THREE.Quaternion
  parentInv: THREE.Quaternion
}

const DOWN = new THREE.Vector3(0, -1, 0)
const IDENTITY = new THREE.Quaternion()

/** Rotates `bone` in world space so the direction towards `child` moves a fraction `k` of the way to `target`. */
function aimBone(bone: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3, k: number, tmp: LegTmp) {
  if (!bone.parent) return
  bone.updateWorldMatrix(true, true)
  bone.getWorldPosition(tmp.a)
  child.getWorldPosition(tmp.b)
  tmp.cur.subVectors(tmp.b, tmp.a)
  if (tmp.cur.lengthSq() < 1e-10) return
  tmp.cur.normalize()
  tmp.rot.setFromUnitVectors(tmp.cur, target).slerp(IDENTITY, 1 - k)
  bone.parent.getWorldQuaternion(tmp.parent)
  tmp.parentInv.copy(tmp.parent).invert()
  bone.quaternion.premultiply(tmp.parent).premultiply(tmp.rot).premultiply(tmp.parentInv)
}

/**
 * Blends the legs towards a relaxed stand: thighs and shins hanging straight
 * down (a few degrees out), feet flat and pointing the way she faces. Works
 * in world directions, so it does not depend on either rig's bind pose.
 */
function straightenLegs(legs: LegChain[], k: number, object: THREE.Object3D, tmp: LegTmp) {
  if (legs.length < 2 || !object.parent) return
  object.updateWorldMatrix(true, true)
  legs[0].thigh.getWorldPosition(tmp.a)
  legs[1].thigh.getWorldPosition(tmp.b)
  tmp.lateral.subVectors(tmp.a, tmp.b)
  tmp.lateral.y = 0
  if (tmp.lateral.lengthSq() < 1e-8) return
  tmp.lateral.normalize()
  object.parent.getWorldDirection(tmp.forward)
  tmp.forward.y = 0
  if (tmp.forward.lengthSq() < 1e-8) return
  tmp.forward.normalize()
  for (const leg of legs) {
    tmp.target.copy(DOWN).addScaledVector(tmp.lateral, leg.side * STANCE_TILT).normalize()
    aimBone(leg.thigh, leg.calf, tmp.target, k, tmp)
    aimBone(leg.calf, leg.foot, DOWN, k, tmp)
    tmp.target.copy(tmp.forward).addScaledVector(tmp.lateral, leg.side * TOE_OUT).normalize()
    aimBone(leg.foot, leg.toe, tmp.target, k, tmp)
  }
}

/** Lowest ankle joint in the presentation group's frame, so the root can set that foot on the floor. */
function lowestFoot(legs: LegChain[], object: THREE.Object3D, tmp: LegTmp): number {
  if (!object.parent) return Infinity
  object.updateWorldMatrix(true, true)
  let y = Infinity
  for (const leg of legs) {
    leg.foot.getWorldPosition(tmp.a)
    object.parent.worldToLocal(tmp.a)
    y = Math.min(y, tmp.a.y)
  }
  return y
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
 * Generated heroine: a rigged GLB driven by retargeted idle/walk clips, cross-faded
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
      clips.length ? mixer.clipAction(stripRootTravel(clips[0])) : null
    const map: Record<AnimName, THREE.AnimationAction | null> = {
      idle: pick(idle.animations),
      walk: pick(walk.animations),
    }
    for (const a of Object.values(map)) {
      if (!a) continue
      a.setLoop(THREE.LoopRepeat, Infinity)
      a.setEffectiveWeight(0)
    }
    map.idle?.setEffectiveWeight(1)
    return map
  }, [mixer, idle.animations, walk.animations])

  useEffect(() => {
    for (const a of Object.values(actions)) {
      if (!a) continue
      a.enabled = true
      a.play()
    }
    return () => {
      mixer.stopAllAction()
    }
  }, [mixer, actions])

  const weights = useRef({ idle: 1, walk: 0 })
  const sitWeight = useRef(0)
  const wrists = useMemo(() => wristLimits(object, rig), [object, rig])
  const legs = useMemo(() => legChains(object, rig), [object, rig])
  const legTmp = useRef<LegTmp>({
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    cur: new THREE.Vector3(),
    target: new THREE.Vector3(),
    lateral: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    rot: new THREE.Quaternion(),
    parent: new THREE.Quaternion(),
    parentInv: new THREE.Quaternion(),
  })
  const limit = useRef({
    delta: new THREE.Quaternion(),
    twist: new THREE.Quaternion(),
    swing: new THREE.Quaternion(),
    inv: new THREE.Quaternion(),
    swingAxis: new THREE.Vector3(),
  })

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
    const gait = Number.isFinite(raw) ? THREE.MathUtils.clamp(raw as number, 0, 1) : 0
    const target = { idle: 1 - gait, walk: gait }
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
    // the clips are in-place loops, so their feet only plant if they play at
    // the ground speed the controller is actually moving her at
    const speed = motion.current?.speed ?? 0
    if (actions.walk) actions.walk.timeScale = THREE.MathUtils.clamp(speed / rig.clipSpeed.walk, 0.8, 1.2)
    mixer.update(reducedMotion ? delta * 0.6 : delta)
    clampWrists(wrists, limit.current)

    // standing still she gets straight, planted legs; the walk clip and the
    // desk pose take the legs back as they fade in
    const standing = weights.current.idle * (1 - sit)
    const relax = IDLE_LEG_RELAX * standing
    if (relax > 0.001) straightenLegs(legs, relax, object, legTmp.current)
    const lowest = lowestFoot(legs, object, legTmp.current)
    const planted = Number.isFinite(lowest) ? object.position.y + rig.soleHeight - lowest : -rig.footLift
    const wantY = THREE.MathUtils.lerp(-rig.footLift, planted, standing)
    object.position.y += (wantY - object.position.y) * Math.min(1, delta * 10)

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

/** Swing-twist decomposition of each wrist joint about its own axis, clamped to WRIST_LIMITS. */
function clampWrists(
  joints: JointLimit[],
  tmp: {
    delta: THREE.Quaternion
    twist: THREE.Quaternion
    swing: THREE.Quaternion
    inv: THREE.Quaternion
    swingAxis: THREE.Vector3
  },
) {
  for (const { bone, rest, axis, twist, swing } of joints) {
    const q = bone.quaternion
    tmp.inv.copy(rest).invert()
    tmp.delta.copy(q).multiply(tmp.inv)
    const proj = axis.x * tmp.delta.x + axis.y * tmp.delta.y + axis.z * tmp.delta.z
    let twistAngle = 2 * Math.atan2(proj, tmp.delta.w)
    if (twistAngle > Math.PI) twistAngle -= 2 * Math.PI
    else if (twistAngle < -Math.PI) twistAngle += 2 * Math.PI
    tmp.twist.setFromAxisAngle(axis, twistAngle)
    tmp.inv.copy(tmp.twist).invert()
    tmp.swing.copy(tmp.delta).multiply(tmp.inv).normalize()
    if (tmp.swing.w < 0) tmp.swing.set(-tmp.swing.x, -tmp.swing.y, -tmp.swing.z, -tmp.swing.w)
    const swingAngle = 2 * Math.acos(Math.min(1, tmp.swing.w))
    const twistOver = Math.abs(twistAngle) > twist
    const swingOver = swingAngle > swing
    if (!twistOver && !swingOver) continue
    if (twistOver) tmp.twist.setFromAxisAngle(axis, THREE.MathUtils.clamp(twistAngle, -twist, twist))
    if (swingOver) {
      tmp.swingAxis.set(tmp.swing.x, tmp.swing.y, tmp.swing.z)
      if (tmp.swingAxis.lengthSq() > 1e-10) tmp.swing.setFromAxisAngle(tmp.swingAxis.normalize(), swing)
    }
    q.copy(tmp.swing).multiply(tmp.twist).multiply(rest)
  }
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
      <Suspense fallback={null}>
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
