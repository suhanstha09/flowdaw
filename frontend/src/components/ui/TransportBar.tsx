'use client'
import { useEffect, useRef } from 'react'
import { useDawStore } from '@/store/dawStore'

export function TransportBar() {
  const {
    bpm,
    isPlaying,
    isRecording,
    playPosition,
    key,
    timeSignature,
    tracks,
    setBpm,
    setPlaying,
    setRecording,
    setPlayPosition,
  } = useDawStore()

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
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(150, when)
      osc.frequency.exponentialRampToValueAtTime(45, when + 0.08)
      gain.gain.setValueAtTime(0.0001, when)
      gain.gain.exponentialRampToValueAtTime(0.5, when + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.12)
      osc.connect(gain)
      gain.connect(out)
      osc.start(when)
      osc.stop(when + 0.14)
      return
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const midi = type === 'BASS' ? 40 : type === 'SYNTH' ? 64 : 57
    const freq = 440 * Math.pow(2, (midi - 69) / 12)
    osc.type = type === 'BASS' ? 'sawtooth' : 'square'
    osc.frequency.setValueAtTime(freq, when)
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(type === 'BASS' ? 0.18 : 0.1, when + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.2)
    osc.connect(gain)
    gain.connect(out)
    osc.start(when)
    osc.stop(when + 0.21)
  }

  const scheduleStep = (step: number) => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const hasSolo = tracks.some((t) => t.soloed)
    tracks.forEach((track) => {
      if (track.muted) return
      if (hasSolo && !track.soloed) return
      const active = track.clips.some((clip) => step >= clip.start && step < clip.start + clip.length)
      if (active) triggerTrackStep(track.type, ctx.currentTime)
    })
  }

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastStepRef.current = -1
      return
    }

    const ctx = ensureAudio()
    ctx.resume()
    startTimeRef.current = ctx.currentTime
    startPosRef.current = playPosition

    const tick = () => {
      const elapsed = ctx.currentTime - startTimeRef.current
      const nextPos = startPosRef.current + elapsed * (bpm / 60)
      setPlayPosition(nextPos)
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
  }, [isPlaying, bpm, tracks, playPosition, setPlayPosition])

  const handleBpmMouseDown = (e: React.MouseEvent) => {
    bpmDragRef.current = { startY: e.clientY, startBpm: bpm }
    const onMove = (evt: MouseEvent) => {
      if (!bpmDragRef.current) return
      const newBpm = Math.max(
        40,
        Math.min(300, bpmDragRef.current.startBpm + Math.round((bpmDragRef.current.startY - evt.clientY) * 0.5))
      )
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
        <TBtn onClick={() => setPlayPosition(0)} title="Rewind" label="RW" />
        <TBtn
          onClick={() => setPlaying(!isPlaying)}
          active={isPlaying}
          title={isPlaying ? 'Pause' : 'Play'}
          label={isPlaying ? 'PA' : 'PL'}
        />
        <TBtn
          onClick={() => {
            setPlaying(false)
            setPlayPosition(0)
            lastStepRef.current = -1
          }}
          title="Stop"
          label="ST"
        />
        <TBtn onClick={() => setRecording(!isRecording)} active={isRecording} isRec title="Record" label="REC" />
      </div>

      <div className="fl-divider" />

      <div className="fl-slot rounded-sm px-2 py-1 text-right">
        <div className="text-[8px] uppercase tracking-[0.2em] text-text-dim">Time</div>
        <div className="font-mono text-[22px] leading-none tracking-[0.12em] text-daw-green">
          {bars}:0{beats}:{ticks}
        </div>
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
        <div className="text-[11px] uppercase tracking-[0.14em] text-text-dim">
          Key <span className="ml-1 text-text">{key}</span>
        </div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-text-dim">
          Time <span className="ml-1 text-text">{timeSignature[0]}/{timeSignature[1]}</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="fl-slot flex items-center gap-2 rounded-sm px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-text-dim">
          <span>Pat</span>
          <span className="text-accent">01</span>
          <span className="text-[#60708a]">Song</span>
        </div>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isPlaying
              ? 'bg-daw-green shadow-[0_0_10px_rgba(0,230,118,0.85)] animate-pulse-glow'
              : 'bg-[#455064]'
          }`}
        />
      </div>
    </div>
  )
}

function TBtn({
  onClick,
  active,
  isRec,
  title,
  label,
}: {
  onClick: () => void
  active?: boolean
  isRec?: boolean
  title?: string
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
