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

  const bars  = Math.floor(playPosition / 4) + 1
  const beats = Math.floor(playPosition % 4) + 1
  const ticks = String(Math.floor((playPosition % 1) * 100)).padStart(2, '0')

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
      osc.connect(gain); gain.connect(out)
      osc.start(when); osc.stop(when + 0.14)
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
    osc.connect(gain); gain.connect(out)
    osc.start(when); osc.stop(when + 0.21)
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
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isPlaying, bpm, tracks, playPosition, setPlayPosition])

  const handleBpmMouseDown = (e: React.MouseEvent) => {
    bpmDragRef.current = { startY: e.clientY, startBpm: bpm }
    const onMove = (evt: MouseEvent) => {
      if (!bpmDragRef.current) return
      const newBpm = Math.max(40, Math.min(300,
        bpmDragRef.current.startBpm + Math.round((bpmDragRef.current.startY - evt.clientY) * 0.5)
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
    <div
      className="flex-shrink-0 flex items-center gap-1 px-2"
      style={{
        height: 38,
        background: 'linear-gradient(180deg, #2c2c2c 0%, #1f1f1f 100%)',
        borderBottom: '1px solid #0d0d0d',
        borderTop: '1px solid #0d0d0d',
      }}
    >
      {/* ── FL Logo ── */}
      <div
        className="flex items-center justify-center font-bold text-black mr-1 flex-shrink-0"
        style={{
          width: 24,
          height: 24,
          background: 'linear-gradient(135deg, #ffb340 0%, #ff6a00 100%)',
          border: '1px solid #cc4400',
          borderRadius: 1,
          fontSize: 11,
          boxShadow: '0 0 8px rgba(255,106,0,0.4)',
        }}
      >
        F
      </div>

      <div className="fl-divider-v" style={{ height: 24 }} />

      {/* ── Transport Buttons ── */}
      <div className="flex items-center gap-px">
        {/* Return to start */}
        <button
          className="fl-tbtn"
          title="Return to start"
          onClick={() => { setPlayPosition(0); lastStepRef.current = -1 }}
        >
          ⏮
        </button>

        {/* Rewind */}
        <button
          className="fl-tbtn"
          title="Rewind"
          onClick={() => setPlayPosition(Math.max(0, playPosition - 4))}
        >
          ◀◀
        </button>

        {/* Stop */}
        <button
          className="fl-tbtn"
          title="Stop"
          onClick={() => { setPlaying(false); setPlayPosition(0); lastStepRef.current = -1 }}
        >
          ■
        </button>

        {/* Play */}
        <button
          className={`fl-tbtn${isPlaying ? ' fl-tbtn--active' : ''}`}
          title={isPlaying ? 'Pause' : 'Play'}
          onClick={() => setPlaying(!isPlaying)}
          style={{ width: 34 }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Record */}
        <button
          className={`fl-tbtn fl-tbtn--rec${isRecording ? ' fl-tbtn--active' : ''}`}
          title="Record"
          onClick={() => setRecording(!isRecording)}
        >
          ⏺
        </button>
      </div>

      <div className="fl-divider-v mx-1" style={{ height: 24 }} />

      {/* ── Song Position Counter ── */}
      <div className="flex flex-col items-end" style={{ gap: 1 }}>
        <span style={{ fontSize: 8, textTransform: 'uppercase', color: '#666', letterSpacing: '0.1em' }}>
          pos
        </span>
        <div
          className="fl-lcd fl-lcd--green"
          style={{ fontSize: 16, letterSpacing: '0.14em', minWidth: 80, textAlign: 'right' }}
        >
          {String(bars).padStart(2, '0')}:{beats}:{ticks}
        </div>
      </div>

      <div className="fl-divider-v mx-1" style={{ height: 24 }} />

      {/* ── BPM ── */}
      <div
        className="flex flex-col items-center cursor-ns-resize select-none"
        style={{ gap: 1 }}
        onMouseDown={handleBpmMouseDown}
        title="Drag to change BPM"
      >
        <span style={{ fontSize: 8, textTransform: 'uppercase', color: '#666', letterSpacing: '0.1em' }}>
          bpm
        </span>
        <div className="fl-lcd" style={{ fontSize: 17, minWidth: 52, textAlign: 'center', letterSpacing: '0.08em' }}>
          {bpm}
        </div>
      </div>

      {/* ── Time Signature ── */}
      <div className="flex flex-col items-center" style={{ gap: 1, marginLeft: 2 }}>
        <span style={{ fontSize: 8, textTransform: 'uppercase', color: '#666', letterSpacing: '0.1em' }}>
          time
        </span>
        <div className="fl-lcd" style={{ fontSize: 14, minWidth: 30, textAlign: 'center' }}>
          {timeSignature[0]}/{timeSignature[1]}
        </div>
      </div>

      <div className="fl-divider-v mx-1" style={{ height: 24 }} />

      {/* ── Master Volume Knob ── */}
      <div className="fl-knob-wrap" style={{ marginRight: 2 }}>
        <span className="fl-knob-label">VOL</span>
        <MasterKnob defaultValue={80} />
      </div>

      {/* ── Master Pitch Knob ── */}
      <div className="fl-knob-wrap">
        <span className="fl-knob-label">PITCH</span>
        <MasterKnob defaultValue={64} />
      </div>

      <div className="fl-divider-v mx-1" style={{ height: 24 }} />

      {/* ── Key display ── */}
      <div className="flex flex-col items-center" style={{ gap: 1 }}>
        <span style={{ fontSize: 8, textTransform: 'uppercase', color: '#666', letterSpacing: '0.1em' }}>key</span>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#e8a000',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {key}
        </div>
      </div>

      {/* ── Play indicator LED ── */}
      <div className="ml-auto flex items-center gap-2 pr-1">
        {/* CPU/RAM meters — decorative */}
        <div className="flex flex-col gap-0.5" style={{ width: 28 }}>
          <CpuMeter label="CPU" value={isPlaying ? 42 : 12} />
          <CpuMeter label="RAM" value={34} />
        </div>

        {/* Status LED */}
        <div
          className={isPlaying ? 'fl-led fl-led--orange fl-pulse' : 'fl-led fl-led--off'}
          title={isPlaying ? 'Playing' : isRecording ? 'Recording' : 'Stopped'}
        />
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/* Master Knob — small circular knob with orange arc         */
/* ────────────────────────────────────────────────────────── */
function MasterKnob({ defaultValue }: { defaultValue: number }) {
  const norm  = defaultValue / 100
  const angle = -135 + norm * 270
  const r = 9, cx = 11, cy = 11
  const rad2 = (a: number) => a * Math.PI / 180
  // Arc path from -135° to current angle
  const arcPath = describeArc(cx, cy, r - 2, -135, angle)
  const ex = cx + r * Math.sin(rad2(angle))
  const ey = cy - r * Math.cos(rad2(angle))

  return (
    <svg width={22} height={22} style={{ cursor: 'ns-resize' }}>
      {/* Track arc */}
      <path d={describeArc(cx, cy, r - 2, -135, 135)} fill="none" stroke="#444" strokeWidth={2} strokeLinecap="butt" />
      {/* Fill arc */}
      <path d={arcPath} fill="none" stroke="#ff6a00" strokeWidth={2} strokeLinecap="butt" />
      {/* Body */}
      <circle cx={cx} cy={cy} r={r - 4} fill="#2a2a2a" stroke="#111" strokeWidth={1} />
      {/* Dot indicator */}
      <circle cx={ex} cy={ey} r={1.5} fill="#ff6a00" />
    </svg>
  )
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const toRad = (a: number) => a * Math.PI / 180
  const sx = cx + r * Math.sin(toRad(startAngle))
  const sy = cy - r * Math.cos(toRad(startAngle))
  const ex = cx + r * Math.sin(toRad(endAngle))
  const ey = cy - r * Math.cos(toRad(endAngle))
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`
}

/* ────────────────────────────────────────────────────────── */
/* CPU/RAM bar meter                                          */
/* ────────────────────────────────────────────────────────── */
function CpuMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ fontSize: 7, color: '#555', textTransform: 'uppercase', width: 20, flexShrink: 0, letterSpacing: '0.06em' }}>
        {label}
      </span>
      <div
        style={{
          width: 34,
          height: 4,
          background: '#0d0d0d',
          border: '1px solid #222',
          borderRadius: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${value}%`,
            background: value > 80 ? '#ff5252' : value > 60 ? '#ffea00' : '#00cc66',
          }}
        />
      </div>
    </div>
  )
}
