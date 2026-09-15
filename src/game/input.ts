export interface InputState {
  forward: number
  strafe: number
  run: boolean
  mouseX: number
  mouseY: number
  recenter: boolean
}

const KEY_MAP: Record<string, keyof typeof axes> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

const axes = { up: false, down: false, left: false, right: false }
let running = false
let pendingX = 0
let pendingY = 0
let recenterRequested = false
let enabled = true
let pointerLocked = false

function onKeyDown(e: KeyboardEvent) {
  if (!enabled) return
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
  const axis = KEY_MAP[e.code]
  if (axis) {
    axes[axis] = true
    e.preventDefault()
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') running = true
  if (e.code === 'KeyR' && !e.repeat) recenterRequested = true
}

function onKeyUp(e: KeyboardEvent) {
  const axis = KEY_MAP[e.code]
  if (axis) axes[axis] = false
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') running = false
}

function onMouseMove(e: MouseEvent) {
  if (!enabled) return
  if (pointerLocked) {
    pendingX += e.movementX
    pendingY += e.movementY
  } else if (e.buttons & 1) {
    pendingX += e.movementX
    pendingY += e.movementY
  }
}

function onPointerLockChange() {
  pointerLocked = document.pointerLockElement !== null
}

function onBlur() {
  axes.up = axes.down = axes.left = axes.right = false
  running = false
}

let installed = false

export function installInput(): () => void {
  if (installed) return () => undefined
  installed = true
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('blur', onBlur)
  document.addEventListener('pointerlockchange', onPointerLockChange)
  return () => {
    installed = false
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('blur', onBlur)
    document.removeEventListener('pointerlockchange', onPointerLockChange)
  }
}

/** Disabled while an overlay owns the keyboard, so typing never drives the character. */
export function setInputEnabled(value: boolean): void {
  enabled = value
  if (!value) onBlur()
}

export function isPointerLocked(): boolean {
  return pointerLocked
}

export function readInput(): InputState {
  const state: InputState = {
    forward: (axes.up ? 1 : 0) - (axes.down ? 1 : 0),
    strafe: (axes.right ? 1 : 0) - (axes.left ? 1 : 0),
    run: running,
    mouseX: pendingX,
    mouseY: pendingY,
    recenter: recenterRequested,
  }
  pendingX = 0
  pendingY = 0
  recenterRequested = false
  return state
}
