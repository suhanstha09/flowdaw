'use client'
import { useEffect, useRef } from 'react'
import { useDawStore } from '@/store/dawStore'

export function TransportBar() {
  const { bpm, isPlaying, isRecording, playPosition, key, timeSignature,
    tracks, setBpm, setPlaying, setRecording, setPlayPosition } = useDawStore()
  const bpmDragRef = useRef<{ startY: number; startBpm: number } | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const startPosRef = useRef<number>(0)
  const lastStepRef = useRef<number>(-1)

  const bars = Math.floor(playPosition / 4) + 1
  const beats = Math.floor(playPosition % 4) + 1
  const ticks = String(Math.floor((playPosition % 1) * 1000)).padStart(3, '0')

  const ensureAudio = () => {
    if (audioCtxRef.current) return audioCtxRef.current
    const AC = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AC()
    const master = ctx.createGain()
    master.gain.value = 0.18
    master.connect(ctx.destination)
    audioCtxRef.current = ctx
    masterGainRef.current = master
    return ctx
  }

  const triggerTrackStep = (type: string, when: number) => {
    const ctx = audioCtxRef.current
    const out = masterGainRef.current
    if (!ctx || !out) return

    if (type === 'DRUMS') {
      <div className="fl-window relative z-10 flex h-[58px] flex-shrink-0 items-center gap-3 border-x-0 border-b px-3">
        <div className="fl-header-strip flex items-center gap-1.5 rounded-sm px-1.5 py-1">
          <TBtn onClick={() => { setPlayPosition(0) }} title="Rewind" label="RW" />
          <TBtn onClick={() => setPlaying(!isPlaying)} active={isPlaying} title={isPlaying ? 'Pause' : 'Play'} label={isPlaying ? 'PA' : 'PL'} />
          <TBtn onClick={() => { setPlaying(false); setPlayPosition(0); lastStepRef.current = -1 }} title="Stop" label="ST" />
          <TBtn onClick={() => setRecording(!isRecording)} active={isRecording} isRec title="Record" label="REC" />
        </div>

        <div className="fl-divider" />

        <div className="fl-slot rounded-sm px-2 py-1 text-right">
          <div className="text-[8px] uppercase tracking-[0.2em] text-text-dim">Time</div>
          <div className="font-mono text-[22px] leading-none text-daw-green tracking-[0.12em]">{bars}:0{beats}:{ticks}</div>
        </div>

        <div className="fl-slot min-w-[74px] cursor-ns-resize rounded-sm px-2 py-1 text-center" onMouseDown={handleBpmMouseDown} title="Drag to change BPM">
          <div className="text-[8px] uppercase tracking-[0.2em] text-text-dim">Tempo</div>
          <div className="font-mono text-[20px] leading-none text-accent">{bpm}</div>
        </div>

        <div className="fl-divider" />

        <div className="fl-slot flex min-w-[210px] items-center gap-3 rounded-sm px-2 py-1">
          <div className="text-[9px] uppercase tracking-[0.18em] text-text-dim">Master</div>
          <input type="range" min={0} max={100} defaultValue={80} className="w-24" />
          <div className="text-[11px] uppercase tracking-[0.14em] text-text-dim">Key <span className="ml-1 text-text">{key}</span></div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-text-dim">Time <span className="ml-1 text-text">{timeSignature[0]}/{timeSignature[1]}</span></div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="fl-slot flex items-center gap-2 rounded-sm px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-text-dim">
            <span>Pat</span>
            <span className="text-accent">01</span>
            <span className="text-[#60708a]">Song</span>
          </div>
          <span className={`h-2.5 w-2.5 rounded-full ${isPlaying ? 'bg-daw-green shadow-[0_0_10px_rgba(0,230,118,0.85)] animate-pulse-glow' : 'bg-[#455064]'}`} />
        </div>
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastStepRef.current = -1
  function TBtn({ onClick, active, isRec, title, label }: {
    onClick: () => void

    label: string
    const ctx = ensureAudio()
    const base = 'h-8 min-w-[32px] rounded-sm border px-2 font-mono text-[10px] tracking-[0.1em] flex items-center justify-center cursor-pointer transition-all duration-100'
    const idle = 'bg-raised border-border text-text-dim hover:bg-hover hover:text-text hover:border-border-bright'
    startPosRef.current = playPosition

    const tick = () => {
      const elapsed = ctx.currentTime - startTimeRef.current
      const nextPos = startPosRef.current + elapsed * (bpm / 60)
        {label}
      const step = Math.floor(nextPos)
      if (step !== lastStepRef.current) {
        lastStepRef.current = step
        scheduleStep(step)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, bpm, tracks, setPlayPosition])

  const handleBpmMouseDown = (e: React.MouseEvent) => {
    bpmDragRef.current = { startY: e.clientY, startBpm: bpm }
    const onMove = (e: MouseEvent) => {
      if (!bpmDragRef.current) return
      const newBpm = Math.max(40, Math.min(300,
        bpmDragRef.current.startBpm + Math.round((bpmDragRef.current.startY - e.clientY) * 0.5)
      ))
      setBpm(newBpm)
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
    <div className="h-[52px] bg-[#18181c] border-b-2 border-border flex items-center px-4 gap-5 flex-shrink-0">
      {/* Transport buttons */}
      <div className="flex gap-1.5">
        <TBtn onClick={() => { setPlayPosition(0) }} title="Rewind">⏮</TBtn>
        <TBtn onClick={() => setPlaying(!isPlaying)} active={isPlaying} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '⏸' : '▶'}
        </TBtn>
        <TBtn onClick={() => { setPlaying(false); setPlayPosition(0); lastStepRef.current = -1 }} title="Stop">⏹</TBtn>
        <TBtn onClick={() => setRecording(!isRecording)} active={isRecording} isRec title="Record">⏺</TBtn>
      </div>

      <div className="w-px h-8 bg-border" />

      {/* Time display */}
      <div className="font-mono text-xl text-daw-green bg-[#0e0e14] border border-border rounded px-3 py-1 tracking-widest">
        {bars}:0{beats}:{ticks}
      </div>

      {/* BPM */}
      <div className="bg-[#0e0e14] border border-border rounded px-3 py-1 flex flex-col items-center cursor-ns-resize min-w-[68px]"
           onMouseDown={handleBpmMouseDown} title="Drag to change BPM">
        <span className="text-[9px] text-text-dim uppercase tracking-widest">BPM</span>
        <span className="font-mono text-[22px] text-accent leading-none">{bpm}</span>
      </div>

      <div className="w-px h-8 bg-border" />

      {/* Master vol */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] text-text-dim uppercase tracking-widest">Master</span>
        <input type="range" min={0} max={100} defaultValue={80} className="w-20" />
      </div>

      <div className="w-px h-8 bg-border" />

      <div className="text-[12px] text-text-dim">
        Key: <span className="text-text font-semibold">{key}</span>
        &nbsp;|&nbsp; Time: <span className="text-text font-semibold">{timeSignature[0]}/{timeSignature[1]}</span>
      </div>

      {isPlaying && (
        <div className="ml-2 w-2 h-2 rounded-full bg-daw-green animate-pulse-glow" />
      )}
    </div>
  )
}

function TBtn({ children, onClick, active, isRec, title }: {
  children: React.ReactNode; onClick: () => void
  active?: boolean; isRec?: boolean; title?: string
}) {
  const base = 'w-9 h-9 rounded border flex items-center justify-center cursor-pointer text-sm transition-all duration-100'
  const idle = 'bg-raised border-border text-text-dim hover:bg-hover hover:text-text hover:border-border-bright'
  const activeClass = isRec
    ? 'bg-daw-red border-red-400 text-white shadow-[0_0_10px_rgba(255,82,82,0.5)]'
    : 'bg-accent border-accent2 text-white glow-orange'
  return (
    <button className={`${base} ${active ? activeClass : idle}`} onClick={onClick} title={title}>
      {children}
    </button>
  )
}
