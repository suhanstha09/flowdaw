import { create } from 'zustand'

export type TrackType = 'DRUMS' | 'SYNTH' | 'AUDIO' | 'BASS'

export interface Clip {
  id: string; start: number; length: number; color: string
}
export interface Track {
  id: string; name: string; type: TrackType; color: string
  clips: Clip[]; muted: boolean; soloed: boolean; volume: number; pan: number
}
export interface PianoNote {
  id: string; note: number; start: number; duration: number; velocity: number
}
export interface MixerChannel {
  id: string; name: string; volume: number; pan: number
  muted: boolean; soloed: boolean; fx: string[]; color: string
}

interface DAWState {
  bpm: number; isPlaying: boolean; isRecording: boolean; playPosition: number
  timeSignature: [number, number]; key: string
  activeTab: 'sequencer' | 'piano' | 'mixer' | 'stem' | 'editor'
  tracks: Track[]; pianoNotes: PianoNote[]; activeTrackId: string | null
  mixerChannels: MixerChannel[]
  setBpm: (bpm: number) => void
  setPlaying: (v: boolean) => void
  setRecording: (v: boolean) => void
  setPlayPosition: (v: number) => void
  setActiveTab: (tab: DAWState['activeTab']) => void
  addTrack: (track?: Partial<Track>) => void
  updateTrack: (id: string, updates: Partial<Track>) => void
  addClip: (trackId: string, clip: Omit<Clip, 'id'>) => void
  addPianoNote: (note: Omit<PianoNote, 'id'>) => void
  removePianoNote: (id: string) => void
  updateMixerChannel: (id: string, updates: Partial<MixerChannel>) => void
}

const COLORS = ['#ff6b00','#40c4ff','#00e676','#ce93d8','#ffea00','#ff5252','#69f0ae','#ff80ab']
let tc = 5, cc = 100, nc = 100

const DEFAULT_TRACKS: Track[] = [
  { id:'t1', name:'Kick',  type:'DRUMS', color:'#ff6b00', clips:[{id:'c1',start:0,length:2,color:'#ff6b00'},{id:'c2',start:4,length:2,color:'#ff6b00'},{id:'c3',start:8,length:2,color:'#ff6b00'}], muted:false, soloed:false, volume:0.8, pan:0 },
  { id:'t2', name:'Bass',  type:'BASS',  color:'#40c4ff', clips:[{id:'c4',start:0,length:4,color:'#40c4ff'},{id:'c5',start:8,length:4,color:'#40c4ff'}], muted:false, soloed:false, volume:0.7, pan:-0.1 },
  { id:'t3', name:'Lead',  type:'SYNTH', color:'#00e676', clips:[{id:'c6',start:4,length:4,color:'#00e676'},{id:'c7',start:12,length:2,color:'#00e676'}], muted:false, soloed:false, volume:0.75, pan:0.2 },
  { id:'t4', name:'Pad',   type:'SYNTH', color:'#ce93d8', clips:[{id:'c8',start:0,length:8,color:'#ce93d8'}], muted:false, soloed:false, volume:0.6, pan:0 },
]
const DEFAULT_NOTES: PianoNote[] = [
  {id:'n1',note:60,start:0,duration:1,velocity:100},{id:'n2',note:62,start:1,duration:0.5,velocity:90},
  {id:'n3',note:64,start:2,duration:1,velocity:95},{id:'n4',note:65,start:3,duration:0.5,velocity:85},
  {id:'n5',note:67,start:4,duration:2,velocity:100},{id:'n6',note:64,start:6,duration:1,velocity:88},
  {id:'n7',note:62,start:7,duration:1,velocity:92},{id:'n8',note:60,start:8,duration:2,velocity:100},
]
const DEFAULT_CHANNELS: MixerChannel[] = [
  {id:'master',name:'Master',volume:0.8,pan:0,muted:false,soloed:false,fx:['Limiter','EQ'],color:'#ff6b00'},
  {id:'ch1',name:'Kick', volume:0.8, pan:0,   muted:false,soloed:false,fx:['Compressor'],color:'#ff6b00'},
  {id:'ch2',name:'Bass', volume:0.7, pan:-0.2,muted:false,soloed:false,fx:['EQ'],color:'#40c4ff'},
  {id:'ch3',name:'Lead', volume:0.75,pan:0.3, muted:false,soloed:false,fx:['Reverb','Delay'],color:'#00e676'},
  {id:'ch4',name:'Pad',  volume:0.6, pan:0,   muted:false,soloed:false,fx:['Reverb'],color:'#ce93d8'},
  {id:'sa', name:'Send A',volume:0.5,pan:0,   muted:false,soloed:false,fx:['Reverb'],color:'#888899'},
  {id:'sb', name:'Send B',volume:0.5,pan:0,   muted:false,soloed:false,fx:['Delay'],color:'#888899'},
]

export const useDawStore = create<DAWState>((set) => ({
  bpm:128, isPlaying:false, isRecording:false, playPosition:0,
  timeSignature:[4,4], key:'C Maj', activeTab:'sequencer',
  tracks:DEFAULT_TRACKS, pianoNotes:DEFAULT_NOTES, activeTrackId:'t1',
  mixerChannels:DEFAULT_CHANNELS,
  setBpm:(bpm)=>set({bpm}),
  setPlaying:(isPlaying)=>set({isPlaying}),
  setRecording:(isRecording)=>set({isRecording}),
  setPlayPosition:(playPosition)=>set({playPosition}),
  setActiveTab:(activeTab)=>set({activeTab}),
  addTrack:(partial={})=>set((s)=>{
    const idx=s.tracks.length
    const t:Track={id:`t${tc++}`,name:'Track',type:'SYNTH',color:COLORS[idx%COLORS.length],clips:[],muted:false,soloed:false,volume:0.75,pan:0,...partial}
    return{tracks:[...s.tracks,t]}
  }),
  updateTrack:(id,u)=>set((s)=>({tracks:s.tracks.map(t=>t.id===id?{...t,...u}:t)})),
  addClip:(trackId,clip)=>set((s)=>({
    tracks:s.tracks.map(t=>t.id===trackId?{...t,clips:[...t.clips,{...clip,id:`c${cc++}`}]}:t)
  })),
  addPianoNote:(note)=>set((s)=>({pianoNotes:[...s.pianoNotes,{...note,id:`n${nc++}`}]})),
  removePianoNote:(id)=>set((s)=>({pianoNotes:s.pianoNotes.filter(n=>n.id!==id)})),
  updateMixerChannel:(id,u)=>set((s)=>({mixerChannels:s.mixerChannels.map(c=>c.id===id?{...c,...u}:c)})),
}))
