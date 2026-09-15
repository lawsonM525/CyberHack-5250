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
  const { camera } = useThree()

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
    const dirX = Math.sin(camYaw.current) * Math.cos(camPitch.current)
    const dirZ = Math.cos(camYaw.current) * Math.cos(camPitch.current)
    const dirY = Math.sin(camPitch.current)
    // march out from her head and stop at the first obstruction, so the boom
    // can never end up on the far side of a desk or doorframe
    let dist = MIN_DIST
    const STEPS = 14
    for (let i = 1; i <= STEPS; i++) {
      const d = (DIST * i) / STEPS
      if (cameraBlocked(pivot.x + dirX * d, pivot.z + dirZ * d)) break
      dist = Math.max(MIN_DIST, d - 0.14)
    }
    if (dist <= MIN_DIST && cameraBlocked(pivot.x + dirX * MIN_DIST, pivot.z + dirZ * MIN_DIST)) {
      // pinned against something: hug her shoulder rather than sit in the wall
      dist = 0.6
    }
    // the shorter the boom gets, the higher it rides and the lower it aims, so a
    // wall behind her crops the frame instead of her
    const pinch = 1 - THREE.MathUtils.clamp((dist - 0.6) / (DIST - 0.6), 0, 1)
    // standing in a doorway or against a pier, every direction is blocked and a
    // shoulder boom just buries the lens in plaster: look down over the wall
    const boxedIn = cameraBlocked(pivot.x, pivot.z)
    // swing to the nearest direction with air in it; straight up if there is none,
    // so the lens never ends up inside the mass she is standing in
    let escX = dirX
    let escZ = dirZ
    let escRadius = 0
    if (boxedIn) {
      for (let i = 0; i <= 12; i++) {
        const off = ((i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * Math.PI) / 6
        const y = camYaw.current + off
        const sx = Math.sin(y)
        const sz = Math.cos(y)
        if (!cameraBlocked(pivot.x + sx * 1.05, pivot.z + sz * 1.05)) {
          escX = sx
          escZ = sz
          escRadius = 1.05
          break
        }
      }
    }
    const desired = boxedIn
      ? new THREE.Vector3(
          pivot.x + escX * escRadius,
          pivot.y + (escRadius > 0 ? 1.55 : 2.4),
          pivot.z + escZ * escRadius,
        )
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
    camera.position.copy(camPos.current)
    camera.lookAt(pivot.x, boxedIn ? 0.75 : HEAD + 0.12 - pinch * 0.75, pivot.z)

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
