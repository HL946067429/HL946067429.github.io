import { create } from 'zustand'
import type { AnimationSegment } from '@/types'

interface AnimationState {
  isPlaying: boolean
  progress: number
  speed: number
  segments: AnimationSegment[]
  currentSegmentIndex: number
  tripId: number | null

  setPlaying: (playing: boolean) => void
  setProgress: (progress: number) => void
  setSpeed: (speed: number) => void
  setSegments: (segments: AnimationSegment[]) => void
  setCurrentSegmentIndex: (index: number) => void
  setTripId: (id: number | null) => void
  reset: () => void
}

export const useAnimationStore = create<AnimationState>()((set) => ({
  isPlaying: false,
  progress: 0,
  speed: 1,
  segments: [],
  currentSegmentIndex: 0,
  tripId: null,

  setPlaying: (playing) => set({ isPlaying: playing }),
  setProgress: (progress) => set({ progress }),
  setSpeed: (speed) => set({ speed }),
  setSegments: (segments) => set({ segments }),
  setCurrentSegmentIndex: (index) => set({ currentSegmentIndex: index }),
  setTripId: (id) => set({ tripId: id }),
  reset: () =>
    set({
      isPlaying: false,
      progress: 0,
      speed: 1,
      segments: [],
      currentSegmentIndex: 0,
      tripId: null,
    }),
}))
