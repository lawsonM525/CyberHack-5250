export const ACCESS_CODE = '5250'

export interface MessageEntry {
  id: string
  from: string
  time: string
  subject: string
  body: string[]
}

/** Messages available in the terminal inbox, gated by mission phase. */
export const MESSAGES: MessageEntry[] = [
  {
    id: 'orchid-01',
    from: 'ORCHID',
    time: '23:41',
    subject: 'the balcony, tonight',
    body: [
      'You awake? Of course you are.',
      'Kingsley Row, twelfth floor, the balcony facing your window. There is something up there I need you to see with your own eyes before sunrise. I could not carry it down.',
      'Their access panel is soft — I already thinned it out for you. It still wants a four digit key and I am not putting that in a message.',
      'You already have it. You have been watering it for a year.',
      'Read the garden, in the order it bloomed. Then open the span and walk over. I will be quiet until you are across.',
      '— O.',
    ],
  },
  {
    id: 'orchid-02',
    from: 'ORCHID',
    time: '00:06',
    subject: 're: the balcony',
    body: [
      'The span is holding. Good girl.',
      'Do not look down, look out. That is the whole point of the trip.',
      'When you have looked long enough: the crate under the awning is yours. It has a name on it and the name is not mine. We will talk about the Marigold job tomorrow night.',
      '— O.',
    ],
  },
]

export const HINTS: string[] = [
  'Orchid said the key has been watered for a year. Take another look at the window garden.',
  'Every planter has a hand-written tag: a name, a bloom date, and a single number.',
  'Order the four tags by the date they bloomed, earliest first, and read their numbers.',
  'Jasmine (01.09) is 5, Fern (02.14) is 2, Monstera (03.21) is 5, Night Orchid (05.02) is 0. The key is 5250.',
]

export const TERMINAL_BANNER = [
  'KESTREL OS 4.2 — private node',
  'user: you    node: 12F-WEST-ORCHIDHOUSE',
  'link: KINGSLEY ROW ACCESS PANEL ... thinned, awaiting key',
]
