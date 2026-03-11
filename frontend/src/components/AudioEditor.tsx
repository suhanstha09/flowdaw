'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { audioApi, AudioEffect } from '@/lib/api'
import { Upload, ZoomIn, ZoomOut, Download, RotateCcw, RotateCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface WaveformData {
  mins: number[]
  maxs: number[]
  duration: number
  samplerate: number
  channels: number
  file_id: string
  url: string
  filename?: string
}

export function AudioEditor() {
  const [waveData, setWaveData] = useState<WaveformData | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState(0)
  const [selStart, setSelStart] = useState<number | null>(null)
  const [selEnd, setSelEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeEffect, setActiveEffect] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timelineRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentFileRef = useRef<string | null>(null)

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    canvas.width = wrap.clientWidth
    canvas.height = wrap.clientHeight
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    ctx.fillStyle = '#111115'
    ctx.fillRect(0, 0, W, H)

    if (!waveData) return

    const totalPts = waveData.mins.length
    const visiblePts = Math.floor(totalPts / zoom)
    const startPt = Math.floor(offset * totalPts)
    const endPt = Math.min(totalPts, startPt + visiblePts)

    // Grid
    ctx.strokeStyle = '#1e1e28'; ctx.lineWidth = 1
    for (let i = 0; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(0, (i / 8) * H); ctx.lineTo(W, (i / 8) * H); ctx.stroke()
    }
    for (let i = 0; i < 16; i++) {
      ctx.beginPath(); ctx.moveTo((i / 16) * W, 0); ctx.lineTo((i / 16) * W, H); ctx.stroke()
    }

    // Zero line
    ctx.strokeStyle = '#2a2a3a'
    ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke()

    // Selection
    if (selStart !== null && selEnd !== null) {
      const sxPct = (selStart - startPt) / visiblePts
      const exPct = (selEnd - startPt) / visiblePts
      ctx.fillStyle = 'rgba(64,196,255,0.12)'
      ctx.strokeStyle = '#40c4ff'
      ctx.lineWidth = 1
      const sx = Math.min(sxPct, exPct) * W
      const ew = Math.abs(exPct - sxPct) * W
      ctx.fillRect(sx, 0, ew, H)
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(sx + ew, 0); ctx.lineTo(sx + ew, H); ctx.stroke()
    }

    // Waveform
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#40c4ff55')
    grad.addColorStop(0.5, '#40c4ff')
    grad.addColorStop(1, '#40c4ff55')
    ctx.strokeStyle = grad
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < W; x++) {
      const ptIdx = startPt + Math.floor(x / W * (endPt - startPt))
      if (ptIdx >= totalPts) break
      const minV = waveData.mins[ptIdx] ?? 0
      const maxV = waveData.maxs[ptIdx] ?? 0
      ctx.moveTo(x, H/2 + minV * H/2 * 0.9)
      ctx.lineTo(x, H/2 + maxV * H/2 * 0.9)
    }
    ctx.stroke()
  }, [waveData, zoom, offset, selStart, selEnd])

  const drawTimeline = useCallback(() => {
    const canvas = timelineRef.current
    const wrap = canvas?.parentElement
    if (!canvas || !wrap) return
    canvas.width = wrap.clientWidth
    canvas.height = 28
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0e0e12'; ctx.fillRect(0, 0, canvas.width, 28)
    if (!waveData) return
    const dur = waveData.duration
    const visibleDur = dur / zoom
    const startT = offset * dur
    const tickInterval = visibleDur < 5 ? 0.5 : visibleDur < 30 ? 2 : 10
    ctx.strokeStyle = '#444'; ctx.fillStyle = '#888'; ctx.font = '10px "Share Tech Mono"'
    let t = Math.floor(startT / tickInterval) * tickInterval
    while (t <= startT + visibleDur) {
      const x = (t - startT) / visibleDur * canvas.width
      ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x, 28); ctx.stroke()
      ctx.fillText(fmtTime(t), x + 2, 12)
      t += tickInterval
    }
  }, [waveData, zoom, offset])

  useEffect(() => { drawWaveform(); drawTimeline() }, [drawWaveform, drawTimeline])

  const handleFile = async (file: File) => {
    const toastId = toast.loading('Uploading & analyzing audio...')
    try {
      const res = await audioApi.upload(file)
      setWaveData({ ...res.data, filename: file.name })
      currentFileRef.current = res.data.file_id
      setZoom(1); setOffset(0); setSelStart(null); setSelEnd(null)
      toast.success('Audio loaded!', { id: toastId })
    } catch {
      toast.error('Failed to load audio', { id: toastId })
    }
  }

  const applyEffect = async (effect: AudioEffect) => {
    if (!currentFileRef.current) return
    setIsProcessing(true)
    setActiveEffect(effect.type)
    const toastId = toast.loading(`Applying ${effect.type}...`)
    try {
      const effects = [effect]
      const res = await audioApi.applyEffects(currentFileRef.current, effects)
      setWaveData(prev => prev ? { ...prev, ...res.data } : res.data)
      currentFileRef.current = res.data.file_id
      toast.success(`${effect.type} applied!`, { id: toastId })
    } catch {
      toast.error('Effect failed', { id: toastId })
    } finally {
      setIsProcessing(false)
      setActiveEffect(null)
    }
  }

  // Mouse interactions
  const onMouseDown = (e: React.MouseEvent) => {
    if (!waveData) return
    setIsDragging(true)
    const rect = wrapRef.current!.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const totalPts = waveData.mins.length
    const start = Math.floor((offset * totalPts) + pct * (totalPts / zoom))
    setSelStart(start); setSelEnd(start)
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !waveData) return
    const rect = wrapRef.current!.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const totalPts = waveData.mins.length
    setSelEnd(Math.floor((offset * totalPts) + pct * (totalPts / zoom)))
  }
  const onMouseUp = () => setIsDragging(false)

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey) {
      setZoom(z => Math.max(1, Math.min(100, z * (e.deltaY < 0 ? 1.2 : 0.85))))
    } else {
      setOffset(o => Math.max(0, Math.min(1 - 1/zoom, o + e.deltaY * 0.001)))
    }
  }

  const selDuration = waveData && selStart !== null && selEnd !== null
    ? Math.abs(selEnd - selStart) / waveData.mins.length * waveData.duration
    : null

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="h-11 bg-[#111115] border-b border-daw-border flex items-center px-3 gap-2 flex-shrink-0">
        {/* Upload */}
        <label className="flex items-center gap-1.5 text-xs font-semibold px-3 h-7 rounded border border-daw-border bg-daw-raised hover:bg-daw-hover transition-all text-daw-muted hover:text-daw-text cursor-pointer">
          <Upload size={11} /> Open
          <input type="file" accept="audio/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>

        <div className="w-px h-6 bg-daw-border" />

        {/* Effects */}
        {[
          { label: 'Fade In',   effect: { type: 'fade_in' as const, duration: 2 } },
          { label: 'Fade Out',  effect: { type: 'fade_out' as const, duration: 2 } },
          { label: 'Normalize', effect: { type: 'normalize' as const } },
          { label: 'Reverse',   effect: { type: 'reverse' as const } },
        ].map(({ label, effect }) => (
          <button
            key={label}
            onClick={() => applyEffect(effect)}
            disabled={!waveData || isProcessing}
            className={`text-xs font-semibold px-3 h-7 rounded border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              activeEffect === effect.type
                ? 'bg-daw-accent border-daw-accent2 text-white'
                : 'border-daw-border bg-daw-raised hover:bg-daw-hover text-daw-muted hover:text-daw-text'
            }`}
          >
            {label}
          </button>
        ))}

        <div className="w-px h-6 bg-daw-border" />

        <button onClick={() => setZoom(z => Math.min(100, z * 1.5))} className="text-xs font-semibold px-2 h-7 rounded border border-daw-border bg-daw-raised hover:bg-daw-hover transition-all text-daw-muted hover:text-daw-text">
          <ZoomIn size={13} />
        </button>
        <button onClick={() => setZoom(z => Math.max(1, z / 1.5))} className="text-xs font-semibold px-2 h-7 rounded border border-daw-border bg-daw-raised hover:bg-daw-hover transition-all text-daw-muted hover:text-daw-text">
          <ZoomOut size={13} />
        </button>
        <span className="text-xs text-daw-muted font-mono">{zoom.toFixed(1)}x</span>

        <div className="flex-1" />

        {waveData && (
          <a
            href={waveData.url} download="edited.wav"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 h-7 rounded bg-daw-accent border border-daw-accent2 text-white hover:bg-daw-accent2 transition-all"
          >
            <Download size={11} /> Export WAV
          </a>
        )}
      </div>

      {/* Waveform */}
      <div
        ref={wrapRef}
        className="flex-1 relative overflow-hidden bg-[#111115] cursor-crosshair"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onWheel={onWheel}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
        {!waveData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="text-5xl">🎧</div>
            <div className="text-daw-muted">Open an audio file to begin editing</div>
            <div className="text-daw-faint text-sm">Ctrl+scroll to zoom · drag to select</div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="h-7 bg-[#0e0e12] border-t border-daw-border flex-shrink-0 overflow-hidden">
        <canvas ref={timelineRef} className="block" />
      </div>

      {/* Status bar */}
      <div className="h-6 bg-[#111115] border-t border-daw-border flex items-center px-3 gap-5 text-[11px] text-daw-muted font-mono flex-shrink-0">
        <span>Duration: <span className="text-daw-text">{waveData ? fmtTime(waveData.duration) : '--'}</span></span>
        <span>Selection: <span className="text-daw-text">{selDuration != null ? fmtTime(selDuration) : '--'}</span></span>
        <span>Sample Rate: <span className="text-daw-text">{waveData?.samplerate ? `${waveData.samplerate} Hz` : '--'}</span></span>
        <span>Channels: <span className="text-daw-text">{waveData?.channels ?? '--'}</span></span>
        {waveData?.filename && <span className="text-daw-faint">{waveData.filename}</span>}
      </div>
    </div>
  )
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = (s % 60).toFixed(2)
  return `${m}:${Number(sec) < 10 ? '0' : ''}${sec}`
}
