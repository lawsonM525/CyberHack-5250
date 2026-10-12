export interface InspectEntry {
  id: string
  title: string
  subtitle?: string
  body: string[]
  /** Clue tags contribute to the access key. */
  clue?: { bloom: string; digit: string }
}

export const PLANT_CLUES: InspectEntry[] = [
  {
    id: 'plant-jasmine',
    title: 'Night Jasmine',
    subtitle: "hand-written tag, Orchid's looping capitals",
    body: ['NIGHT JASMINE', 'bloomed 01.09', 'no. 5'],
    clue: { bloom: '01.09', digit: '5' },
  },
  {
    id: 'plant-fern',
    title: 'Silver Fern',
    subtitle: 'tag curled from the window damp',
    body: ['SILVER FERN', 'bloomed 02.14', 'no. 2'],
    clue: { bloom: '02.14', digit: '2' },
  },
  {
    id: 'plant-monstera',
    title: 'Monstera',
    subtitle: 'the big one, leaves against the glass',
    body: ['MONSTERA', 'bloomed 03.21', 'no. 5'],
    clue: { bloom: '03.21', digit: '5' },
  },
  {
    id: 'plant-orchid',
    title: 'Night Orchid',
    subtitle: 'she left this one on the sill and never explained it',
    body: ['NIGHT ORCHID', 'bloomed 05.02', 'no. 0'],
    clue: { bloom: '05.02', digit: '0' },
  },
]

export const FLAVOUR: InspectEntry[] = [
  {
    id: 'record',
    title: 'Record sleeve',
    subtitle: 'left leaning against the speaker',
    body: [
      '"SUNDIAL SESSIONS vol. 3" — a pressing from a rooftop label that folded two winters ago.',
      'Someone wrote on the inner sleeve in silver pen: play this one loud, the neighbours have given up.',
    ],
  },
  {
    id: 'incense',
    title: 'Incense burner',
    subtitle: 'brass, still warm',
    body: [
      'A thin grey rope of smoke climbs and then loses its nerve near the ceiling fan.',
      'Sandalwood, a little sweet. You light it when you are about to do something you would not write down.',
    ],
  },
  {
    id: 'photo',
    title: 'Framed photograph',
    subtitle: 'you and Orchid, two summers ago',
    body: [
      'The two of you on somebody else\'s roof, laughing at something off-frame. Her face is turned away from the camera — it always is.',
      'On the back, in the same looping capitals as the plant tags: "for the garden, from the garden."',
    ],
  },
  {
    id: 'vanity',
    title: 'Vanity',
    subtitle: 'mirror, jewellery dish, the good lamp',
    body: [
      'Gold hoops, a plum lip you have almost finished, a nail file, three rings you never wear at the same time.',
      'You check yourself out of habit. The city behind your reflection is doing its best to compete and losing.',
    ],
  },
  {
    id: 'books',
    title: 'Stack of books',
    subtitle: 'load-bearing furniture at this point',
    body: [
      '"Botany of the Vertical City". "Signal Discipline". A paperback thriller with a cracked spine you have read four times.',
      'A dried leaf marks page 212 of the botany one. You do not remember why.',
    ],
  },
  {
    id: 'speaker',
    title: 'Speaker',
    subtitle: 'fabric front, warm as an animal',
    body: [
      'Low bass, a little hiss, somebody\'s late-night set bleeding out of it.',
      'It has been on since afternoon. The apartment feels wrong without it.',
    ],
  },
  {
    id: 'window',
    title: 'The window',
    subtitle: 'twelve floors of nothing, then the city',
    body: [
      'Rain has not arrived yet but the air is thinking about it. Sign-light lies across the glass in long coloured bars.',
      'Directly across the gap: KINGSLEY ROW. Twelfth floor. A dark balcony with a planter box and an awning, and a small red access light that has not changed in a year.',
    ],
  },
]

export const ALL_INSPECTABLES: InspectEntry[] = [...PLANT_CLUES, ...FLAVOUR]

export function getInspectable(id: string): InspectEntry | undefined {
  return ALL_INSPECTABLES.find((e) => e.id === id)
}
