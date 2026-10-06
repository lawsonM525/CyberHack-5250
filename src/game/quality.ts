import { useGame } from '../state/store'

/** Decorative lights and extra geometry are dropped on the low tier. */
export function useLowQuality() {
  return useGame((s) => s.settings.quality === 'low')
}
