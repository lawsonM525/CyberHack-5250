import { create } from 'zustand'

/** Transient UI state kept out of the save store so the 3D tree never re-renders for it. */
interface UiState {
  focus: string | null
  fps: number
  setFocus: (id: string | null) => void
  setFps: (v: number) => void
}

export const useUi = create<UiState>((set) => ({
  focus: null,
  fps: 0,
  setFocus: (focus) => set({ focus }),
  setFps: (fps) => set({ fps }),
}))
