'use client'
import { useRef, useEffect, useCallback } from 'react'
import { useDawStore } from '@/store/dawStore'

const TRACK_H = 64
const BEAT_W = 42
const TOTAL_BEATS = 32

export function Sequencer() {
  const { tracks, playPosition, isPlaying, addTrack, updateTrack, addClip } = useDawStore()
  const rulerRef = useRef<HTMLCanvasElement>(null)
  const tracksRef = useRef<HTMLCanvasElement>(null)

  const drawRuler = useCallback(() => {
    const c = rulerRef.current; if (!c) return
    c.width = c.parentElement!.clientWidth; c.height = 32
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#111115'; ctx.fillRect(0,0,c.width,32)
    for (let b = 0; b <= TOTAL_BEATS; b++) {
      const x = b * BEAT_W; if (x > c.width) break
      ctx.strokeStyle = b%4===0 ? '#555566' : '#2a2a36'; ctx.lineWidth=1
      ctx.beginPath(); ctx.moveTo(x, b%4===0 ? 0 : 18); ctx.lineTo(x, 32); ctx.stroke()
      if (b%4===0 && b < TOTAL_BEATS) {
        ctx.fillStyle='#aaaaaa'; ctx.font='11px Barlow Condensed'
        ctx.fillText(String(Math.floor(b/4)+1), x+4, 16)
      }
    }
  }, [])

  const drawTracks = useCallback(() => {
    const c = tracksRef.current; if (!c) return
    c.width = Math.max((c.parentElement?.clientWidth||800), TOTAL_BEATS * BEAT_W)
    c.height = tracks.length * TRACK_H
    const ctx = c.getContext('2d')!
    ctx.clearRect(0,0,c.width,c.height)

    tracks.forEach((track, ti) => {
      const y = ti * TRACK_H
      ctx.fillStyle = ti%2===0 ? '#1e1e24' : '#1a1a20'
      ctx.fillRect(0, y, c.width, TRACK_H)
      // Beat grid
      for (let b = 0; b <= TOTAL_BEATS; b++) {
        ctx.strokeStyle = b%4===0 ? '#2e2e3c' : '#22222e'; ctx.lineWidth=b%4===0?1:0.5
        ctx.beginPath(); ctx.moveTo(b*BEAT_W, y); ctx.lineTo(b*BEAT_W, y+TRACK_H); ctx.stroke()
      }
      // Clips
      track.clips.forEach(clip => {
        const alpha = track.muted ? 0.25 : 0.88
        const hex = Math.round(alpha*255).toString(16).padStart(2,'0')
        ctx.fillStyle = clip.color + hex
        ctx.fillRect(clip.start*BEAT_W+1, y+6, clip.length*BEAT_W-2, TRACK_H-12)
        ctx.strokeStyle = clip.color; ctx.lineWidth=1
        ctx.strokeRect(clip.start*BEAT_W+1, y+6, clip.length*BEAT_W-2, TRACK_H-12)
        // Mini waveform
        ctx.strokeStyle = clip.color + 'aa'; ctx.lineWidth=1
        ctx.beginPath()
        const cw = clip.length*BEAT_W-4
        for (let px=0; px<cw; px++) {
          const wv = Math.sin((px/cw*18+ti*2.5)*Math.PI)*0.38+Math.sin(px/cw*45*Math.PI)*0.22
          const wy = y+TRACK_H/2+wv*(TRACK_H/2-14)
          px===0 ? ctx.moveTo(clip.start*BEAT_W+2+px,wy) : ctx.lineTo(clip.start*BEAT_W+2+px,wy)
        }
        ctx.stroke()
      })
      // Track bottom border
      ctx.strokeStyle='#2d2d3a'; ctx.lineWidth=1
      ctx.beginPath(); ctx.moveTo(0,y+TRACK_H-1); ctx.lineTo(c.width,y+TRACK_H-1); ctx.stroke()
    })

    // Playhead
    if (playPosition > 0 || isPlaying) {
      const px = playPosition * BEAT_W
      ctx.strokeStyle='#ff6b00'; ctx.lineWidth=2
      ctx.shadowColor='#ff6b00'; ctx.shadowBlur=8
      ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,c.height); ctx.stroke()
      ctx.shadowBlur=0
    }
  }, [tracks, playPosition, isPlaying])

  useEffect(() => { drawRuler(); drawTracks() }, [drawRuler, drawTracks])
  useEffect(() => {
    const handleResize = () => { drawRuler(); drawTracks() }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawRuler, drawTracks])

  const handleTrackClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    const trackIdx = Math.floor(y / TRACK_H)
    const beat = Math.floor(x / BEAT_W)
    if (trackIdx < 0 || trackIdx >= tracks.length) return
    const track = tracks[trackIdx]
    addClip(track.id, { start: beat, length: 2, color: track.color })
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Track Headers */}
      <div className="w-[180px] flex-shrink-0 bg-panel border-r border-border flex flex-col">
        <div className="h-8 bg-[#111115] border-b border-border flex items-center px-3 text-[11px] text-text-dim uppercase tracking-widest">
          Tracks
        </div>
        <div className="flex-1 overflow-y-auto">
          {tracks.map((track) => (
            <div key={track.id} className="h-16 border-b border-border flex items-center px-2 gap-2">
              <div className="w-[3px] h-10 rounded-full flex-shrink-0" style={{ background: track.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate">{track.name}</div>
                <div className="text-[10px] text-text-dim uppercase tracking-wider">{track.type}</div>
              </div>
              <div className="flex gap-1">
                <button
                  className={`w-5 h-5 text-[9px] font-bold rounded border transition-all ${track.muted ? 'bg-daw-yellow border-daw-yellow text-black' : 'bg-raised border-border text-text-dim hover:text-text'}`}
                  onClick={() => updateTrack(track.id, { muted: !track.muted })}>M</button>
                <button
                  className={`w-5 h-5 text-[9px] font-bold rounded border transition-all ${track.soloed ? 'bg-daw-green border-daw-green text-black' : 'bg-raised border-border text-text-dim hover:text-text'}`}
                  onClick={() => updateTrack(track.id, { soloed: !track.soloed })}>S</button>
              </div>
            </div>
          ))}
          <div className="p-2">
            <button
              onClick={() => addTrack()}
              className="w-full text-[11px] font-semibold uppercase tracking-wider py-1.5 px-3 rounded border border-border bg-raised hover:bg-hover text-text-dim hover:text-text transition-all">
              + Add Track
            </button>
          </div>
        </div>
      </div>

      {/* Sequencer Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="h-8 bg-[#111115] border-b border-border flex-shrink-0 overflow-hidden">
          <canvas ref={rulerRef} />
        </div>
        <div className="flex-1 overflow-auto">
          <canvas ref={tracksRef} onClick={handleTrackClick} className="cursor-pointer" />
        </div>
      </div>
    </div>
  )
}
