'use client'
import { useDAWStore } from '@/lib/store'
import { useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Square, Circle, SkipBack } from 'lucide-react'

function formatPosition(beats: number, bpm: number): string {
  const bar = Math.floor(beats / 4) + 1
  const beat = Math.floor(beats % 4) + 1
  const tick = Math.floor((beats % 1) * 1000)
  return `${bar}:0${beat}:${String(tick).padStart(3, '0')}`
}

export function TransportBar() {
  const {
    isPlaying, isRecording, bpm, playPosition, masterVolume,
    setPlaying, setRecording, setBpm, setPlayPosition, setMasterVolume,
    initAudio, audioCtx,
  } = useDAWStore()

  const rafRef = useRef<number>()
  const startTimeRef = useRef<number>(0)
  const startBeatRef = useRef<number>(0)

  const tick = useCallback(() => {
    if (!audioCtx || !isPlaying) return
    const elapsed = audioCtx.currentTime - startTimeRef.current
    const pos = startBeatRef.current + elapsed * (bpm / 60)
    setPlayPosition(pos)
    rafRef.current = requestAnimationFrame(tick)
  }, [audioCtx, isPlaying, bpm, setPlayPosition])

  useEffect(() => {
    if (isPlaying && audioCtx) {
      startTimeRef.current = audioCtx.currentTime
      startBeatRef.current = playPosition
      rafRef.current = requestAnimationFrame(tick)
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isPlaying])

  const handlePlay = () => {
    initAudio()
    audioCtx?.resume()
    setPlaying(!isPlaying)
  }

  const handleStop = () => {
    setPlaying(false)
    setPlayPosition(0)
  }

  // BPM drag
  const bpmDragRef = useRef<{ startY: number; startVal: number } | null>(null)
  const onBpmDown = (e: React.MouseEvent) => {
    bpmDragRef.current = { startY: e.clientY, startVal: bpm }
    const onMove = (ev: MouseEvent) => {
      if (!bpmDragRef.current) return
      const delta = Math.round((bpmDragRef.current.startY - ev.clientY) * 0.5)
      setBpm(Math.max(40, Math.min(300, bpmDragRef.current.startVal + delta)))
    }
    const onUp = () => {
      bpmDragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="flex items-center gap-4 px-4 h-[52px] bg-[#18181c] border-b-2 border-daw-border flex-shrink-0">
      {/* Transport buttons */}
      <div className="flex gap-1">
        <button
          onClick={() => { setPlaying(false); setPlayPosition(0) }}
          className="w-8 h-8 rounded flex items-center justify-center bg-daw-raised border border-daw-border text-daw-muted hover:text-daw-text hover:bg-daw-hover transition-all"
        >
          <SkipBack size={13} />
        </button>
        <button
          onClick={handlePlay}
          className={`w-8 h-8 rounded flex items-center justify-center border transition-all ${
            isPlaying
              ? 'bg-daw-accent border-daw-accent2 text-white shadow-[0_0_10px_#7a3300]'
              : 'bg-daw-raised border-daw-border text-daw-muted hover:text-daw-text hover:bg-daw-hover'
          }`}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button
          onClick={handleStop}
          className="w-8 h-8 rounded flex items-center justify-center bg-daw-raised border border-daw-border text-daw-muted hover:text-daw-text hover:bg-daw-hover transition-all"
        >
          <Square size={13} />
        </button>
        <button
          onClick={() => setRecording(!isRecording)}
          className={`w-8 h-8 rounded flex items-center justify-center border transition-all ${
            isRecording
              ? 'bg-daw-red border-red-400 text-white shadow-[0_0_10px_#7a0000]'
              : 'bg-daw-raised border-daw-border text-daw-muted hover:text-daw-text hover:bg-daw-hover'
          }`}
        >
          <Circle size={13} />
        </button>
      </div>

      <div className="w-px h-8 bg-daw-border" />

      {/* Position */}
      <div className="font-mono text-xl text-daw-green bg-[#0e0e12] border border-daw-border rounded px-3 py-1 tracking-widest select-none">
        {formatPosition(playPosition, bpm)}
      </div>

      {/* BPM */}
      <div className="flex flex-col items-center bg-[#0e0e12] border border-daw-border rounded px-3 py-1 min-w-[64px]">
        <span className="text-[9px] text-daw-muted tracking-widest uppercase">BPM</span>
        <span
          className="font-mono text-xl text-daw-accent leading-none cursor-ns-resize select-none"
          onMouseDown={onBpmDown}
        >
          {bpm}
        </span>
      </div>

      <div className="w-px h-8 bg-daw-border" />

      {/* Master volume */}
      <div className="flex flex-col gap-1">
        <label className="text-[9px] text-daw-muted tracking-widest uppercase">Master</label>
        <input
          type="range" min={0} max={100} value={Math.round(masterVolume * 100)}
          onChange={e => setMasterVolume(Number(e.target.value) / 100)}
          className="w-20"
        />
      </div>

      <div className="w-px h-8 bg-daw-border" />

      <div className="text-xs text-daw-muted">
        Key: <span className="text-daw-text font-semibold">C Maj</span>
        <span className="mx-2">·</span>
        Sig: <span className="text-daw-text font-semibold">4/4</span>
      </div>
    </div>
  )
}
