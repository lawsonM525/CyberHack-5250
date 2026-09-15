export type LookId = 'orchid' | 'gold' | 'cozy'

export interface LookPreset {
  id: LookId
  name: string
  tagline: string
  /** Generated rigged GLB in public/models. */
  model: string
  /** Prefix of the retargeted clips that match this rig, e.g. `anim5`. */
  clips: string
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
    id: 'gold',
    name: 'Midas',
    tagline: 'Liquid gold slip, sheer plum duster, dressed for the reveal.',
    model: 'heroine5-web.glb',
    clips: 'anim5',
    skin: '#5b3320',
    skinShadow: '#3d2115',
    hair: 'locs',
    hairColor: '#31201a',
    hairAccent: '#e8b765',
    outfit: '#c9a24a',
    outfitAccent: '#7b3f6a',
    trim: '#f0d18a',
    nails: '#f0c36b',
    lip: '#8e2f4d',
    glasses: false,
    earrings: 'hoops',
  },
  {
    id: 'cozy',
    name: 'Velvet',
    tagline: 'Burgundy velvet, slipper socks, not leaving this apartment sober.',
    model: 'heroine5-web.glb',
    clips: 'anim5',
    skin: '#5b3320',
    skinShadow: '#3d2115',
    hair: 'locs',
    hairColor: '#31201a',
    hairAccent: '#e8b765',
    outfit: '#5d1f33',
    outfitAccent: '#e0a94f',
    trim: '#e8b765',
    nails: '#f0c36b',
    lip: '#8e2f4d',
    glasses: false,
    earrings: 'hoops',
  },
]

export const DEFAULT_LOOK: LookId = 'orchid'

export function getLook(id: LookId): LookPreset {
  return LOOKS.find((l) => l.id === id) ?? LOOKS[0]
}
