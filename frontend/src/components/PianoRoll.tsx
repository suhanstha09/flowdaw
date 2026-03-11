'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useDAWStore } from '@/lib/store'
import { MidiNote, midiApi } from '@/lib/api'

const PIANO_KEYS = 88
const KEY_H = 14
const KEY_W = 56
const BEAT_W = 56
const TOTAL_BEATS = 16
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function isBlack(midi: number) { return [1,3,6,8,10].includes(midi % 12) }
function midiToName(midi: number) { return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1) }

export function PianoRoll() {
  const { currentProject, selectedTrackId, audioCtx, initAudio } = useDAWStore()
  const track = currentProject?.tracks.find(t => t.id === selectedTrackId) ?? currentProject?.tracks[0]
  const notes: MidiNote[] = track?.midi_notes ?? []

  const keysRef = useRef<HTMLCanvasElement>(null)
  const gridRef = useRef<HTMLCanvasElement>(null)
  const rulerRef = useRef<HTMLCanvasElement>(null)

  const drawKeys = useCallback(() => {
    const canvas = keysRef.current
    if (!canvas) return
    canvas.width = KEY_W
    canvas.height = PIANO_KEYS * KEY_H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#1a1a22'; ctx.fillRect(0, 0, KEY_W, canvas.height)
    for (let i = 0; i < PIANO_KEYS; i++) {
      const midi = 108 - i
      const y = i * KEY_H
      const black = isBlack(midi)
      ctx.fillStyle = black ? '#111' : '#e8e8e0'
      ctx.fillRect(0, y, black ? KEY_W * 0.6 : KEY_W, KEY_H - 1)
      ctx.strokeStyle = '#444'; ctx.lineWidth = 0.5
      ctx.strokeRect(0, y, black ? KEY_W * 0.6 : KEY_W, KEY_H - 1)
      if (!black && midi % 12 === 0) {
        ctx.fillStyle = '#666'
        ctx.font = '9px "Share Tech Mono"'
        ctx.fillText(midiToName(midi), KEY_W * 0.65, y + KEY_H - 3)
      }
    }
  }, [])

  const drawRuler = useCallback(() => {
    const canvas = rulerRef.current
    if (!canvas) return
    canvas.width = TOTAL_BEATS * BEAT_W
    canvas.height = 28
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#111115'; ctx.fillRect(0, 0, canvas.width, 28)
    for (let b = 0; b <= TOTAL_BEATS; b++) {
      const x = b * BEAT_W
      ctx.strokeStyle = b % 4 === 0 ? '#555' : '#333'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 28); ctx.stroke()
      if (b % 4 === 0 && b < TOTAL_BEATS) {
        ctx.fillStyle = '#aaa'; ctx.font = '11px "Barlow Condensed"'
        ctx.fillText(String(Math.floor(b / 4) + 1), x + 4, 20)
      }
    }
  }, [])

  const drawGrid = useCallback(() => {
    const canvas = gridRef.current
    if (!canvas) return
    canvas.width = TOTAL_BEATS * BEAT_W
    canvas.height = PIANO_KEYS * KEY_H
    const ctx = canvas.getContext('2d')!

    for (let i = 0; i < PIANO_KEYS; i++) {
      const midi = 108 - i
      const y = i * KEY_H
      ctx.fillStyle = isBlack(midi) ? '#1a1a24' : '#1f1f28'
      ctx.fillRect(0, y, canvas.width, KEY_H)
      if (!isBlack(midi) && midi % 12 === 0) {
        ctx.fillStyle = '#2a2a36'; ctx.fillRect(0, y, canvas.width, 1)
      }
    }

    // Beat grid
    for (let b = 0; b <= TOTAL_BEATS; b++) {
      const x = b * BEAT_W
      ctx.strokeStyle = b % 4 === 0 ? '#333' : '#222'; ctx.lineWidth = b % 4 === 0 ? 1 : 0.5
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      const sub = BEAT_W / 4
      for (let s = 1; s < 4; s++) {
        ctx.strokeStyle = '#1a1a26'; ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.moveTo(x + s * sub, 0); ctx.lineTo(x + s * sub, canvas.height); ctx.stroke()
      }
    }

    // Notes
    notes.forEach(n => {
      const i = 108 - n.midi_note
      const y = i * KEY_H + 1
      const x = n.start_beat * BEAT_W
      const w = n.duration_beats * BEAT_W - 2
      ctx.fillStyle = isBlack(n.midi_note) ? '#3090e8' : '#40c4ff'
      ctx.fillRect(x + 1, y, Math.max(2, w), KEY_H - 2)
      ctx.strokeStyle = '#80d8ff'; ctx.lineWidth = 0.5
      ctx.strokeRect(x + 1, y, Math.max(2, w), KEY_H - 2)
    })
  }, [notes])

  useEffect(() => { drawKeys() }, [drawKeys])
  useEffect(() => { drawRuler() }, [drawRuler])
  useEffect(() => { drawGrid() }, [drawGrid])

  const handleGridClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!track) return
    initAudio()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    const noteIdx = Math.floor(y / KEY_H)
    const beat = x / BEAT_W
    const midi = 108 - noteIdx

    const existing = notes.findIndex(n => n.midi_note === midi && beat >= n.start_beat && beat < n.start_beat + n.duration_beats)
    let newNotes: MidiNote[]
    if (existing >= 0) {
      newNotes = notes.filter((_, i) => i !== existing)
    } else {
      newNotes = [...notes, { midi_note: midi, start_beat: Math.floor(beat * 4) / 4, duration_beats: 0.5, velocity: 100 }]
    }

    // Optimistic update + save
    if (currentProject) {
      try { await midiApi.bulkUpdate(currentProject.id, track.id, newNotes) } catch {}
    }

    // Play note preview
    if (audioCtx) {
      audioCtx.resume()
      const osc = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      osc.connect(g); g.connect(audioCtx.destination)
      osc.type = 'triangle'
      osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
      g.gain.setValueAtTime(0.15, audioCtx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4)
      osc.start(); osc.stop(audioCtx.currentTime + 0.41)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Ruler row */}
      <div className="flex flex-shrink-0" style={{ height: 28 }}>
        <div style={{ width: KEY_W }} className="bg-[#111115] border-b border-r border-daw-border flex-shrink-0" />
        <div className="flex-1 overflow-hidden border-b border-daw-border">
          <canvas ref={rulerRef} />
        </div>
      </div>

      {/* Keys + Grid */}
      <div className="flex flex-1 overflow-hidden">
        <div style={{ width: KEY_W }} className="flex-shrink-0 overflow-hidden border-r border-daw-border">
          <canvas ref={keysRef} style={{ display: 'block' }} />
        </div>
        <div className="flex-1 overflow-auto">
          <canvas ref={gridRef} onClick={handleGridClick} className="cursor-crosshair" />
        </div>
      </div>
    </div>
  )
}
