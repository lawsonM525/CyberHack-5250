import { create } from 'zustand'

export interface RenderInfo {
  width: number
  height: number
  cssWidth: number
  cssHeight: number
  samples: number
}

/** Transient UI state kept out of the save store so the 3D tree never re-renders for it. */
interface UiState {
  focus: string | null
  fps: number
  render: RenderInfo | null
  setFocus: (id: string | null) => void
  setFps: (v: number) => void
  setRenderInfo: (v: RenderInfo) => void
}

export const useUi = create<UiState>((set) => ({
  focus: null,
  fps: 0,
  render: null,
  setFocus: (focus) => set({ focus }),
  setFps: (fps) => set({ fps }),
  setRenderInfo: (render) => set({ render }),
}))
