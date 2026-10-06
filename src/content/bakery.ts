export interface BakeryItem {
  id: string
  name: string
  blurb: string
  price: number
  /** Crust colour used for the loaf that appears on her counter. */
  color: string
}

/** Sugarloaf runs a night hatch on the twelfth floor. Fictional credits only. */
export const BAKERY: BakeryItem[] = [
  {
    id: 'milk-bread',
    name: 'Milk bread, half loaf',
    blurb: 'still warm. squishes like a pillow. gone by morning.',
    price: 40,
    color: '#e8c08a',
  },
  {
    id: 'cardamom-bun',
    name: 'Cardamom bun',
    blurb: 'the one Tunde will not stop texting you about.',
    price: 55,
    color: '#c98a4b',
  },
  {
    id: 'olive-loaf',
    name: 'Rosemary olive loaf',
    blurb: 'a serious bread. for a woman with a balcony.',
    price: 70,
    color: '#a86b3c',
  },
]

export function getBakeryItem(id: string): BakeryItem | undefined {
  return BAKERY.find((b) => b.id === id)
}
