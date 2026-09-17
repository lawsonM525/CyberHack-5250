export type LookId = 'orchid' | 'nova' | 'jade'

/**
 * The three heroines come from two different generated rigs, which disagree on
 * bone names, facing axis and export height, so every rig-specific number lives
 * here instead of being hard-coded against the first one.
 */
export type RigKind = 'accurig' | 'biped'

export interface RigProfile {
  /** Yaw that turns the rig's own forward into the controller's +Z. */
  faceYaw: number
  /** Multiplier taking the exported height to the shared 1.68 m presentation. */
  heightScale: number
  /** Root drop that puts this rig's pelvis on the desk chair pad. */
  seatDrop: number
  /** Rig-local lift of the idle soles above the origin, subtracted so she stands on the floor. */
  footLift: number
  /** Axis the desk pose swings a limb forward around, in the rig's own frame. */
  swingAxis: 'x' | 'z'
  /** Sit from a retargeted seated clip (`<clips>-sit.glb`) instead of the posed joints. */
  sitClip: boolean
  /** Desk-pose swing per joint, signed for this rig's own axis orientation. */
  sit: SitPose
  /** Bone names for the desk pose, in the order the pose is written. */
  bones: {
    thighL: string
    thighR: string
    calfL: string
    calfR: string
    waist: string
    spine: string
    upperarmL: string
    upperarmR: string
    forearmL: string
    forearmR: string
  }
}

export interface SitPose {
  thigh: number
  calf: number
  waist: number
  spine: number
  upperarm: number
  forearm: number
  /** Sideways knee/elbow spread, mirrored left and right. */
  spread: number
  armSpread: number
  /**
   * Swing out of the captured standing pose around the measured hip axis,
   * instead of the bind pose around the rig's nominal swing axis.
   */
  anatomical: boolean
}

export const RIGS: Record<RigKind, RigProfile> = {
  accurig: {
    faceYaw: Math.PI / 2,
    heightScale: 1,
    seatDrop: 0.378,
    footLift: 0,
    swingAxis: 'z',
    sitClip: false,
    sit: {
      thigh: 1.45,
      calf: -1.5,
      waist: -0.16,
      spine: -0.08,
      upperarm: 1.15,
      forearm: 0.7,
      spread: 0.12,
      armSpread: 0.14,
      anatomical: false,
    },
    bones: {
      thighL: 'L_Thigh',
      thighR: 'R_Thigh',
      calfL: 'L_Calf',
      calfR: 'R_Calf',
      waist: 'Waist',
      spine: 'Spine01',
      upperarmL: 'L_Upperarm',
      upperarmR: 'R_Upperarm',
      forearmL: 'L_Forearm',
      forearmR: 'R_Forearm',
    },
  },
  biped: {
    faceYaw: Math.PI,
    // measured on the skinned idle pose in game (1.82 m at 1/1.762), not the
    // bind box, so she matches the shared 1.68 m presentation
    heightScale: 1 / 1.909,
    seatDrop: 0.378,
    // the idle clip leaves the soles ~4 cm above the rig origin
    footLift: 0.048,
    swingAxis: 'x',
    sitClip: true,
    // measured in game rather than guessed: thighs level with the pad, shins
    // vertical, soles a few cm off the floor plane, hands out over the keyboard
    sit: {
      thigh: -0.8,
      calf: 0.9,
      waist: 0.12,
      spine: 0.06,
      upperarm: -0.8,
      forearm: -0.8,
      spread: 0.12,
      armSpread: -0.14,
      anatomical: true,
    },
    bones: {
      thighL: 'LeftUpLeg',
      thighR: 'RightUpLeg',
      calfL: 'LeftLeg',
      calfR: 'RightLeg',
      waist: 'Spine',
      spine: 'Spine01',
      upperarmL: 'LeftArm',
      upperarmR: 'RightArm',
      forearmL: 'LeftForeArm',
      forearmR: 'RightForeArm',
    },
  },
}

export interface LookPreset {
  id: LookId
  name: string
  tagline: string
  /** Generated rigged GLB in public/models. */
  model: string
  /** Prefix of the retargeted clips that match this rig, e.g. `anim5`. */
  clips: string
  rig: RigKind
  /** Per-character corrections to the shared rig profile, measured in game. */
  fit?: Partial<Pick<RigProfile, 'heightScale' | 'footLift' | 'seatDrop'>>
  /** Recoloured base-colour map in public/models; omitted keeps the GLB's own. */
  skinTexture?: string
  skin: string
  skinShadow: string
  hair: 'afro' | 'braids' | 'locs'
  hairColor: string
  hairAccent: string
  outfit: string
  outfitAccent: string
  trim: string
  nails: string
  lip: string
  glasses: boolean
  earrings: 'hoops' | 'drops'
}

export const LOOKS: LookPreset[] = [
  {
    id: 'orchid',
    name: 'Orchid',
    tagline: 'Locs and gold beads, teal bomber, absolutely unbothered.',
    model: 'heroine5-web.glb',
    clips: 'anim5',
    rig: 'accurig',
    skin: '#5b3320',
    skinShadow: '#3d2115',
    hair: 'locs',
    hairColor: '#31201a',
    hairAccent: '#e8b765',
    outfit: '#2f6f70',
    outfitAccent: '#8c3f63',
    trim: '#e8b765',
    nails: '#f0c36b',
    lip: '#8e2f4d',
    glasses: false,
    earrings: 'hoops',
  },
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'Platinum bob, chrome moto jacket, runs on hot pink and spite.',
    model: 'nova-web.glb',
    clips: 'anim-nova',
    rig: 'biped',
    // taller silhouette and platform soles that hang below the foot joint
    fit: { heightScale: 1 / 1.991, footLift: -0.04 },
    skin: '#e8c3ad',
    skinShadow: '#c49a83',
    hair: 'afro',
    hairColor: '#efe6da',
    hairAccent: '#ff3fa4',
    outfit: '#f2f2f4',
    outfitAccent: '#ff3fa4',
    trim: '#c8ccd4',
    nails: '#ff6fbf',
    lip: '#d62a7a',
    glasses: false,
    earrings: 'drops',
  },
  {
    id: 'jade',
    name: 'Jade',
    tagline: 'Silk dragon wrap, cargo trousers, sneakers made for rooftops.',
    model: 'jade-web.glb',
    clips: 'anim-jade',
    rig: 'biped',
    skin: '#e6bf9c',
    skinShadow: '#bf9270',
    hair: 'braids',
    hairColor: '#171319',
    hairAccent: '#3fbf8f',
    outfit: '#14584a',
    outfitAccent: '#3fbf8f',
    trim: '#c8a24a',
    nails: '#7fe0bd',
    lip: '#d4604f',
    glasses: false,
    earrings: 'drops',
  },
]

export const DEFAULT_LOOK: LookId = 'orchid'

export function getLook(id: LookId): LookPreset {
  return LOOKS.find((l) => l.id === id) ?? LOOKS[0]
}

/** Rig profile for a look, with her own measured height and sole corrections. */
export function rigFor(look: LookPreset): RigProfile {
  const base = RIGS[look.rig]
  return look.fit ? { ...base, ...look.fit } : base
}
