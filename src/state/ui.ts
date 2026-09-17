import { create } from 'zustand'

export interface RenderInfo {
  width: number
  height: number
  cssWidth: number
  cssHeight: number
  samples: number
  calls: number
  triangles: number
}

/** Transient UI state kept out of the save store so the 3D tree never re-renders for it. */
interface UiState {
  focus: string | null
  fps: number
  render: RenderInfo | null
  /** When a panel last closed, so friends do not text over a clue she just read. */
  overlayClosedAt: number
  markOverlayClosed: () => void
  setFocus: (id: string | null) => void
  setFps: (v: number) => void
  setRenderInfo: (v: RenderInfo) => void
}

export const useUi = create<UiState>((set) => ({
  focus: null,
  fps: 0,
  render: null,
  overlayClosedAt: 0,
  markOverlayClosed: () => set({ overlayClosedAt: Date.now() }),
  setFocus: (focus) => set({ focus }),
  setFps: (fps) => set({ fps }),
  setRenderInfo: (render) => set({ render }),
}))
