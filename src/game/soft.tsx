import { useMemo, type ReactNode } from 'react'
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
