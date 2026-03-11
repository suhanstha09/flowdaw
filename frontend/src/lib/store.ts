import { create } from 'zustand'
import { Project, Track, MidiNote, MixerChannel } from './api'

interface DAWState {
  // Transport
  isPlaying: boolean
  isRecording: boolean
  bpm: number
  playPosition: number   // in beats
  masterVolume: number

  // Project
  currentProject: Project | null
  projects: Project[]

  // UI
  activeTab: 'sequencer' | 'piano' | 'mixer' | 'stems' | 'editor'
  selectedTrackId: string | null

  // Audio engine
  audioCtx: AudioContext | null

  // Actions
  setPlaying: (v: boolean) => void
  setRecording: (v: boolean) => void
  setBpm: (v: number) => void
  setPlayPosition: (v: number) => void
  setMasterVolume: (v: number) => void
  setActiveTab: (tab: DAWState['activeTab']) => void
  setCurrentProject: (p: Project | null) => void
  setProjects: (ps: Project[]) => void
  setSelectedTrack: (id: string | null) => void
  initAudio: () => void

  // Track mutations (optimistic UI)
  updateTrack: (id: string, patch: Partial<Track>) => void
  addTrack: (t: Track) => void
  removeTrack: (id: string) => void

  // Mixer mutations
  updateMixerChannel: (id: string, patch: Partial<MixerChannel>) => void
}

export const useDAWStore = create<DAWState>((set, get) => ({
  isPlaying: false,
  isRecording: false,
  bpm: 128,
  playPosition: 0,
  masterVolume: 0.8,
  currentProject: null,
  projects: [],
  activeTab: 'sequencer',
  selectedTrackId: null,
  audioCtx: null,

  setPlaying: (v) => set({ isPlaying: v }),
  setRecording: (v) => set({ isRecording: v }),
  setBpm: (v) => set({ bpm: v }),
  setPlayPosition: (v) => set({ playPosition: v }),
  setMasterVolume: (v) => set({ masterVolume: v }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCurrentProject: (p) => set({ currentProject: p }),
  setProjects: (ps) => set({ projects: ps }),
  setSelectedTrack: (id) => set({ selectedTrackId: id }),

  initAudio: () => {
    if (get().audioCtx) return
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    set({ audioCtx: ctx })
  },

  updateTrack: (id, patch) => set((state) => {
    if (!state.currentProject) return {}
    return {
      currentProject: {
        ...state.currentProject,
        tracks: state.currentProject.tracks.map(t =>
          t.id === id ? { ...t, ...patch } : t
        )
      }
    }
  }),

  addTrack: (t) => set((state) => {
    if (!state.currentProject) return {}
    return {
      currentProject: {
        ...state.currentProject,
        tracks: [...state.currentProject.tracks, t]
      }
    }
  }),

  removeTrack: (id) => set((state) => {
    if (!state.currentProject) return {}
    return {
      currentProject: {
        ...state.currentProject,
        tracks: state.currentProject.tracks.filter(t => t.id !== id)
      }
    }
  }),

  updateMixerChannel: (id, patch) => set((state) => {
    if (!state.currentProject) return {}
    return {
      currentProject: {
        ...state.currentProject,
        mixer_channels: state.currentProject.mixer_channels.map(c =>
          c.id === id ? { ...c, ...patch } : c
        )
      }
    }
  }),
}))
