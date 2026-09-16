import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { MotionState } from './Character'
import { HeroBody } from './Heroine'
import { getLook } from '../content/presets'
import { INTERACTABLES, cameraBlocked, resolveMove } from './world'
import { useGame } from '../state/store'
import { audio } from '../audio/audio'
import { drainMouse, isPointerLocked, readInput } from './input'

const WALK = 2.05
const RUN = 4.1
const ACCEL = 14
const HEAD = 1.12
/** Close enough that she, not the rug, is the subject of the frame. */
const DIST = 2.5
const MIN_DIST = 1.2
/** Where the boom swings for the arrival reveal: back across the span, over the city. */
const REVEAL_YAW = Math.PI * 0.92
const REVEAL_PITCH = 0.2
/** Shorter than this and the boom would be inside whatever is behind her. */
const MIN_LENS = 0.85
const UP = new THREE.Vector3(0, 1, 0)
const TMP_SIZE = new THREE.Vector3()

function isDescendant(node: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  let p: THREE.Object3D | null = node
  while (p) {
    if (p === ancestor) return true
    p = p.parent
  }
  return false
}

export function Player({
  active,
  onFocus,
}: {
  active: boolean
  onFocus: (id: string | null) => void
}) {
  const lookId = useGame((s) => s.look)
  const stage = useGame((s) => s.stage)
  const respawn = useGame((s) => s.respawn)
  const settings = useGame((s) => s.settings)
  const look = useMemo(() => getLook(lookId), [lookId])
  const bridgeOpen = stage === 'unlocked' || stage === 'crossed'

  const root = useRef<THREE.Group>(null)
  const motion = useRef<MotionState>({ gait: 0, turning: 0, still: 0 })
  const pos = useRef(new THREE.Vector2(respawn.at[0], respawn.at[1]))
  const vel = useRef(new THREE.Vector2())
  const bodyYaw = useRef(respawn.facing)
  const camYaw = useRef(respawn.facing)
  const camPitch = useRef(0.05)
  const camPos = useRef(new THREE.Vector3())
  const stepDist = useRef(0)
  const focusRef = useRef<string | null>(null)
  const saveTimer = useRef(0)
  const camInit = useRef(false)
  const reveal = useRef(0)
  const lastStage = useRef(stage)
  const occluders = useRef<THREE.Mesh[]>([])
  const occluderAge = useRef(0)
  const raycaster = useRef(new THREE.Raycaster())
  const { camera, scene } = useThree()

  useEffect(() => {
    if (stage === 'crossed' && lastStage.current !== 'crossed') reveal.current = 5
    lastStage.current = stage
  }, [stage])

  useEffect(() => {
    pos.current.set(respawn.at[0], respawn.at[1])
    vel.current.set(0, 0)
    bodyYaw.current = respawn.facing
    camYaw.current = respawn.facing
    camPitch.current = 0.05
    camInit.current = false
    drainMouse()
    // a prompt from wherever she was standing before must not survive the teleport
    focusRef.current = null
    onFocus(null)
  }, [respawn, onFocus])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const input = readInput()

    if (reveal.current > 0) {
      reveal.current = Math.max(0, reveal.current - delta)
      const k = Math.min(1, delta * 1.6)
      let diff = REVEAL_YAW - camYaw.current
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      camYaw.current += diff * k
      camPitch.current += (REVEAL_PITCH - camPitch.current) * k
    }

    if (active) {
      if (input.mouseX || input.mouseY) reveal.current = 0
      const sens = 0.0022 * settings.sensitivity
      camYaw.current -= input.mouseX * sens
      camPitch.current += (settings.invertY ? -1 : 1) * input.mouseY * sens * 0.8
      camPitch.current = THREE.MathUtils.clamp(camPitch.current, -0.42, 0.72)
      if (input.recenter) camYaw.current = bodyYaw.current
    }

    // camera-relative desired velocity
    const f = active ? input.forward : 0
    const s = active ? input.strafe : 0
    const mag = Math.min(1, Math.hypot(f, s))
    const speed = (input.run && active ? RUN : WALK) * mag
    let dx = 0
    let dz = 0
    if (mag > 0.01) {
      const sinY = Math.sin(camYaw.current)
      const cosY = Math.cos(camYaw.current)
      // forward is -Z rotated by camera yaw
      const fx = -sinY
      const fz = -cosY
      const rx = cosY
      const rz = -sinY
      const nx = (fx * f + rx * s) / Math.hypot(f, s)
      const nz = (fz * f + rz * s) / Math.hypot(f, s)
      dx = nx * speed
      dz = nz * speed
    }
    vel.current.x += (dx - vel.current.x) * Math.min(1, ACCEL * delta)
    vel.current.y += (dz - vel.current.y) * Math.min(1, ACCEL * delta)
    if (vel.current.lengthSq() < 0.0004) vel.current.set(0, 0)

    const [nxp, nzp] = resolveMove(
      pos.current.x,
      pos.current.y,
      pos.current.x + vel.current.x * delta,
      pos.current.y + vel.current.y * delta,
      bridgeOpen,
    )
    const moved = Math.hypot(nxp - pos.current.x, nzp - pos.current.y)
    pos.current.set(nxp, nzp)

    const actualSpeed = delta > 0 ? moved / delta : 0
    if (actualSpeed > 0.15) {
      const targetYaw = Math.atan2(vel.current.x, vel.current.y) + Math.PI
      let diff = targetYaw - bodyYaw.current
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      bodyYaw.current += diff * Math.min(1, delta * 11)
      motion.current.turning = diff
      motion.current.still = 0
    } else {
      motion.current.turning = 0
      motion.current.still += delta
    }
    const gait = THREE.MathUtils.clamp(actualSpeed / WALK, 0, 2)
    motion.current.gait += (gait - motion.current.gait) * Math.min(1, delta * 12)

    // footsteps
    stepDist.current += moved
    const stride = actualSpeed > WALK * 1.25 ? 0.78 : 0.62
    if (stepDist.current > stride && actualSpeed > 0.4) {
      stepDist.current = 0
      audio.footstep(actualSpeed > WALK * 1.25)
    }

    if (root.current) {
      root.current.position.set(pos.current.x, 0, pos.current.y)
      root.current.rotation.y = bodyYaw.current
    }

    // third person camera with wall-aware distance
    const pivot = new THREE.Vector3(pos.current.x, HEAD, pos.current.y)
    const dirY = Math.sin(camPitch.current)

    /** How far the boom can run down a heading before it reaches solid mass. */
    const clearance = (yaw: number): number => {
      const sx = Math.sin(yaw)
      const sz = Math.cos(yaw)
      let clear = 0
      for (let d = 0.35; d <= DIST + 1e-6; d += 0.15) {
        if (cameraBlocked(pivot.x + sx * d, pivot.z + sz * d)) break
        clear = d
      }
      return clear
    }

    // her heading first; if the wall behind her leaves no room for a shoulder
    // boom, swing to the nearest heading that does rather than sink into it
    let yaw = camYaw.current
    let room = clearance(yaw)
    if (room < 1.0) {
      let bestYaw = yaw
      let bestRoom = room
      for (let i = 1; i <= 12; i++) {
        const off = ((i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * Math.PI) / 6
        const candidate = camYaw.current + off
        const r = clearance(candidate)
        if (r > bestRoom) {
          bestYaw = candidate
          bestRoom = r
          if (r >= MIN_DIST) break
        }
      }
      yaw = bestYaw
      room = bestRoom
    }
    const dirX = Math.sin(yaw) * Math.cos(camPitch.current)
    const dirZ = Math.cos(yaw) * Math.cos(camPitch.current)
    // no heading has any air in it: ride above her and look down instead
    const boxedIn = room <= 0
    const dist = Math.min(DIST, Math.max(0.5, room - 0.14))
    // the shorter the boom gets, the higher it rides and the lower it aims, so a
    // wall behind her crops the frame instead of her
    const pinch = 1 - THREE.MathUtils.clamp((dist - 0.6) / (DIST - 0.6), 0, 1)
    const desired = boxedIn
      ? new THREE.Vector3(pivot.x, pivot.y + 1.2, pivot.z)
      : new THREE.Vector3(
          pivot.x + dirX * dist,
          Math.max(0.35, pivot.y + dirY * dist + 0.35 + pinch * 0.85),
          pivot.z + dirZ * dist,
        )
    if (!camInit.current) {
      camPos.current.copy(desired)
      camInit.current = true
    } else {
      camPos.current.lerp(desired, Math.min(1, delta * 9))
    }

    // the rectangles above only know the floor plan; the built set has recesses,
    // rails and awnings they do not, so the last word belongs to the geometry
    // actually standing between the lens and her head
    occluderAge.current -= delta
    if (occluderAge.current <= 0) {
      occluderAge.current = 0.4
      const near: { mesh: THREE.Mesh; d: number }[] = []
      const box = new THREE.Box3()
      const self = root.current
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh || !mesh.visible) return
        if (self && isDescendant(mesh, self)) return
        const material = mesh.material
        const seeThrough = Array.isArray(material)
          ? material.some((m) => m.transparent)
          : material.transparent
        if (seeThrough) return
        box.setFromObject(mesh)
        if (box.isEmpty()) return
        const d = box.distanceToPoint(pivot)
        if (d > 6) return
        // a decorated room has hundreds of leaves and trinkets within reach;
        // only masses big enough to hide her are worth a ray
        const size = box.getSize(TMP_SIZE)
        if (Math.max(size.x, size.y, size.z) < 0.35) return
        near.push({ mesh, d })
      })
      near.sort((a, b) => a.d - b.d)
      occluders.current = near.slice(0, 120).map((n) => n.mesh)
    }

    const caster = raycaster.current
    /** Highest the lens can ride straight up before an awning or ceiling. */
    const headroom = (): number => {
      caster.near = 0.05
      caster.far = 2.2
      caster.set(pivot, UP)
      const ceiling = caster.intersectObjects(occluders.current, false)
      return Math.max(0.5, Math.min(1.3, (ceiling.length > 0 ? ceiling[0].distance : 2.2) - 0.3))
    }

    const toLens = camPos.current.clone().sub(pivot)
    const lensDist = toLens.length()
    let overhead = boxedIn
    if (boxedIn) {
      camPos.current.y = Math.min(camPos.current.y, pivot.y + headroom())
    } else if (lensDist > 0.01) {
      toLens.divideScalar(lensDist)
      caster.near = 0.05
      caster.far = lensDist
      caster.set(pivot, toLens)
      const hits = caster.intersectObjects(occluders.current, false)
      const clear = hits.length > 0 ? hits[0].distance - 0.16 : lensDist
      if (clear < MIN_LENS) {
        // nothing behind her but wall: ride over her shoulder looking down
        // rather than clamp the boom through it
        camPos.current.set(pivot.x, pivot.y + headroom(), pivot.z)
        overhead = true
      } else if (clear < lensDist) {
        camPos.current.copy(pivot).addScaledVector(toLens, clear)
      }
    }

    camera.position.copy(camPos.current)
    camera.lookAt(pivot.x, overhead ? 0.75 : HEAD + 0.12 - pinch * 0.75, pivot.z)

    if (import.meta.env.DEV) {
      ;(window as unknown as { __cam?: unknown }).__cam = {
        occluders: occluders.current.length,
        boxedIn,
        overhead,
        planRoom: room,
        lensDist,
        pivot: pivot.toArray(),
      }
    }

    // nearest interactable
    let best: string | null = null
    let bestScore = Infinity
    for (const it of INTERACTABLES) {
      const d = Math.hypot(it.at[0] - pos.current.x, it.at[2] - pos.current.y)
      if (d > it.radius) continue
      // prefer what she is facing
      const ang = Math.atan2(it.at[0] - pos.current.x, it.at[2] - pos.current.y) + Math.PI
      let diff = Math.abs(((ang - bodyYaw.current + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
      diff = Math.min(diff, Math.PI)
      const score = d + diff * 0.55
      if (score < bestScore) {
        bestScore = score
        best = it.id
      }
    }
    if (best !== focusRef.current) {
      focusRef.current = best
      onFocus(best)
    }

    saveTimer.current += delta
    if (saveTimer.current > 1.2) {
      saveTimer.current = 0
      useGame.getState().savePosition([pos.current.x, pos.current.y], bodyYaw.current)
    }
  })

  useEffect(() => {
    const id = window.setInterval(() => {
      const st = useGame.getState()
      st.savePosition([pos.current.x, pos.current.y], bodyYaw.current)
    }, 2000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <group ref={root}>
      <HeroBody look={look} motion={motion} reducedMotion={settings.reducedMotion} />
      <pointLight position={[0, 1.4, 0.35]} color="#ffd9b0" intensity={0.35} distance={2.6} decay={2} />
    </group>
  )
}

export function usePointerLockHint(): boolean {
  return isPointerLocked()
}
