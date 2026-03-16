'use client'
import { useRef, useEffect, useCallback } from 'react'
import { useDawStore } from '@/store/dawStore'

const TRACK_H   = 56
const BEAT_W    = 40
const TOTAL_BEATS = 32
const HEADER_W  = 160

export function Sequencer() {
  const { tracks, playPosition, isPlaying, addTrack, updateTrack, addClip } = useDawStore()
  const rulerRef  = useRef<HTMLCanvasElement>(null)
  const tracksRef = useRef<HTMLCanvasElement>(null)

  const drawRuler = useCallback(() => {
    const c = rulerRef.current; if (!c) return
    c.width = c.parentElement!.clientWidth; c.height = 26
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, c.width, 26)
    for (let b = 0; b <= TOTAL_BEATS; b++) {
      const x = b * BEAT_W; if (x > c.width) break
      const isBar = b % 4 === 0
      ctx.strokeStyle = isBar ? '#555555' : '#2a2a2a'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, isBar ? 0 : 14); ctx.lineTo(x, 26); ctx.stroke()
      if (isBar && b < TOTAL_BEATS) {
        ctx.fillStyle = '#aaaaaa'; ctx.font = '10px "Segoe UI"'
        ctx.fillText(String(Math.floor(b / 4) + 1), x + 3, 14)
      }
    }
    // Playhead on ruler
    const px = playPosition * BEAT_W
    if (px >= 0 && px <= c.width) {
      ctx.fillStyle = '#ff6a00'
      ctx.fillRect(px - 4, 0, 8, 6) // triangle indicator
      ctx.strokeStyle = '#ff6a00'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(px, 6); ctx.lineTo(px, 26); ctx.stroke()
    }
  }, [playPosition])

  const drawTracks = useCallback(() => {
    const c = tracksRef.current; if (!c) return
    c.width  = Math.max((c.parentElement?.clientWidth || 800), TOTAL_BEATS * BEAT_W)
    c.height = Math.max(tracks.length * TRACK_H, 10)
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)

    tracks.forEach((track, ti) => {
      const y = ti * TRACK_H
      // Alternating row colors
      ctx.fillStyle = ti % 2 === 0 ? '#222222' : '#1e1e1e'
      ctx.fillRect(0, y, c.width, TRACK_H)

      // Beat grid lines
      for (let b = 0; b <= TOTAL_BEATS; b++) {
        const isBar = b % 4 === 0
        ctx.strokeStyle = isBar ? '#333333' : '#2a2a2a'
        ctx.lineWidth = isBar ? 1 : 0.5
        ctx.beginPath(); ctx.moveTo(b * BEAT_W, y); ctx.lineTo(b * BEAT_W, y + TRACK_H); ctx.stroke()
      }

      // Clips
      track.clips.forEach(clip => {
        const alpha = track.muted ? 0.22 : 0.85
        const hexA  = Math.round(alpha * 255).toString(16).padStart(2, '0')
        const cx0   = clip.start * BEAT_W + 1
        const cy0   = y + 4
        const cw    = clip.length * BEAT_W - 2
        const ch    = TRACK_H - 8

        ctx.fillStyle = clip.color + hexA
        ctx.fillRect(cx0, cy0, cw, ch)
        ctx.strokeStyle = clip.color; ctx.lineWidth = 1
        ctx.strokeRect(cx0, cy0, cw, ch)

        // Mini waveform inside clip
        ctx.strokeStyle = clip.color + 'cc'; ctx.lineWidth = 1
        ctx.beginPath()
        for (let px = 0; px < cw; px++) {
          const wv = Math.sin((px / cw * 16 + ti * 2.1) * Math.PI) * 0.38
                   + Math.sin(px / cw * 40 * Math.PI) * 0.18
          const wy = cy0 + ch / 2 + wv * (ch / 2 - 4)
          px === 0 ? ctx.moveTo(cx0 + px, wy) : ctx.lineTo(cx0 + px, wy)
        }
        ctx.stroke()
      })

      // Row bottom border
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, y + TRACK_H - 1); ctx.lineTo(c.width, y + TRACK_H - 1); ctx.stroke()
    })

    // Orange playhead
    if (playPosition > 0 || isPlaying) {
      const px = playPosition * BEAT_W
      ctx.strokeStyle = '#ff6a00'; ctx.lineWidth = 2
      ctx.shadowColor  = '#ff6a00'; ctx.shadowBlur = 6
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, c.height); ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [tracks, playPosition, isPlaying])

  useEffect(() => { drawRuler(); drawTracks() }, [drawRuler, drawTracks])
  useEffect(() => {
    const onResize = () => { drawRuler(); drawTracks() }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [drawRuler, drawTracks])

  const handleTrackClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    const trackIdx = Math.floor(y / TRACK_H)
    const beat     = Math.floor(x / BEAT_W)
    if (trackIdx < 0 || trackIdx >= tracks.length) return
    const track = tracks[trackIdx]
    addClip(track.id, { start: beat, length: 2, color: track.color })
  }

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: '#1a1a1a' }}>

      {/* Track Headers */}
      <div
        className="flex-shrink-0 flex flex-col overflow-y-auto"
        style={{
          width: HEADER_W,
          background: '#1e1e1e',
          borderRight: '1px solid #0d0d0d',
        }}
      >
        {/* Ruler spacer */}
        <div style={{
          height: 26,
          background: '#111111',
          borderBottom: '1px solid #0d0d0d',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', color: '#555', letterSpacing: '0.14em' }}>Tracks</span>
        </div>

        {tracks.map((track, i) => (
          <div
            key={track.id}
            style={{
              height: TRACK_H,
              background: i % 2 === 0 ? '#222222' : '#1e1e1e',
              borderBottom: '1px solid #0d0d0d',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 6,
              paddingRight: 4,
              gap: 4,
              flexShrink: 0,
            }}
          >
            {/* Color/mute LED */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: track.muted ? '#333333' : track.color,
                boxShadow: track.muted ? 'none' : `0 0 5px ${track.color}88`,
                flexShrink: 0,
                cursor: 'pointer',
              }}
              onClick={() => updateTrack(track.id, { muted: !track.muted })}
            />

            {/* Track name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#e0e0e0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {track.name}
              </div>
              <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {track.type}
              </div>
            </div>

            {/* M / S buttons */}
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <button
                onClick={() => updateTrack(track.id, { muted: !track.muted })}
                style={{
                  width: 16, height: 16,
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  background: track.muted ? '#ffea00' : '#2e2e2e',
                  color: track.muted ? '#000' : '#888',
                  border: `1px solid ${track.muted ? '#ccbb00' : '#0d0d0d'}`,
                  borderRadius: 1,
                }}
              >M</button>
              <button
                onClick={() => updateTrack(track.id, { soloed: !track.soloed })}
                style={{
                  width: 16, height: 16,
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  background: track.soloed ? '#00e676' : '#2e2e2e',
                  color: track.soloed ? '#000' : '#888',
                  border: `1px solid ${track.soloed ? '#00aa55' : '#0d0d0d'}`,
                  borderRadius: 1,
                }}
              >S</button>
            </div>
          </div>
        ))}

        {/* Add track button */}
        <div style={{ padding: 6 }}>
          <button
            onClick={() => addTrack()}
            style={{
              width: '100%',
              height: 22,
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              background: '#2e2e2e',
              color: '#ff6a00',
              border: '1px solid #0d0d0d',
              borderBottom: '1px solid #444',
              borderRight: '1px solid #444',
              borderRadius: 1,
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Ruler + Canvas grid */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div style={{ height: 26, background: '#111111', borderBottom: '1px solid #0d0d0d', flexShrink: 0, overflow: 'hidden' }}>
          <canvas ref={rulerRef} />
        </div>
        <div className="flex-1 overflow-auto">
          <canvas ref={tracksRef} onClick={handleTrackClick} style={{ cursor: 'crosshair', display: 'block' }} />
        </div>
      </div>
    </div>
  )
}
