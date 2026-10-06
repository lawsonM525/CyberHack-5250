import * as THREE from 'three'

/**
 * Painted plates generated for this project (see docs/assets.md). They are
 * loaded once and shared; repeats are set per-material by the caller on a clone.
 */
const loader = new THREE.TextureLoader()
const cache = new Map<string, THREE.Texture>()

/**
 * One warm pixel standing in until the jpeg decodes. Without it every material
 * bound to a pending plate warns once per draw call, per frame, per pass.
 */
function placeholder(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 1
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#6b5a49'
    ctx.fillRect(0, 0, 1, 1)
  }
  return c
}

function load(file: string, srgb: boolean, repeatX = 1, repeatY = 1): THREE.Texture {
  const key = `${file}:${srgb}:${repeatX}:${repeatY}`
  const hit = cache.get(key)
  if (hit) return hit
  const t = new THREE.Texture(placeholder() as unknown as HTMLImageElement)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeatX, repeatY)
  t.anisotropy = 8
  t.needsUpdate = true
  loader.load(`${import.meta.env.BASE_URL}tex/${file}`, (loaded) => {
    // drop the one-pixel allocation first: swapping the image in place makes
    // three re-upload into storage sized for the placeholder
    t.dispose()
    t.image = loaded.image
    t.needsUpdate = true
  })
  cache.set(key, t)
  return t
}

export function facadePlate(variant: 'a' | 'b', repeatX: number, repeatY: number): THREE.Texture {
  return load(`facade-${variant}.jpg`, true, repeatX, repeatY)
}

export function skylinePlate(): THREE.Texture {
  const t = load('skyline.jpg', true)
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

export function posterPlate(): THREE.Texture {
  const t = load('poster-garden.jpg', true)
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

export function sleevePlate(): THREE.Texture {
  const t = load('record-sleeve.jpg', true)
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

export function artPlate(
  name: 'botanical' | 'portrait' | 'city' | 'muse' | 'silk' | 'velvet' | 'orchid',
): THREE.Texture {
  const t = load(`art-${name}.jpg`, true)
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

/**
 * Soft radial falloff used for baked light pools and lamp shades: warmth that
 * survives the point-light budget without costing another light.
 */
export function glowPlate(): THREE.Texture {
  const hit = cache.get('glow')
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.42)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  cache.set('glow', t)
  return t
}

/** Vertical falloff for a glass shade: hot at the rim, cool at the crown. */
export function shadePlate(): THREE.Texture {
  const hit = cache.get('shade')
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 64
  const ctx = c.getContext('2d')
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 64)
    // canvas top maps to the crown of the shade: dim there, hot at the rim
    g.addColorStop(0, '#b8631f')
    g.addColorStop(0.45, '#ff9a3c')
    g.addColorStop(1, '#ffe7c4')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 4, 64)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  cache.set('shade', t)
  return t
}

export function rugPlate(): THREE.Texture {
  const t = load('rug.jpg', true)
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  return t
}
