import * as THREE from 'three'

/**
 * Painted plates generated for this project (see docs/assets.md). They are
 * loaded once and shared; repeats are set per-material by the caller on a clone.
 */
const loader = new THREE.TextureLoader()
const cache = new Map<string, THREE.Texture>()
/** Clones handed out before the source decoded; they upload once it arrives. */
const clones = new Map<string, THREE.Texture[]>()

function load(file: string, srgb: boolean): THREE.Texture {
  const key = `${file}:${srgb}`
  const hit = cache.get(key)
  if (hit) return hit
  const t = loader.load(`${import.meta.env.BASE_URL}tex/${file}`, (loaded) => {
    for (const c of clones.get(key) ?? []) {
      c.image = loaded.image
      c.needsUpdate = true
    }
    clones.delete(key)
  })
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  cache.set(key, t)
  return t
}

export function facadePlate(variant: 'a' | 'b', repeatX: number, repeatY: number): THREE.Texture {
  const file = `facade-${variant}.jpg`
  const src = load(file, true)
  const t = src.clone()
  if (src.image) t.needsUpdate = true
  else {
    const key = `${file}:true`
    clones.set(key, [...(clones.get(key) ?? []), t])
  }
  t.repeat.set(repeatX, repeatY)
  return t
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

export function rugPlate(): THREE.Texture {
  const t = load('rug.jpg', true)
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  return t
}
