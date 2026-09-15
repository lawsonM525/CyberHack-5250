import { useMemo } from 'react'
import * as THREE from 'three'
import { ROOM, DOORWAY } from './world'
import { plasterTexture, woodTexture } from './textures'
import { artPlate, posterPlate, rugPlate } from './assets'
import { Fern, HangingVine, Jasmine, Monstera, NightOrchid, Planter, CornerPalm } from './plants'
import { Bookshelf, CeilingFan, Chair, Desk, Kitchenette, Lounge, RecordConsole, Speaker, Vanity } from './furniture'
import type { MissionStage } from '../state/store'
import { useLowQuality } from './quality'

const T = 0.2
const H = ROOM.height

/** A canvas in a slim gilt frame, optionally with its own picture light. */
function Framed({
  map,
  width,
  height,
  lit,
  frame = '#c9a25a',
}: {
  map: THREE.Texture
  width: number
  height: number
  lit?: boolean
  frame?: string
}) {
  return (
    <group>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={map} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0, -0.014]}>
        <boxGeometry args={[width + 0.08, height + 0.08, 0.024]} />
        <meshStandardMaterial color={frame} metalness={0.75} roughness={0.38} />
      </mesh>
      {lit && (
        <group position={[0, height / 2 + 0.12, 0.16]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, width * 0.5, 10]} />
            <meshStandardMaterial color="#b9915a" metalness={0.8} roughness={0.3} />
          </mesh>
          <pointLight color="#ffc98a" intensity={1.4} distance={2.4} decay={2} />
        </group>
      )}
    </group>
  )
}

function useRoomMaterials(low: boolean) {
  return useMemo(() => {
    const floorTex = woodTexture().clone()
    floorTex.needsUpdate = true
    floorTex.repeat.set(6, 4.5)
    floorTex.rotation = Math.PI / 2
    const floor = new THREE.MeshStandardMaterial({ map: floorTex, color: '#8a6a4e', roughness: 0.42, metalness: 0.04 })

    const wallTex = plasterTexture().clone()
    wallTex.needsUpdate = true
    wallTex.repeat.set(3, 1.4)
    const wall = new THREE.MeshStandardMaterial({ map: wallTex, color: '#6a5f74', roughness: 0.94 })

    const ceil = new THREE.MeshStandardMaterial({ color: '#1d1a24', roughness: 1 })
    const frame = new THREE.MeshStandardMaterial({ color: '#23262e', metalness: 0.7, roughness: 0.35 })
    // transmission needs a second render pass; far too expensive on the low tier
    const glass = low
      ? new THREE.MeshStandardMaterial({
          color: '#9fd8e8',
          roughness: 0.12,
          metalness: 0,
          transparent: true,
          opacity: 0.14,
        })
      : new THREE.MeshPhysicalMaterial({
          color: '#9fd8e8',
          transmission: 0.96,
          thickness: 0.02,
          roughness: 0.04,
          metalness: 0,
          transparent: true,
          opacity: 0.22,
          ior: 1.45,
        })
    return { floor, wall, ceil, frame, glass }
  }, [low])
}

export function Apartment({
  stage,
  unread,
  reducedMotion,
}: {
  stage: MissionStage
  unread: boolean
  reducedMotion: boolean
}) {
  const low = useLowQuality()
  const m = useRoomMaterials(low)
  const rug = rugPlate()
  const poster = posterPlate()

  const winX0 = ROOM.x0
  const winX1 = 2.0
  const sill = 0.22
  const winTop = 2.95

  return (
    <group>
      {/* floor + ceiling */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={m.floor}>
        <planeGeometry args={[ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]} material={m.ceil}>
        <planeGeometry args={[ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0]} />
      </mesh>

      {/* south / east / west walls */}
      <mesh receiveShadow position={[0, H / 2, ROOM.z1 + T / 2]} material={m.wall}>
        <boxGeometry args={[ROOM.x1 - ROOM.x0 + T * 2, H, T]} />
      </mesh>
      <mesh receiveShadow position={[ROOM.x0 - T / 2, H / 2, 0]} material={m.wall}>
        <boxGeometry args={[T, H, ROOM.z1 - ROOM.z0]} />
      </mesh>
      <mesh receiveShadow position={[ROOM.x1 + T / 2, H / 2, 0]} material={m.wall}>
        <boxGeometry args={[T, H, ROOM.z1 - ROOM.z0]} />
      </mesh>

      {/* north wall: window band, door opening, solid returns */}
      <mesh receiveShadow position={[(winX0 + winX1) / 2, sill / 2, ROOM.z0 - T / 2]} material={m.wall}>
        <boxGeometry args={[winX1 - winX0, sill, T]} />
      </mesh>
      <mesh receiveShadow position={[(winX0 + winX1) / 2, (winTop + H) / 2, ROOM.z0 - T / 2]} material={m.wall}>
        <boxGeometry args={[winX1 - winX0, H - winTop, T]} />
      </mesh>
      <mesh receiveShadow position={[(winX1 + DOORWAY.x0) / 2, H / 2, ROOM.z0 - T / 2]} material={m.wall}>
        <boxGeometry args={[DOORWAY.x0 - winX1, H, T]} />
      </mesh>
      <mesh receiveShadow position={[(DOORWAY.x1 + ROOM.x1) / 2, H / 2, ROOM.z0 - T / 2]} material={m.wall}>
        <boxGeometry args={[ROOM.x1 - DOORWAY.x1, H, T]} />
      </mesh>
      <mesh receiveShadow position={[(DOORWAY.x0 + DOORWAY.x1) / 2, (2.5 + H) / 2, ROOM.z0 - T / 2]} material={m.wall}>
        <boxGeometry args={[DOORWAY.x1 - DOORWAY.x0, H - 2.5, T]} />
      </mesh>

      {/* glazing */}
      <mesh position={[(winX0 + winX1) / 2, (sill + winTop) / 2, ROOM.z0 - T / 2]} material={m.glass}>
        <boxGeometry args={[winX1 - winX0, winTop - sill, 0.03]} />
      </mesh>
      {[-4.0, -2.0, 0.0].map((x) => (
        <mesh key={x} position={[x, (sill + winTop) / 2, ROOM.z0 - T / 2]} material={m.frame}>
          <boxGeometry args={[0.07, winTop - sill, 0.09]} />
        </mesh>
      ))}
      <mesh position={[(winX0 + winX1) / 2, 1.62, ROOM.z0 - T / 2]} material={m.frame}>
        <boxGeometry args={[winX1 - winX0, 0.06, 0.09]} />
      </mesh>
      <mesh position={[(winX0 + winX1) / 2, sill, ROOM.z0 - T / 2]} material={m.frame}>
        <boxGeometry args={[winX1 - winX0, 0.08, 0.16]} />
      </mesh>
      <mesh position={[(winX0 + winX1) / 2, winTop, ROOM.z0 - T / 2]} material={m.frame}>
        <boxGeometry args={[winX1 - winX0, 0.08, 0.16]} />
      </mesh>

      {/* sliding door leaf, parked open against the wall */}
      <group position={[2.75, 1.25, ROOM.z0 - T / 2]}>
        <mesh material={m.frame}>
          <boxGeometry args={[0.1, 2.5, 0.1]} />
        </mesh>
        <mesh position={[0.05, 0, 0.06]} material={m.glass}>
          <boxGeometry args={[0.02, 2.4, 0.06]} />
        </mesh>
      </group>
      <mesh position={[(DOORWAY.x0 + DOORWAY.x1) / 2, 2.5, ROOM.z0 - T / 2]} material={m.frame}>
        <boxGeometry args={[DOORWAY.x1 - DOORWAY.x0 + 0.12, 0.1, 0.16]} />
      </mesh>

      {/* rug */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-3.7, 0.006, 2.4]}>
        <planeGeometry args={[3.8, 3.4]} />
        <meshStandardMaterial map={rug} roughness={0.98} />
      </mesh>

      {/* gallery wall, south side above the lounge */}
      <group position={[0, 0, ROOM.z1 - 0.02]} rotation={[0, Math.PI, 0]}>
        <group position={[2.9, 1.95, 0]}>
          <Framed map={artPlate('portrait')} width={0.86} height={1.29} lit={!low} />
        </group>
        <group position={[4.15, 1.62, 0]}>
          <Framed map={artPlate('botanical')} width={0.62} height={0.93} frame="#6d5b44" />
        </group>
      </group>

      {/* landscape print on the west wall over the desk */}
      <group position={[ROOM.x0 + 0.02, 2.12, -1.9]} rotation={[0, Math.PI / 2, 0]}>
        <Framed map={artPlate('city')} width={1.5} height={1.0} lit={!low} frame="#3a3f48" />
      </group>

      {/* wall art, west wall */}
      <group position={[ROOM.x0 + 0.02, 1.85, 0.6]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[1.0, 1.34]} />
          <meshStandardMaterial map={poster} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, -0.012]}>
          <boxGeometry args={[1.08, 1.42, 0.02]} />
          <meshStandardMaterial color="#c9a25a" metalness={0.8} roughness={0.35} />
        </mesh>
      </group>
      {/* neon accent strip along the ceiling cove */}
      <mesh position={[0, H - 0.08, ROOM.z1 - 0.1]}>
        <boxGeometry args={[ROOM.x1 - ROOM.x0 - 0.6, 0.03, 0.03]} />
        <meshBasicMaterial color="#c2447a" toneMapped={false} />
      </mesh>
      <mesh position={[ROOM.x0 + 0.12, H - 0.08, 0]}>
        <boxGeometry args={[0.03, 0.03, ROOM.z1 - ROOM.z0 - 0.6]} />
        <meshBasicMaterial color="#4fd0c0" toneMapped={false} />
      </mesh>
      <pointLight position={[0, H - 0.2, ROOM.z1 - 0.5]} color="#c2447a" intensity={1.6} distance={7} decay={2} />
      {!low && <pointLight position={[ROOM.x0 + 0.5, H - 0.2, 0]} color="#4fd0c0" intensity={1.2} distance={6} decay={2} />}

      {/* window garden bench + the four clue plants */}
      <group position={[-0.15, 0, -4.0]}>
        <mesh castShadow receiveShadow position={[0, 0.22, 0]}>
          <boxGeometry args={[4.3, 0.44, 0.66]} />
          <meshStandardMaterial map={woodTexture()} color="#7d6a52" roughness={0.6} />
        </mesh>
      </group>
      <Planter position={[-1.7, 0.44, -4.0]} radius={0.2} height={0.3} tag="jasmine" />
      <Jasmine position={[-1.7, 0.74, -4.0]} scale={1.0} />
      <Planter position={[-0.6, 0.44, -4.0]} radius={0.19} height={0.28} tag="fern" />
      <Fern position={[-0.6, 0.72, -4.0]} scale={0.95} />
      <Planter position={[0.55, 0.44, -4.0]} radius={0.22} height={0.32} tag="monstera" />
      <Monstera position={[0.55, 0.76, -4.0]} scale={1.15} />
      <Planter position={[1.65, 0.44, -4.0]} radius={0.18} height={0.28} tag="orchid" />
      <NightOrchid position={[1.65, 0.72, -4.0]} scale={1.0} />
      {!low && <pointLight position={[-0.15, 1.5, -3.7]} color="#8fe0c0" intensity={0.9} distance={4.5} decay={2} />}

      {/* greenery elsewhere */}
      <CornerPalm position={[5.5, 0.05, -2.8]} scale={1.15} />
      <HangingVine position={[-5.3, 2.8, -1.4]} length={1.3} strands={6} />
      <HangingVine position={[3.0, 2.85, 1.0]} length={1.0} strands={5} />
      <Planter position={[-5.5, 0, 0.2]} radius={0.24} height={0.34} />
      <Fern position={[-5.5, 0.34, 0.2]} scale={1.1} />

      <Desk stage={stage} unread={unread} />
      <Chair />
      <Vanity />
      <Lounge />
      <Bookshelf />
      <RecordConsole />
      <Speaker />
      <Kitchenette />
      <CeilingFan reducedMotion={reducedMotion} />
    </group>
  )
}
