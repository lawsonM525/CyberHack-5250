import { useMemo, type ReactNode } from 'react'
import type * as THREE from 'three'
import type { ThreeElements } from '@react-three/fiber'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * Furniture reads as a blockout when every slab is a hard-edged box: the eye
 * finds silhouettes before materials. Rounded boxes are shared by dimension so
 * the whole apartment costs a handful of extra geometries, not one per mesh.
 */
const cache = new Map<string, RoundedBoxGeometry>()

export function softBoxGeometry(
  w: number,
  h: number,
  d: number,
  radius?: number,
  segments = 2,
): RoundedBoxGeometry {
  const r = Math.min(radius ?? 0.045, Math.min(w, h, d) * 0.42)
  const key = `${w}|${h}|${d}|${r}|${segments}`
  const hit = cache.get(key)
  if (hit) return hit
  const geo = new RoundedBoxGeometry(w, h, d, segments, r)
  cache.set(key, geo)
  return geo
}

const pillows = new Map<string, RoundedBoxGeometry>()

/**
 * A cushion, not an ellipsoid: the faces swell toward the middle and the
 * corners stay pinched where the seams would be, which is what tells the eye
 * "stuffed fabric" rather than "squashed sphere".
 */
export function pillowGeometry(w: number, h: number, d: number, plump = 0.5): RoundedBoxGeometry {
  const key = `${w}|${h}|${d}|${plump}`
  const hit = pillows.get(key)
  if (hit) return hit
  const geo = new RoundedBoxGeometry(w, h, d, 4, Math.min(w, h, d) * 0.45)
  const p = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const fx = 1 - Math.min(1, Math.abs(x) / (w / 2))
    const fz = 1 - Math.min(1, Math.abs(z) / (d / 2))
    const bulge = plump * fx * fz
    p.setY(i, y * (1 + bulge * 1.25))
    p.setX(i, x * (1 + bulge * 0.08))
    p.setZ(i, z * (1 + bulge * 0.08))
  }
  p.needsUpdate = true
  geo.computeVertexNormals()
  pillows.set(key, geo)
  return geo
}

type SoftProps = Omit<ThreeElements['mesh'], 'args' | 'geometry' | 'children'> & {
  args: [number, number, number]
  radius?: number
  segments?: number
  children?: ReactNode
}

/** A box with its edges taken off. Drop-in for `<mesh><boxGeometry/></mesh>`. */
export function Soft({ args, radius, segments, children, ...rest }: SoftProps) {
  const [w, h, d] = args
  const geometry = useMemo(() => softBoxGeometry(w, h, d, radius, segments), [w, h, d, radius, segments])
  return (
    <mesh geometry={geometry} {...rest}>
      {children}
    </mesh>
  )
}
