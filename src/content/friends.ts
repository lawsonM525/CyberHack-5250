import type { PingTone } from '../audio/audio'

export interface Friend {
  id: string
  name: string
  handle: string
  /** Accent used by their notification card and chat bubbles. */
  color: string
  tone: PingTone
  /** What they say when she sends them credits. */
  thanks: string
}

export const FRIENDS: Friend[] = [
  {
    id: 'bex',
    name: 'Bex',
    handle: '@bexonthefire',
    color: '#ff8fbf',
    tone: 'bloop',
    thanks: 'CREDITS?? for me?? ok he is getting a second Raspberry Pi and it is YOUR fault',
  },
  {
    id: 'tunde',
    name: 'Tunde',
    handle: '@roofwater',
    color: '#7fd4ff',
    tone: 'bubble',
    thanks: 'putting this straight towards a bucket with style. thank you queen',
  },
  {
    id: 'priya',
    name: 'Priya',
    handle: '@notaplantstore',
    color: '#9dea9a',
    tone: 'marimba',
    thanks: 'i will absolutely spend this on another plant i have nowhere to put. bless you',
  },
  {
    id: 'nova',
    name: 'Nova',
    handle: '@novacooks',
    color: '#ffc46b',
    tone: 'chirp',
    thanks: 'accepting this purely as payment for emotional support seasoning advice',
  },
  {
    id: 'mamajo',
    name: 'Mama Jo',
    handle: '@josephine.l',
    color: '#c9a2ff',
    tone: 'purr',
    thanks: 'i did not ask for this. i am telling everyone at church. thank you baby',
  },
]

export function getFriend(id: string): Friend {
  return FRIENDS.find((f) => f.id === id) ?? FRIENDS[0]
}

export interface Beat {
  id: string
  friend: string
  text: string
  /** Canned replies she can tap. Each gets a comeback. */
  replies: { text: string; back: string }[]
}

/** Delivered in order, spaced out, never on top of an open overlay. */
export const BEATS: Beat[] = [
  {
    id: 'bex-pi',
    friend: 'bex',
    text: 'My husband just bought a Raspberry Pi',
    replies: [
      { text: 'for what', back: 'he says "the garage". the garage has no lights. the garage has no plants. the garage has NOTHING' },
      { text: 'congratulations to him', back: 'do NOT encourage this. he has a spreadsheet now' },
    ],
  },
  {
    id: 'tunde-roof',
    friend: 'tunde',
    text: 'My roof is leaking. LOL.',
    replies: [
      { text: 'LOL?? call someone', back: 'i put a pan under it and named the pan. her name is Deborah' },
      { text: 'are you ok', back: 'philosophically? no. structurally? also no. but the rain sounds nice' },
    ],
  },
  {
    id: 'priya-plants',
    friend: 'priya',
    text: 'i counted my plants tonight. there are 41. i owned 9 in march',
    replies: [
      { text: 'where do they SLEEP', back: 'the bathtub is a greenhouse now. i shower at the gym. i do not go to the gym' },
      { text: 'send me one', back: 'absolutely. pick a child. i have named all of them after minor betrayals' },
    ],
  },
  {
    id: 'nova-soup',
    friend: 'nova',
    text: 'i invented a soup and it invented a smell',
    replies: [
      { text: 'what is in it', back: 'love, miso, and one decision i will not be discussing tonight' },
      { text: 'bring it over', back: 'it cannot be transported. it has to be experienced at the source. like a waterfall' },
    ],
  },
  {
    id: 'mamajo-check',
    friend: 'mamajo',
    text: 'are you eating. and do not say "yes" like last time when you meant crackers',
    replies: [
      { text: 'i am eating!!', back: 'mm. name the food. slowly.' },
      { text: 'crackers are a food', back: 'lord. buy some bread tonight. i will know if you do not' },
    ],
  },
  {
    id: 'bex-window',
    friend: 'bex',
    text: 'saw your window lit up from the tram. very mysterious woman of the tower of you',
    replies: [
      { text: 'i am extremely normal', back: 'you have four plants on a clue rack and a terminal from 2049. normal.' },
      { text: 'wave next time', back: 'i DID. an entire tram watched me wave at a building. this is your fault' },
    ],
  },
  {
    id: 'tunde-bread',
    friend: 'tunde',
    text: 'the bakery downstairs is doing the night hatch again. the cardamom ones. go. GO.',
    replies: [
      { text: 'on it', back: 'get two. one is for future you at 3am and she has had a night' },
      { text: 'i am busy working', back: 'working WHERE. it is midnight. the bread is RIGHT THERE' },
    ],
  },
  {
    id: 'priya-rain',
    friend: 'priya',
    text: 'rain on the glass is free ambience and nobody talks about it enough',
    replies: [
      { text: 'agreed, it is carrying me', back: 'exactly. put the lamp on low. thank me tomorrow' },
      { text: 'it is loud', back: 'that is called TEXTURE, babe' },
    ],
  },
]
