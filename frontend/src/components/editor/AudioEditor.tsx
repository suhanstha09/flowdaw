'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'

type Tool = 'select' | 'cut' | 'draw'

interface HistoryEntry { data: Float32Array }

export function AudioEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timelineRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null)
  const [channelData, setChannelData] = useState<Float32Array | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState(0)
  const [selStart, setSelStart] = useState<number | null>(null)
  const [selEnd, setSelEnd] = useState<number | null>(null)
  const [playhead, setPlayhead] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [status, setStatus] = useState({ pos: '0:00.000', sel: '--', dur: '--', sr: '--', ch: '--' })
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
    ctx.fillStyle = '#111115'; ctx.fillRect(0,0,W,H)
    // Grid
    for (let i=1; i<10; i++) {
      ctx.strokeStyle='#1a1a24'; ctx.lineWidth=0.5
      ctx.beginPath(); ctx.moveTo(0,i/10*H); ctx.lineTo(W,i/10*H); ctx.stroke()
    }
    for (let i=1; i<20; i++) {
      ctx.strokeStyle='#1e1e28'; ctx.lineWidth=0.5
      ctx.beginPath(); ctx.moveTo(i/20*W,0); ctx.lineTo(i/20*W,H); ctx.stroke()
    }
    ctx.strokeStyle='#2a2a3a'; ctx.lineWidth=1
    ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke()
    if (!channelData) return
    const total = channelData.length
    const visible = total / zoom
    const start = Math.floor(offset * total)
    const end = Math.min(total, start + visible)
    // Selection
    if (selStart !== null && selEnd !== null) {
      const s0 = ((Math.min(selStart,selEnd)-start)/visible)*W
      const s1 = ((Math.max(selStart,selEnd)-start)/visible)*W
      ctx.fillStyle='rgba(64,196,255,0.12)'
      ctx.fillRect(s0,0,s1-s0,H)
      ctx.strokeStyle='rgba(64,196,255,0.6)'; ctx.lineWidth=1
      ctx.beginPath(); ctx.moveTo(s0,0); ctx.lineTo(s0,H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(s1,0); ctx.lineTo(s1,H); ctx.stroke()
    }
    // Waveform
    const step = (end-start)/W
    const grad = ctx.createLinearGradient(0,0,0,H)
    grad.addColorStop(0,'rgba(64,196,255,0.5)')
    grad.addColorStop(0.5,'rgba(64,196,255,0.9)')
    grad.addColorStop(1,'rgba(64,196,255,0.5)')
    ctx.strokeStyle=grad; ctx.lineWidth=1
    ctx.beginPath()
    for (let x=0; x<W; x++) {
      let mn=0,mx=0
      const s0 = Math.floor(start+x*step), s1 = Math.min(end,s0+Math.ceil(step))
      for (let s=s0; s<s1; s++) { const v=channelData[s]||0; if(v<mn)mn=v; if(v>mx)mx=v; }
      ctx.moveTo(x, H/2+mn*H/2*0.92); ctx.lineTo(x, H/2+mx*H/2*0.92)
    }
    ctx.stroke()
    // Playhead
    const phPct = (playhead*getCtx().sampleRate-start)/visible
    if (phPct>=0&&phPct<=1) {
      ctx.strokeStyle='#ff6b00'; ctx.lineWidth=2
      ctx.shadowColor='#ff6b00'; ctx.shadowBlur=8
      ctx.beginPath(); ctx.moveTo(phPct*W,0); ctx.lineTo(phPct*W,H); ctx.stroke()
      ctx.shadowBlur=0
    }
  }, [channelData, zoom, offset, selStart, selEnd, playhead])

  const drawTimeline = useCallback(() => {
    const c = timelineRef.current; if (!c) return
    c.width = c.parentElement!.clientWidth; c.height = 28
    const ctx = c.getContext('2d')!
    ctx.fillStyle='#0e0e12'; ctx.fillRect(0,0,c.width,28)
    if (!buffer) return
    const dur = buffer.duration
    const vis = dur/zoom; const startT = offset*dur
    const interval = vis<5?0.5:vis<30?2:vis<120?10:30
    let t = Math.floor(startT/interval)*interval
    ctx.strokeStyle='#444'; ctx.fillStyle='#888'; ctx.font='9px Share Tech Mono'
    while (t<=startT+vis) {
      const x = (t-startT)/vis*c.width
      ctx.beginPath(); ctx.moveTo(x,14); ctx.lineTo(x,28); ctx.stroke()
      ctx.fillText(fmtTime(t), x+2, 11)
      t+=interval
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
    const cd = buf.getChannelData(0)
    setBuffer(buf); setChannelData(cd)
    setZoom(1); setOffset(0); setSelStart(null); setSelEnd(null)
    setHistory([{ data: new Float32Array(cd) }]); setHistIdx(0)
    setStatus(s => ({ ...s, dur: fmtTime(buf.duration), sr: buf.sampleRate+' Hz', ch: String(buf.numberOfChannels) }))
  }

  const getSel = () => selStart!==null&&selEnd!==null
    ? { start: Math.min(selStart,selEnd), end: Math.max(selStart,selEnd) }
    : channelData ? { start: 0, end: channelData.length } : null

  const pushHistory = (cd: Float32Array) => {
    const h = history.slice(0, histIdx+1)
    h.push({ data: new Float32Array(cd) })
    setHistory(h); setHistIdx(h.length-1)
  }

  const applyFadeIn = () => {
    if (!channelData) return
    const sel = getSel(); if (!sel) return
    const cd = new Float32Array(channelData)
    for (let i=sel.start; i<sel.end; i++) cd[i] *= (i-sel.start)/(sel.end-sel.start)
    pushHistory(cd); setChannelData(cd)
  }
  const applyFadeOut = () => {
    if (!channelData) return
    const sel = getSel(); if (!sel) return
    const cd = new Float32Array(channelData)
    for (let i=sel.start; i<sel.end; i++) cd[i] *= 1-(i-sel.start)/(sel.end-sel.start)
    pushHistory(cd); setChannelData(cd)
  }
  const applyNormalize = () => {
    if (!channelData) return
    const sel = getSel(); if (!sel) return
    const cd = new Float32Array(channelData)
    let peak=0; for (let i=sel.start; i<sel.end; i++) peak=Math.max(peak,Math.abs(cd[i]))
    if (peak>0) for (let i=sel.start; i<sel.end; i++) cd[i]/=peak
    pushHistory(cd); setChannelData(cd)
  }
  const applyReverse = () => {
    if (!channelData) return
    const sel = getSel(); if (!sel) return
    const cd = new Float32Array(channelData)
    const slice = cd.slice(sel.start,sel.end).reverse()
    cd.set(slice, sel.start)
    pushHistory(cd); setChannelData(cd)
  }
  const undo = () => {
    if (histIdx<=0) return
    const i=histIdx-1; setHistIdx(i); setChannelData(new Float32Array(history[i].data))
  }
  const redo = () => {
    if (histIdx>=history.length-1) return
    const i=histIdx+1; setHistIdx(i); setChannelData(new Float32Array(history[i].data))
  }

  const exportWav = () => {
    if (!channelData||!buffer) return
    const sr=buffer.sampleRate; const len=channelData.length
    const ab=new ArrayBuffer(44+len*2); const v=new DataView(ab)
    const ws=(o:number,s:string)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))}
    ws(0,'RIFF');v.setUint32(4,36+len*2,true);ws(8,'WAVE');ws(12,'fmt ')
    v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true)
    v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true)
    ws(36,'data');v.setUint32(40,len*2,true)
    let off=44
    for(let i=0;i<len;i++){const s=Math.max(-1,Math.min(1,channelData[i]));v.setInt16(off,s<0?s*32768:s*32767,true);off+=2}
    const blob=new Blob([ab],{type:'audio/wav'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='edited.wav';a.click()
  }

  const handleWheelZoom = (e: React.WheelEvent) => {
    if (!channelData) return; e.preventDefault()
    if (e.ctrlKey||e.metaKey) {
      setZoom(z => Math.max(1,Math.min(200,z*(e.deltaY<0?1.25:0.8))))
    } else {
      setOffset(o => Math.max(0,Math.min(1-1/zoom,o+e.deltaY*0.0008)))
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!channelData) return
    dragging.current=true
    const rect=(e.currentTarget as HTMLElement).getBoundingClientRect()
    const pct=(e.clientX-rect.left)/rect.width
    const total=channelData.length; const vis=total/zoom
    const start=Math.floor(offset*total)
    const sample=Math.floor(start+pct*vis)
    setSelStart(sample); setSelEnd(sample)
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current||!channelData) return
    const rect=(e.currentTarget as HTMLElement).getBoundingClientRect()
    const pct=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))
    const total=channelData.length; const vis=total/zoom
    const start=Math.floor(offset*total)
    const sample=Math.floor(start+pct*vis)
    setSelEnd(sample)
    if (buffer) setStatus(s=>({...s, sel:fmtTime(Math.abs(sample-(selStart||0))/buffer.sampleRate)}))
  }
  const handleMouseUp = () => { dragging.current=false }

  const tools: { id: Tool; label: string }[] = [
    { id:'select', label:'↖ Select' },
    { id:'cut',    label:'✂ Cut' },
    { id:'draw',   label:'✏ Draw' },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="h-11 bg-[#111115] border-b border-border flex items-center px-3 gap-2 flex-shrink-0 flex-wrap">
        {tools.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)}
            className={`h-7 px-3 rounded border text-[12px] font-semibold uppercase tracking-wider cursor-pointer transition-all
              ${tool===t.id ? 'bg-accent border-accent2 text-white' : 'bg-raised border-border text-text-dim hover:bg-hover hover:text-text'}`}>
            {t.label}
          </button>
        ))}
        <div className="w-px h-6 bg-border mx-1" />
        {[{fn:undo,l:'↩ Undo'},{fn:redo,l:'↪ Redo'}].map(({fn,l})=>(
          <button key={l} onClick={fn} className="h-7 px-3 rounded border border-border bg-raised text-text-dim text-[12px] font-semibold uppercase tracking-wider hover:bg-hover hover:text-text transition-all">{l}</button>
        ))}
        <div className="w-px h-6 bg-border mx-1" />
        {[{fn:applyFadeIn,l:'Fade In'},{fn:applyFadeOut,l:'Fade Out'},{fn:applyNormalize,l:'Normalize'},{fn:applyReverse,l:'Reverse'}].map(({fn,l})=>(
          <button key={l} onClick={fn} className="h-7 px-3 rounded border border-border bg-raised text-text-dim text-[12px] font-semibold uppercase tracking-wider hover:bg-hover hover:text-text transition-all disabled:opacity-30" disabled={!channelData}>{l}</button>
        ))}
        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={() => setZoom(z=>Math.min(200,z*1.5))} className="h-7 px-2 rounded border border-border bg-raised text-text-dim hover:bg-hover hover:text-text transition-all">🔍+</button>
        <button onClick={() => setZoom(z=>Math.max(1,z/1.5))} className="h-7 px-2 rounded border border-border bg-raised text-text-dim hover:bg-hover hover:text-text transition-all">🔍−</button>
        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={exportWav} disabled={!channelData}
          className="h-7 px-3 rounded border border-accent2 bg-accent text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-accent2 transition-all disabled:opacity-30">⬇ Export</button>
        <label className="h-7 px-3 rounded border border-border bg-raised text-text-dim text-[12px] font-semibold uppercase tracking-wider hover:bg-hover hover:text-text transition-all cursor-pointer flex items-center">
          📂 Open
          <input type="file" accept="audio/*" className="hidden" onChange={e=>e.target.files?.[0]&&loadFile(e.target.files[0])} />
        </label>
      </div>

      {/* Waveform */}
      <div ref={wrapRef} className="flex-1 relative overflow-hidden"
        onWheel={handleWheelZoom}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: tool==='cut'?'col-resize':tool==='draw'?'crosshair':'text' }}>
        <canvas ref={canvasRef} className="block w-full h-full" />
        {!channelData && (
          <label className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer">
            <input type="file" accept="audio/*" className="hidden" onChange={e=>e.target.files?.[0]&&loadFile(e.target.files[0])} />
            <div className="text-5xl pointer-events-none">🎧</div>
            <div className="text-text-dim text-[16px] pointer-events-none">Open an audio file to begin editing</div>
            <div className="text-text-faint text-[13px] pointer-events-none">or drag & drop</div>
          </label>
        )}
      </div>

      {/* Timeline */}
      <div className="h-7 bg-[#0e0e12] border-t border-border flex-shrink-0 overflow-hidden">
        <canvas ref={timelineRef} className="block" />
      </div>

      {/* Status bar */}
      <div className="h-6 bg-[#111115] border-t border-border flex items-center px-3 gap-5 text-[11px] text-text-dim font-mono flex-shrink-0">
        {[['Position',status.pos],['Selection',status.sel],['Duration',status.dur],['Sample Rate',status.sr],['Channels',status.ch],['Zoom',zoom.toFixed(1)+'x']].map(([k,v])=>(
          <span key={k}>{k}: <span className="text-text">{v}</span></span>
        ))}
      </div>
    </div>
  )
}
