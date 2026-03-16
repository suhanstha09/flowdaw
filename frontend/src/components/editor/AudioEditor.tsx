'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'

type Tool = 'select' | 'cut' | 'draw'
interface HistoryEntry { data: Float32Array }

const BTN = {
  base: {
    height: 22,
    padding: '0 7px',
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    borderRadius: 1,
    background: '#2e2e2e',
    color: '#cccccc',
    border: '1px solid #0d0d0d',
    borderBottom: '1px solid #444',
    borderRight: '1px solid #444',
    transition: 'background 60ms',
    fontFamily: "'Segoe UI', sans-serif",
    display: 'inline-flex',
    alignItems: 'center',
  },
  active: {
    background: '#ff6a00',
    color: '#ffffff',
    borderColor: '#cc4400',
    borderBottom: '1px solid #ff9955',
    borderRight: '1px solid #ff9955',
  },
  disabled: {
    opacity: 0.3,
    cursor: 'not-allowed' as const,
  },
}

export function AudioEditor() {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const timelineRef = useRef<HTMLCanvasElement>(null)
  const wrapRef     = useRef<HTMLDivElement>(null)
  const [tool, setTool]             = useState<Tool>('select')
  const [buffer, setBuffer]         = useState<AudioBuffer | null>(null)
  const [channelData, setChannelData] = useState<Float32Array | null>(null)
  const [zoom, setZoom]             = useState(1)
  const [offset, setOffset]         = useState(0)
  const [selStart, setSelStart]     = useState<number | null>(null)
  const [selEnd, setSelEnd]         = useState<number | null>(null)
  const [playhead, setPlayhead]     = useState(0)
  const [history, setHistory]       = useState<HistoryEntry[]>([])
  const [histIdx, setHistIdx]       = useState(-1)
  const [status, setStatus]         = useState({ pos: '0:00.000', sel: '--', dur: '--', sr: '--', ch: '--' })
  const dragging = useRef(false)
  const audioCtx = useRef<AudioContext | null>(null)

  const getCtx = () => {
    if (!audioCtx.current) audioCtx.current = new AudioContext()
    return audioCtx.current
  }
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60
    return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(3)}`
  }

  const drawWaveform = useCallback(() => {
    const c = canvasRef.current; const wrap = wrapRef.current; if (!c || !wrap) return
    c.width = wrap.clientWidth; c.height = wrap.clientHeight
    const ctx = c.getContext('2d')!; const W = c.width, H = c.height
    ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, W, H)

    // Horizontal center line
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke()

    // Grid lines
    for (let i = 1; i < 8; i++) {
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(0, i / 8 * H); ctx.lineTo(W, i / 8 * H); ctx.stroke()
    }
    for (let i = 1; i < 16; i++) {
      ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(i / 16 * W, 0); ctx.lineTo(i / 16 * W, H); ctx.stroke()
    }

    if (!channelData) return
    const total   = channelData.length
    const visible = total / zoom
    const start   = Math.floor(offset * total)
    const end     = Math.min(total, start + visible)

    // Selection highlight
    if (selStart !== null && selEnd !== null) {
      const s0 = ((Math.min(selStart, selEnd) - start) / visible) * W
      const s1 = ((Math.max(selStart, selEnd) - start) / visible) * W
      ctx.fillStyle = 'rgba(0,200,255,0.1)'
      ctx.fillRect(s0, 0, s1 - s0, H)
      ctx.strokeStyle = 'rgba(0,200,255,0.5)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(s0, 0); ctx.lineTo(s0, H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(s1, 0); ctx.lineTo(s1, H); ctx.stroke()
    }

    // Waveform — FL Studio cyan
    const step = (end - start) / W
    ctx.strokeStyle = '#00c8ff'; ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < W; x++) {
      let mn = 0, mx = 0
      const s0 = Math.floor(start + x * step), s1 = Math.min(end, s0 + Math.ceil(step))
      for (let s = s0; s < s1; s++) { const v = channelData[s] || 0; if (v < mn) mn = v; if (v > mx) mx = v; }
      ctx.moveTo(x, H / 2 + mn * H / 2 * 0.9)
      ctx.lineTo(x, H / 2 + mx * H / 2 * 0.9)
    }
    ctx.stroke()

    // Playhead — orange
    const phPct = (playhead * getCtx().sampleRate - start) / visible
    if (phPct >= 0 && phPct <= 1) {
      ctx.strokeStyle = '#ff6a00'; ctx.lineWidth = 2
      ctx.shadowColor  = '#ff6a00'; ctx.shadowBlur = 6
      ctx.beginPath(); ctx.moveTo(phPct * W, 0); ctx.lineTo(phPct * W, H); ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [channelData, zoom, offset, selStart, selEnd, playhead])

  const drawTimeline = useCallback(() => {
    const c = timelineRef.current; if (!c) return
    c.width = c.parentElement!.clientWidth; c.height = 22
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, c.width, 22)
    if (!buffer) return
    const dur = buffer.duration
    const vis = dur / zoom; const startT = offset * dur
    const interval = vis < 5 ? 0.5 : vis < 30 ? 2 : vis < 120 ? 10 : 30
    let t = Math.floor(startT / interval) * interval
    ctx.strokeStyle = '#444'; ctx.fillStyle = '#888'; ctx.font = '9px "Courier New"'
    while (t <= startT + vis) {
      const x = (t - startT) / vis * c.width
      ctx.beginPath(); ctx.moveTo(x, 12); ctx.lineTo(x, 22); ctx.stroke()
      ctx.fillText(fmtTime(t), x + 2, 10)
      t += interval
    }
  }, [buffer, zoom, offset])

  useEffect(() => { drawWaveform(); drawTimeline() }, [drawWaveform, drawTimeline])
  useEffect(() => {
    const onResize = () => { drawWaveform(); drawTimeline() }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [drawWaveform, drawTimeline])

  const loadFile = async (file: File) => {
    const ab = await file.arrayBuffer()
    const ctx = getCtx()
    const buf = await ctx.decodeAudioData(ab)
    const cd  = buf.getChannelData(0)
    setBuffer(buf); setChannelData(cd)
    setZoom(1); setOffset(0); setSelStart(null); setSelEnd(null)
    setHistory([{ data: new Float32Array(cd) }]); setHistIdx(0)
    setStatus(s => ({ ...s, dur: fmtTime(buf.duration), sr: buf.sampleRate + ' Hz', ch: String(buf.numberOfChannels) }))
  }

  const getSel = () => selStart !== null && selEnd !== null
    ? { start: Math.min(selStart, selEnd), end: Math.max(selStart, selEnd) }
    : channelData ? { start: 0, end: channelData.length } : null

  const pushHistory = (cd: Float32Array) => {
    const h = history.slice(0, histIdx + 1); h.push({ data: new Float32Array(cd) })
    setHistory(h); setHistIdx(h.length - 1)
  }

  const applyFadeIn = () => {
    if (!channelData) return; const sel = getSel(); if (!sel) return
    const cd = new Float32Array(channelData)
    for (let i = sel.start; i < sel.end; i++) cd[i] *= (i - sel.start) / (sel.end - sel.start)
    pushHistory(cd); setChannelData(cd)
  }
  const applyFadeOut = () => {
    if (!channelData) return; const sel = getSel(); if (!sel) return
    const cd = new Float32Array(channelData)
    for (let i = sel.start; i < sel.end; i++) cd[i] *= 1 - (i - sel.start) / (sel.end - sel.start)
    pushHistory(cd); setChannelData(cd)
  }
  const applyNormalize = () => {
    if (!channelData) return; const sel = getSel(); if (!sel) return
    const cd = new Float32Array(channelData); let peak = 0
    for (let i = sel.start; i < sel.end; i++) peak = Math.max(peak, Math.abs(cd[i]))
    if (peak > 0) for (let i = sel.start; i < sel.end; i++) cd[i] /= peak
    pushHistory(cd); setChannelData(cd)
  }
  const applyReverse = () => {
    if (!channelData) return; const sel = getSel(); if (!sel) return
    const cd = new Float32Array(channelData)
    const slice = cd.slice(sel.start, sel.end).reverse()
    cd.set(slice, sel.start); pushHistory(cd); setChannelData(cd)
  }
  const undo = () => { if (histIdx <= 0) return; const i = histIdx - 1; setHistIdx(i); setChannelData(new Float32Array(history[i].data)) }
  const redo = () => { if (histIdx >= history.length - 1) return; const i = histIdx + 1; setHistIdx(i); setChannelData(new Float32Array(history[i].data)) }

  const exportWav = () => {
    if (!channelData || !buffer) return
    const sr = buffer.sampleRate; const len = channelData.length
    const ab = new ArrayBuffer(44 + len * 2); const v = new DataView(ab)
    const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
    ws(0,'RIFF'); v.setUint32(4, 36 + len * 2, true); ws(8,'WAVE'); ws(12,'fmt ')
    v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true)
    v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true)
    ws(36,'data'); v.setUint32(40, len * 2, true)
    let off = 44
    for (let i = 0; i < len; i++) { const s = Math.max(-1, Math.min(1, channelData[i])); v.setInt16(off, s < 0 ? s * 32768 : s * 32767, true); off += 2 }
    const blob = new Blob([ab], { type: 'audio/wav' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'edited.wav'; a.click()
  }

  const handleWheelZoom = (e: React.WheelEvent) => {
    if (!channelData) return; e.preventDefault()
    if (e.ctrlKey || e.metaKey) setZoom(z => Math.max(1, Math.min(200, z * (e.deltaY < 0 ? 1.25 : 0.8))))
    else setOffset(o => Math.max(0, Math.min(1 - 1 / zoom, o + e.deltaY * 0.0008)))
  }
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!channelData) return; dragging.current = true
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const total = channelData.length; const vis = total / zoom; const start = Math.floor(offset * total)
    const sample = Math.floor(start + pct * vis)
    setSelStart(sample); setSelEnd(sample)
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !channelData) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const total = channelData.length; const vis = total / zoom; const start = Math.floor(offset * total)
    const sample = Math.floor(start + pct * vis); setSelEnd(sample)
    if (buffer) setStatus(s => ({ ...s, sel: fmtTime(Math.abs(sample - (selStart || 0)) / buffer.sampleRate) }))
  }
  const handleMouseUp = () => { dragging.current = false }

  const tools: { id: Tool; label: string }[] = [
    { id: 'select', label: 'Select' },
    { id: 'cut',    label: 'Cut' },
    { id: 'draw',   label: 'Draw' },
  ]

  const Divider = () => <div style={{ width: 1, height: 18, background: '#0d0d0d', margin: '0 3px', flexShrink: 0 }} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#1a1a1a' }}>

      {/* Toolbar */}
      <div style={{
        height: 34,
        background: '#252525',
        borderBottom: '1px solid #0d0d0d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 6px',
        gap: 2,
        flexShrink: 0,
        flexWrap: 'wrap',
        overflow: 'hidden',
      }}>
        {tools.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            style={{
              ...BTN.base,
              ...(tool === t.id ? BTN.active : {}),
            }}
          >
            {t.label}
          </button>
        ))}

        <Divider />

        <button onClick={undo} style={BTN.base}>Undo</button>
        <button onClick={redo} style={BTN.base}>Redo</button>

        <Divider />

        {[
          { fn: applyFadeIn,    l: 'Fade In' },
          { fn: applyFadeOut,   l: 'Fade Out' },
          { fn: applyNormalize, l: 'Normalize' },
          { fn: applyReverse,   l: 'Reverse' },
        ].map(({ fn, l }) => (
          <button
            key={l}
            onClick={fn}
            disabled={!channelData}
            style={{ ...BTN.base, ...(channelData ? {} : BTN.disabled) }}
          >
            {l}
          </button>
        ))}

        <Divider />

        <button onClick={() => setZoom(z => Math.min(200, z * 1.5))} style={BTN.base}>Z+</button>
        <button onClick={() => setZoom(z => Math.max(1, z / 1.5))} style={BTN.base}>Z-</button>

        <Divider />

        <button
          onClick={exportWav}
          disabled={!channelData}
          style={{
            ...BTN.base,
            background: channelData ? '#ff6a00' : '#2e2e2e',
            color: channelData ? '#fff' : '#444',
            border: '1px solid #0d0d0d',
            borderBottom: channelData ? '1px solid #ff9955' : '1px solid #444',
            borderRight: channelData ? '1px solid #ff9955' : '1px solid #444',
            ...(channelData ? {} : BTN.disabled),
          }}
        >
          Export
        </button>

        <label
          style={{
            ...BTN.base,
            cursor: 'pointer',
          }}
        >
          Open
          <input
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])}
          />
        </label>
      </div>

      {/* Waveform canvas */}
      <div
        ref={wrapRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          cursor: tool === 'cut' ? 'col-resize' : tool === 'draw' ? 'crosshair' : 'text',
        }}
        onWheel={handleWheelZoom}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        {!channelData && (
          <label style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8, cursor: 'pointer',
          }}>
            <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])} />
            <div style={{ fontSize: 32, color: '#333' }}>♪</div>
            <div style={{ fontSize: 13, color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Open an audio file to edit
            </div>
            <div style={{ fontSize: 11, color: '#444', letterSpacing: '0.08em' }}>or drag &amp; drop</div>
          </label>
        )}
      </div>

      {/* Timeline */}
      <div style={{ height: 22, background: '#111111', borderTop: '1px solid #0d0d0d', flexShrink: 0, overflow: 'hidden' }}>
        <canvas ref={timelineRef} style={{ display: 'block' }} />
      </div>

      {/* Status bar */}
      <div style={{
        height: 20,
        background: '#141414',
        borderTop: '1px solid #0d0d0d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: 16,
        flexShrink: 0,
        fontFamily: 'Courier New, monospace',
        fontSize: 10,
        color: '#555',
      }}>
        {[
          ['POS', status.pos],
          ['SEL', status.sel],
          ['DUR', status.dur],
          ['SR', status.sr],
          ['CH', status.ch],
          ['ZOOM', zoom.toFixed(1) + 'x'],
        ].map(([k, v]) => (
          <span key={k}>
            {k}:{' '}
            <span style={{ color: '#888' }}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
