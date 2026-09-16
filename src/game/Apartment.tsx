import { useMemo } from 'react'
import * as THREE from 'three'
import { ROOM, DOORWAY } from './world'
import { plasterTexture, woodTexture } from './textures'
import { Soft } from './soft'
import { artPlate, posterPlate, rugPlate } from './assets'
import { Fern, HangingVine, IvyFall, Jasmine, Monstera, NightOrchid, Planter, CornerPalm } from './plants'
import { Bookshelf, CeilingFan, Chair, Desk, Kitchenette, Lounge, NightHatch, RecordConsole, Speaker, Vanity } from './furniture'
import {
  Curtains,
  HangingBasket,
  LightPool,
  MushroomLamp,
  Pouf,
  SideTable,
  Wardrobe,
  WindowSeat,
} from './cozy'
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
      {/* canvas sits proud of its backing, and the backing proud of the wall, so
          nothing is coplanar with the plaster and the frames cannot z-fight */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={map} roughness={0.92} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[width + 0.08, height + 0.08, 0.04]} />
        <meshStandardMaterial color={frame} metalness={0.75} roughness={0.38} />
      </mesh>
      {lit && (
        <group position={[0, height / 2 + 0.12, 0.2]}>
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
    // matte oiled oak: the old gloss turned the empty floor into a mirror
    const floor = new THREE.MeshStandardMaterial({ map: floorTex, color: '#8f6f50', roughness: 0.78, metalness: 0.0 })

    const wallTex = plasterTexture().clone()
    wallTex.needsUpdate = true
    wallTex.repeat.set(3, 1.4)
    const wall = new THREE.MeshStandardMaterial({ map: wallTex, color: '#8a7460', roughness: 0.95 })

    const ceil = new THREE.MeshStandardMaterial({ color: '#3a2f28', roughness: 1 })
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

      {/* rugs: the lounge one, plus a big layered rug under the open floor so the
          opening camera reads as a furnished room rather than bare boards */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-3.7, 0.006, 2.4]}>
        <planeGeometry args={[3.8, 3.4]} />
        <meshStandardMaterial map={rug} roughness={0.98} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-0.2, 0.004, -1.6]}>
        <planeGeometry args={[4.5, 3.3]} />
        <meshStandardMaterial map={rug} color="#b89a7a" roughness={0.99} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0.35]} position={[-0.4, 0.008, -1.8]}>
        <planeGeometry args={[2.3, 1.7]} />
        <meshStandardMaterial map={rug} color="#8a5f52" roughness={0.99} />
      </mesh>

      {/* gallery wall, south side above the lounge. The original two pieces keep
          their exact places; the rest of the salon hang grows around them. */}
      <group position={[0, 0, ROOM.z1 - 0.02]} rotation={[0, Math.PI, 0]}>
        <group position={[2.9, 1.95, 0]}>
          <Framed map={artPlate('portrait')} width={0.86} height={1.29} lit={!low} />
        </group>
        <group position={[4.15, 1.62, 0]}>
          <Framed map={artPlate('botanical')} width={0.62} height={0.93} frame="#6d5b44" />
        </group>
        {/* the wall's only clear run: the wardrobe and the two bookshelves stand
           proud of it everywhere between local x -5.1 and 3.3 */}
        <group position={[-5.35, 1.74, 0]}>
          <Framed map={artPlate('orchid')} width={0.5} height={0.5} frame="#8d6a44" />
        </group>
        <group position={[4.2, 2.42, 0]}>
          <Framed map={artPlate('velvet')} width={0.74} height={0.55} frame="#c08a6a" />
        </group>
      </group>

      {/* landscape print on the west wall over the desk */}
      <group position={[ROOM.x0 + 0.02, 2.12, -1.9]} rotation={[0, Math.PI / 2, 0]}>
        <Framed map={artPlate('city')} width={1.5} height={1.0} lit={!low} frame="#3a3f48" />
      </group>

      {/* figure study over the desk end of the west wall */}
      <group position={[ROOM.x0 + 0.02, 1.98, 1.95]} rotation={[0, Math.PI / 2, 0]}>
        <Framed map={artPlate('muse')} width={0.7} height={0.93} lit={!low} />
      </group>

      {/* silk study on the east wall, the first thing she faces walking in */}
      <group position={[ROOM.x1 - 0.02, 2.18, -0.35]} rotation={[0, -Math.PI / 2, 0]}>
        <Framed map={artPlate('silk')} width={0.78} height={1.04} lit={!low} />
      </group>
      {/* velvet abstract over the vanity, east wall */}
      <group position={[ROOM.x1 - 0.02, 2.05, 1.5]} rotation={[0, -Math.PI / 2, 0]}>
        <Framed map={artPlate('velvet')} width={1.1} height={0.82} frame="#b98a52" />
      </group>
      {/* orchid study by the kitchenette */}
      <group position={[ROOM.x1 - 0.02, 1.62, 4.05]} rotation={[0, -Math.PI / 2, 0]}>
        <Framed map={artPlate('orchid')} width={0.6} height={0.6} frame="#6d5b44" />
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
      <pointLight position={[0, H - 0.2, ROOM.z1 - 0.5]} color="#c2447a" intensity={1.2} distance={7} decay={2} />
      {!low && <pointLight position={[ROOM.x0 + 0.5, H - 0.2, 0]} color="#4fd0c0" intensity={0.9} distance={6} decay={2} />}
      {/* warm practical fill: keeps the middle of the room readable without
          washing out the neon coming through the glass */}
      <pointLight position={[0.2, 2.5, -1.2]} color="#ffb877" intensity={12} distance={12} decay={2} />
      <pointLight position={[-2.2, 2.4, 2.4]} color="#ffa864" intensity={9} distance={11} decay={2} />
      {/* wall wash so the plaster never falls to black behind the furniture */}
      <pointLight position={[3.9, 2.4, 2.0]} color="#ffc48a" intensity={9} distance={11} decay={2} />
      {/* baked pools: the warmth survives the point-light budget and costs one
          unlit quad each instead of another practical */}
      <LightPool
        position={[0, 2.1, ROOM.z1 - 0.13]}
        rotation={[0, Math.PI, 0]}
        size={5.2}
        color="#ff9852"
        opacity={0.3}
      />
      <LightPool
        position={[-4.4, 1.9, ROOM.z1 - 0.13]}
        rotation={[0, Math.PI, 0]}
        size={3.4}
        color="#ffab6a"
        opacity={0.26}
      />
      <LightPool
        position={[ROOM.x0 + 0.14, 1.95, 0.6]}
        rotation={[0, Math.PI / 2, 0]}
        size={3.8}
        color="#ffa25c"
        opacity={0.26}
      />
      <LightPool
        position={[ROOM.x1 - 0.14, 1.9, 1.2]}
        rotation={[0, -Math.PI / 2, 0]}
        size={3.6}
        color="#ffb271"
        opacity={0.24}
      />
      <LightPool position={[-2.2, 0.03, 2.4]} size={4.4} color="#ff9a4e" opacity={0.3} />
      <LightPool position={[3.6, 0.03, 1.2]} size={3.6} color="#ffab63" opacity={0.24} />

      {/* window garden: slatted seat + the four clue plants, each in its own pot */}
      <WindowSeat />
      <Planter position={[-1.7, 0.44, -4.0]} radius={0.2} height={0.34} color="#9c5a3c" tag="jasmine" />
      <Jasmine position={[-1.7, 0.78, -4.0]} scale={1.05} />
      <Planter position={[-0.6, 0.44, -4.0]} radius={0.23} height={0.22} color="#cdbba0" tag="fern" />
      <Fern position={[-0.6, 0.66, -4.0]} scale={1.15} />
      <Planter position={[0.55, 0.44, -4.0]} radius={0.26} height={0.42} color="#6f7a72" tag="monstera" />
      <Monstera position={[0.55, 0.86, -4.0]} scale={1.3} />
      <Planter position={[1.65, 0.44, -4.0]} radius={0.15} height={0.26} color="#3f4a52" tag="orchid" />
      <NightOrchid position={[1.65, 0.7, -4.0]} scale={1.05} />
      {!low && <pointLight position={[-0.15, 1.5, -3.7]} color="#9ae0b8" intensity={0.8} distance={4.5} decay={2} />}

      {/* layered greenery: floor pots, hanging baskets and vines at three heights */}
      <CornerPalm position={[5.5, 0.05, -2.8]} scale={1.15} />
      <HangingVine position={[-5.3, 2.8, -1.4]} length={1.3} strands={6} />
      <HangingVine position={[3.0, 2.85, 1.0]} length={1.0} strands={5} />
      <HangingVine position={[-2.6, 2.86, -4.05]} length={1.5} strands={7} />
      <HangingVine position={[2.1, 2.9, -4.05]} length={1.15} strands={5} />
      <HangingBasket position={[-3.4, 2.5, -4.0]} />
      <Jasmine position={[-3.4, 2.5, -4.0]} scale={1.5} />
      <Planter position={[-5.5, 0, 0.2]} radius={0.24} height={0.34} color="#9c5a3c" />
      <Fern position={[-5.5, 0.34, 0.2]} scale={1.1} />
      <Planter position={[-5.4, 0, -1.15]} radius={0.3} height={0.5} color="#cdbba0" />
      <Monstera position={[-5.4, 0.52, -1.15]} scale={1.45} />
      <Planter position={[2.5, 0, -3.4]} radius={0.27} height={0.44} color="#6f7a72" />
      <CornerPalm position={[2.5, 0.44, -3.4]} scale={0.85} />

      {/* ivy falling off the window head and the shelf, the reference's
          strongest organic line against all that straight glazing */}
      <IvyFall position={[-1.0, 2.82, -3.96]} strands={8} length={1.9} spread={1.1} />
      <IvyFall position={[1.5, 2.82, -3.96]} strands={6} length={1.4} spread={0.8} />
      <IvyFall position={[-5.48, 2.4, -2.5]} rotation={[0, Math.PI / 2, 0]} strands={5} length={1.6} spread={0.7} />
      <IvyFall position={[-1.95, 2.42, 3.78]} rotation={[0, Math.PI, 0]} strands={4} length={1.0} spread={0.5} />

      {/* soft furnishings in the open floor the opening camera looks across */}
      <Pouf position={[-1.6, 0, -1.5]} color="#8a5a3c" radius={0.38} />
      <Pouf position={[1.75, 0, -0.9]} color="#5c4a60" radius={0.32} />
      <Pouf position={[-0.9, 0, -2.6]} color="#6a3a4e" radius={0.3} />
      <SideTable position={[0.35, 0, -2.3]} />
      {/* things left out on the floor: what stops a rug reading as empty */}
      <group position={[0.55, 0, -1.15]} rotation={[0, 0.4, 0]}>
        {[0, 1, 2].map((i) => (
          <Soft args={[0.3, 0.045, 0.22]} key={i} castShadow position={[i * 0.02, 0.025 + i * 0.048, i * 0.015]} rotation={[0, i * 0.24, 0]}>
            <meshStandardMaterial color={['#5d3a5a', '#37536b', '#96603a'][i]} roughness={0.9} />
          </Soft>
        ))}
        <mesh castShadow position={[0.26, 0.055, -0.16]}>
          <cylinderGeometry args={[0.052, 0.042, 0.11, 14, 1, true]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.45} side={THREE.DoubleSide} />
        </mesh>
        <mesh receiveShadow position={[0.26, 0.008, -0.16]}>
          <cylinderGeometry args={[0.09, 0.09, 0.012, 16]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.45} />
        </mesh>
      </group>
      <MushroomLamp position={[-2.46, 0.0, -4.0]} scale={1.15} intensity={11} />
      <Wardrobe />
      <Curtains low={low} />

      <Desk stage={stage} unread={unread} />
      <Chair />
      <Vanity />
      <Lounge />
      <Bookshelf />
      <RecordConsole />
      <Speaker />
      <Kitchenette />
      <NightHatch />
      <CeilingFan reducedMotion={reducedMotion} />
    </group>
  )
}
