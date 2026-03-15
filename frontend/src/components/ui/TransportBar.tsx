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
        <div className="font-mono text-[22px] leading-none tracking-[0.12em] text-daw-green">{bars}:0{beats}:{ticks}</div>
      </div>

      <div
        className="fl-slot min-w-[74px] cursor-ns-resize rounded-sm px-2 py-1 text-center"
        onMouseDown={handleBpmMouseDown}
        title="Drag to change BPM"
      >
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
    </div>
  )
}

function TBtn({ onClick, active, isRec, title, label }: {
  onClick: () => void
  active?: boolean; isRec?: boolean; title?: string
  label: string
}) {
  const base = 'h-8 min-w-[32px] rounded-sm border px-2 font-mono text-[10px] tracking-[0.1em] flex items-center justify-center cursor-pointer transition-all duration-100'
  const idle = 'bg-raised border-border text-text-dim hover:bg-hover hover:text-text hover:border-border-bright'
  const activeClass = isRec
    ? 'bg-daw-red border-red-400 text-white shadow-[0_0_10px_rgba(255,82,82,0.5)]'
    : 'bg-accent border-accent2 text-white glow-orange'
  return (
    <button className={`${base} ${active ? activeClass : idle}`} onClick={onClick} title={title}>
      {label}
    </button>
  )
}
