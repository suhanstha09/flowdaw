'use client'
import { useEffect, useRef, useState } from 'react'
import { useDAWStore } from '@/lib/store'
import { tracksApi, Track } from '@/lib/api'
import { Plus, Volume2, VolumeX, Headphones } from 'lucide-react'
import toast from 'react-hot-toast'

const TRACK_H = 64
const BEAT_W = 40
const BEATS = 32
const TRACK_COLORS = ['#ff6b00','#40c4ff','#00e676','#ce93d8','#ffea00','#ff5252','#69f0ae','#ff80ab']

export function Sequencer() {
  const { currentProject, playPosition, isPlaying, updateTrack, addTrack } = useDAWStore()
  const rulerRef = useRef<HTMLCanvasElement>(null)
  const tracksRef = useRef<HTMLCanvasElement>(null)
  const tracksWrapRef = useRef<HTMLDivElement>(null)
  const tracks = currentProject?.tracks ?? []

  // Draw ruler
  useEffect(() => {
    const canvas = rulerRef.current
    if (!canvas) return
    const wrap = canvas.parentElement!
    canvas.width = wrap.clientWidth
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#111115'
    ctx.fillRect(0, 0, canvas.width, 32)
    ctx.font = '10px "Barlow Condensed"'
    for (let b = 0; b <= BEATS; b++) {
      const x = b * BEAT_W
      if (x > canvas.width) break
      ctx.strokeStyle = b % 4 === 0 ? '#555' : '#333'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, b % 4 === 0 ? 0 : 18); ctx.lineTo(x, 32); ctx.stroke()
      if (b % 4 === 0) {
        ctx.fillStyle = '#aaa'
        ctx.fillText(String(Math.floor(b / 4) + 1), x + 3, 14)
      }
    }
  }, [])

  // Draw tracks
  useEffect(() => {
    const canvas = tracksRef.current
    if (!canvas) return
    const wrap = tracksWrapRef.current!
    canvas.width = Math.max(wrap.clientWidth, BEATS * BEAT_W)
    canvas.height = Math.max(tracks.length * TRACK_H, wrap.clientHeight)
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    tracks.forEach((track, ti) => {
      const y = ti * TRACK_H
      ctx.fillStyle = ti % 2 === 0 ? '#1e1e23' : '#1a1a20'
      ctx.fillRect(0, y, canvas.width, TRACK_H)

      // grid
      for (let b = 0; b <= BEATS; b++) {
        ctx.strokeStyle = b % 4 === 0 ? '#2e2e3a' : '#22222c'
        ctx.lineWidth = b % 4 === 0 ? 1 : 0.5
        ctx.beginPath(); ctx.moveTo(b * BEAT_W, y); ctx.lineTo(b * BEAT_W, y + TRACK_H); ctx.stroke()
      }

      // clips
      track.clips?.forEach(clip => {
        const cx = clip.start_beat * BEAT_W
        const cw = clip.duration_beats * BEAT_W
        const alpha = track.muted ? 0.25 : 0.85
        ctx.globalAlpha = alpha
        ctx.fillStyle = track.color + '55'
        ctx.fillRect(cx + 1, y + 6, cw - 2, TRACK_H - 12)
        ctx.strokeStyle = track.color
        ctx.lineWidth = 1
        ctx.strokeRect(cx + 1, y + 6, cw - 2, TRACK_H - 12)
        // mini waveform
        ctx.strokeStyle = track.color + 'cc'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let px = 0; px < cw - 4; px++) {
          const wv = Math.sin((px / cw * 20 + ti * 3) * Math.PI) * 0.35 + Math.sin(px / cw * 50 * Math.PI) * 0.25
          const wy = y + TRACK_H / 2 + wv * (TRACK_H / 2 - 14)
          px === 0 ? ctx.moveTo(cx + 2 + px, wy) : ctx.lineTo(cx + 2 + px, wy)
        }
        ctx.stroke()
        ctx.globalAlpha = 1
      })

      // track separator
      ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, y + TRACK_H - 1); ctx.lineTo(canvas.width, y + TRACK_H - 1); ctx.stroke()
    })

    // playhead
    const px = playPosition * BEAT_W
    if (px <= canvas.width) {
      ctx.strokeStyle = '#ff6b00'; ctx.lineWidth = 2
      ctx.shadowColor = '#ff6b00'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, canvas.height); ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [tracks, playPosition])

  const handleTracksClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentProject) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const trackIdx = Math.floor(y / TRACK_H)
    const beat = Math.floor(x / BEAT_W)
    if (trackIdx < 0 || trackIdx >= tracks.length) return
    // Add clip
    const track = tracks[trackIdx]
    const newClip = { id: crypto.randomUUID(), track: track.id, start_beat: beat, duration_beats: 2, name: 'Clip' }
    updateTrack(track.id, { clips: [...(track.clips ?? []), newClip] })
  }

  const handleAddTrack = async () => {
    if (!currentProject) return
    const names = ['Synth', 'Drums', 'Bass', 'Lead', 'Pad', 'FX']
    const types = ['synth', 'drums', 'synth', 'synth', 'synth', 'audio'] as const
    const idx = tracks.length % names.length
    try {
      const res = await tracksApi.create(currentProject.id, {
        name: names[idx],
        track_type: types[idx],
        color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
        volume: 0.8, pan: 0, muted: false, soloed: false,
      })
      addTrack(res.data)
    } catch {
      // Offline mode: add locally
      addTrack({
        id: crypto.randomUUID(), project: currentProject.id,
        name: names[idx], track_type: types[idx],
        color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
        volume: 0.8, pan: 0, muted: false, soloed: false,
        order: tracks.length, clips: [], midi_notes: [],
      })
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Track headers */}
      <div className="w-44 flex-shrink-0 bg-daw-panel border-r border-daw-border flex flex-col overflow-hidden">
        <div className="h-8 bg-[#111115] border-b border-daw-border flex items-center px-3">
          <span className="text-[10px] text-daw-muted tracking-widest uppercase">Tracks</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tracks.map((track) => (
            <TrackHeader key={track.id} track={track} />
          ))}
        </div>
        <div className="p-2 border-t border-daw-border">
          <button
            onClick={handleAddTrack}
            className="flex items-center gap-1 text-xs text-daw-muted hover:text-daw-accent transition-colors px-2 py-1 rounded hover:bg-daw-hover w-full"
          >
            <Plus size={12} /> Add Track
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="h-8 flex-shrink-0 relative overflow-hidden">
          <canvas ref={rulerRef} />
        </div>
        <div ref={tracksWrapRef} className="flex-1 overflow-auto">
          <canvas ref={tracksRef} onClick={handleTracksClick} className="cursor-crosshair" />
        </div>
      </div>
    </div>
  )
}

function TrackHeader({ track }: { track: Track }) {
  const { updateTrack, currentProject } = useDAWStore()

  const toggle = async (field: 'muted' | 'soloed') => {
    const val = !track[field]
    updateTrack(track.id, { [field]: val })
    if (currentProject) {
      try { await tracksApi.update(currentProject.id, track.id, { [field]: val }) } catch {}
    }
  }

  return (
    <div className="h-16 border-b border-daw-border flex items-center gap-2 px-2">
      <div className="w-1 h-10 rounded-sm flex-shrink-0" style={{ background: track.color }} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">{track.name}</div>
        <div className="text-[10px] text-daw-muted uppercase tracking-wide">{track.track_type}</div>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => toggle('muted')}
          className={`w-5 h-5 rounded text-[10px] font-bold border flex items-center justify-center transition-all ${
            track.muted ? 'bg-daw-yellow text-black border-daw-yellow' : 'bg-daw-raised border-daw-border text-daw-muted hover:text-daw-text'
          }`}
        >
          M
        </button>
        <button
          onClick={() => toggle('soloed')}
          className={`w-5 h-5 rounded text-[10px] font-bold border flex items-center justify-center transition-all ${
            track.soloed ? 'bg-daw-green text-black border-daw-green' : 'bg-daw-raised border-daw-border text-daw-muted hover:text-daw-text'
          }`}
        >
          S
        </button>
      </div>
    </div>
  )
}
