'use client'
import { useRef, useEffect, useCallback } from 'react'
import { useDawStore } from '@/store/dawStore'

const PIANO_KEYS = 88
const KEY_H = 14
const KEY_W = 62
const BEAT_W = 60
const TOTAL_BEATS = 16
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const isBlack = (midi: number) => [1,3,6,8,10].includes(midi % 12)

export function PianoRoll() {
  const { pianoNotes, addPianoNote, removePianoNote } = useDawStore()
  const keysRef = useRef<HTMLCanvasElement>(null)
  const gridRef = useRef<HTMLCanvasElement>(null)
  const rulerRef = useRef<HTMLCanvasElement>(null)

  const drawKeys = useCallback(() => {
    const c = keysRef.current; if (!c) return
    c.width = KEY_W; c.height = PIANO_KEYS * KEY_H
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#141418'; ctx.fillRect(0,0,KEY_W,c.height)
    for (let i=0; i<PIANO_KEYS; i++) {
      const midi = 108-i; const y = i*KEY_H
      const black = isBlack(midi)
      ctx.fillStyle = black ? '#0e0e14' : '#d8d8cc'
      ctx.fillRect(0, y, black ? KEY_W*0.62 : KEY_W, KEY_H-1)
      ctx.strokeStyle = '#33333d'; ctx.lineWidth=0.5
      ctx.strokeRect(0, y, black ? KEY_W*0.62 : KEY_W, KEY_H-1)
      if (!black && midi%12===0) {
        ctx.fillStyle='#555'; ctx.font='8px Share Tech Mono'
        ctx.fillText(NOTE_NAMES[midi%12]+String(Math.floor(midi/12)-1), KEY_W*0.64, y+KEY_H-3)
      }
    }
  }, [])

  const drawRuler = useCallback(() => {
    const c = rulerRef.current; if (!c) return
    c.width = c.parentElement!.clientWidth; c.height = 28
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#111115'; ctx.fillRect(0,0,c.width,28)
    for (let b=0; b<=TOTAL_BEATS; b++) {
      const x = KEY_W + b*BEAT_W
      ctx.strokeStyle = b%4===0 ? '#555' : '#2e2e3c'; ctx.lineWidth=1
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,28); ctx.stroke()
      if (b%4===0 && b<TOTAL_BEATS) {
        ctx.fillStyle='#aaa'; ctx.font='11px Barlow Condensed'
        ctx.fillText(String(Math.floor(b/4)+1), x+4, 18)
      }
    }
  }, [])

  const drawGrid = useCallback(() => {
    const c = gridRef.current; if (!c) return
    c.width = TOTAL_BEATS*BEAT_W; c.height = PIANO_KEYS*KEY_H
    const ctx = c.getContext('2d')!
    // Rows
    for (let i=0; i<PIANO_KEYS; i++) {
      const midi=108-i; const y=i*KEY_H
      ctx.fillStyle = isBlack(midi) ? '#18181f' : '#1e1e27'
      ctx.fillRect(0, y, c.width, KEY_H)
      if (!isBlack(midi) && midi%12===0) {
        ctx.fillStyle='#26263a'; ctx.fillRect(0,y,c.width,1)
      }
    }
    // Vertical grid
    for (let b=0; b<=TOTAL_BEATS; b++) {
      ctx.strokeStyle = b%4===0 ? '#383848' : '#26262e'; ctx.lineWidth=b%4===0?1:0.5
      ctx.beginPath(); ctx.moveTo(b*BEAT_W,0); ctx.lineTo(b*BEAT_W,c.height); ctx.stroke()
      const sub=BEAT_W/4
      ctx.strokeStyle='#1e1e28'; ctx.lineWidth=0.5
      for (let s=1; s<4; s++) {
        ctx.beginPath(); ctx.moveTo(b*BEAT_W+s*sub,0); ctx.lineTo(b*BEAT_W+s*sub,c.height); ctx.stroke()
      }
    }
    // Notes
    pianoNotes.forEach(n => {
      const i = 108-n.note; const y=i*KEY_H+1
      const x = n.start*BEAT_W; const w = n.duration*BEAT_W-2
      const vel = n.velocity/127
      ctx.fillStyle = isBlack(n.note) ? `rgba(64,180,255,${vel})` : `rgba(64,196,255,${vel})`
      ctx.fillRect(x+1, y, w, KEY_H-2)
      ctx.strokeStyle='rgba(160,230,255,0.7)'; ctx.lineWidth=0.5
      ctx.strokeRect(x+1, y, w, KEY_H-2)
    })
  }, [pianoNotes])

  useEffect(() => { drawKeys(); drawRuler(); drawGrid() }, [drawKeys, drawRuler, drawGrid])

  const handleGridClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    const noteIdx = Math.floor(y / KEY_H)
    const beat = x / BEAT_W
    const midi = 108 - noteIdx
    const existing = pianoNotes.find(n => n.note===midi && beat>=n.start && beat<n.start+n.duration)
    if (existing) { removePianoNote(existing.id); return }
    addPianoNote({ note: midi, start: Math.floor(beat*4)/4, duration: 0.5, velocity: 100 })
    // Preview note
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g); g.connect(ctx.destination)
      osc.type='triangle'; osc.frequency.value=440*Math.pow(2,(midi-69)/12)
      g.gain.setValueAtTime(0.15, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.4)
      osc.start(); osc.stop(ctx.currentTime+0.41)
    } catch {}
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="h-7 bg-[#111115] border-b border-border flex-shrink-0 overflow-hidden">
        <canvas ref={rulerRef} />
      </div>
      <div className="flex flex-1 overflow-auto">
        <div className="flex-shrink-0 overflow-hidden sticky left-0 z-10">
          <canvas ref={keysRef} />
        </div>
        <div className="overflow-auto">
          <canvas ref={gridRef} onClick={handleGridClick} className="cursor-crosshair" />
        </div>
      </div>
    </div>
  )
}
