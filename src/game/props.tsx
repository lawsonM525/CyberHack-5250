import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

/**
 * Generated props (docs/assets.md) arrive normalised to a unit box with an
 * arbitrary origin, so every one is re-scaled to a real-world height and
 * re-seated on the floor at its own centre before it enters the room.
 */
export type PropName = 'sofa' | 'floorlamp' | 'monstera' | 'vanity' | 'desk' | 'incense' | 'speaker' | 'bookshelf'

const url = (name: PropName) => `${import.meta.env.BASE_URL}models/${name}.glb`

export function Prop({
  name,
  height,
  position,
  rotation = 0,
  tint,
}: {
  name: PropName
  height: number
  position: [number, number, number]
  rotation?: number
  tint?: string
}) {
  const { scene } = useGLTF(url(name), false, true)
  const object = useMemo(() => {
    const o = clone(scene)
    const first = new THREE.Box3().setFromObject(o)
    const size = first.getSize(new THREE.Vector3())
    o.scale.setScalar(height / Math.max(size.y, 1e-4))
    const box = new THREE.Box3().setFromObject(o)
    const center = box.getCenter(new THREE.Vector3())
    o.position.set(-center.x, -box.min.y, -center.z)
    o.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true
      child.receiveShadow = true
      const mat = child.material
      if (tint && mat instanceof THREE.MeshStandardMaterial) mat.color.multiplyScalar(1).lerp(new THREE.Color(tint), 0.25)
    })
    return o
  }, [scene, height, tint])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <primitive object={object} />
    </group>
  )
}

export function preloadProps() {
  // only the ones the room actually mounts; the rest lost the audition to
  // procedural builds and would be a couple of megabytes of dead download
  const names: PropName[] = ['monstera', 'incense', 'speaker', 'bookshelf']
  names.forEach((n) => useGLTF.preload(url(n), false, true))
}
