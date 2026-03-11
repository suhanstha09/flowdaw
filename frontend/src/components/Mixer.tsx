'use client'
import { useEffect, useRef, useState } from 'react'
import { useDAWStore } from '@/lib/store'
import { mixerApi, MixerChannel } from '@/lib/api'

const DEFAULT_CHANNELS = [
  { name: 'Master', vol: 0.8, pan: 0, fx: ['Limiter', 'EQ'], is_master: true },
  { name: 'Kick',   vol: 0.8, pan: 0, fx: [] },
  { name: 'Bass',   vol: 0.7, pan: -0.2, fx: ['Compressor'] },
  { name: 'Lead',   vol: 0.75,pan: 0.3, fx: ['Reverb', 'Delay'] },
  { name: 'Pad',    vol: 0.6, pan: 0, fx: ['Reverb'] },
  { name: 'Send A', vol: 0.5, pan: 0, fx: ['Reverb'] },
  { name: 'Send B', vol: 0.5, pan: 0, fx: ['Delay'] },
]

export function Mixer() {
  const { currentProject, isPlaying } = useDAWStore()
  const [channels, setChannels] = useState(
    DEFAULT_CHANNELS.map((c, i) => ({ ...c, id: String(i), muted: false, soloed: false, order: i }))
  )

  // VU meter animation
  const vuRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const animRef = useRef<number>()

  useEffect(() => {
    const animate = () => {
      channels.forEach((ch, i) => {
        const el = vuRefs.current[String(i)]
        if (!el) return
        const base = isPlaying && !ch.muted ? ch.vol * 65 + Math.random() * 35 : Math.random() * 4
        el.style.height = Math.min(100, base) + '%'
      })
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [isPlaying, channels])

  const updateChannel = (idx: number, patch: Partial<typeof channels[0]>) => {
    setChannels(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }

  return (
    <div className="flex flex-1 overflow-x-auto bg-daw-base p-4 gap-2 items-end">
      {channels.map((ch, ci) => (
        <ChannelStrip
          key={ci}
          channel={ch}
          isMaster={ch.is_master ?? false}
          vuRef={el => { vuRefs.current[String(ci)] = el }}
          onUpdate={patch => updateChannel(ci, patch)}
        />
      ))}
    </div>
  )
}

function ChannelStrip({ channel, isMaster, vuRef, onUpdate }: {
  channel: any, isMaster: boolean,
  vuRef: (el: HTMLDivElement | null) => void,
  onUpdate: (patch: any) => void
}) {
  const faderRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ y: 0, vol: 0 })

  const startFaderDrag = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    dragStartRef.current = { y: e.clientY, vol: channel.vol }
    const onMove = (ev: MouseEvent) => {
      const delta = (dragStartRef.current.y - ev.clientY) / 80
      onUpdate({ vol: Math.max(0, Math.min(1, dragStartRef.current.vol + delta)) })
    }
    const onUp = () => {
      isDraggingRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const fxSlots = ['', '', ''].map((_, i) => channel.fx[i] || null)

  return (
    <div className={`flex flex-col items-center gap-2 px-2 py-3 rounded-lg border flex-shrink-0 ${
      isMaster
        ? 'w-24 border-daw-dim bg-[#1e1810]'
        : 'w-[72px] border-daw-border bg-daw-panel'
    }`}>
      {/* Name */}
      <div className={`text-[11px] font-semibold text-center truncate w-full tracking-wide ${isMaster ? 'text-daw-accent' : 'text-daw-muted'}`}>
        {channel.name}
      </div>

      {/* FX Slots */}
      <div className="flex flex-col gap-1 w-full">
        {fxSlots.map((fx, i) => (
          <div key={i} className={`h-4 rounded text-[9px] flex items-center justify-center border cursor-pointer transition-colors ${
            fx ? 'text-daw-blue border-blue-900 hover:border-blue-600' : 'text-daw-faint border-daw-border hover:border-daw-bright'
          }`}>
            {fx || '—'}
          </div>
        ))}
      </div>

      {/* VU Meter */}
      <div className="w-5 h-28 bg-daw-raised border border-daw-border rounded overflow-hidden flex flex-col justify-end">
        <div
          ref={vuRef}
          className="w-full rounded transition-none"
          style={{
            background: 'linear-gradient(to top, #00e676, #ffea00 70%, #ff5252 90%)',
            height: '0%'
          }}
        />
      </div>

      {/* Fader */}
      <div className="h-24 w-full flex justify-center relative">
        <div
          ref={faderRef}
          className="w-1 h-full bg-daw-raised border border-daw-border rounded relative cursor-pointer"
        >
          <div
            onMouseDown={startFaderDrag}
            className="w-8 h-3 bg-gradient-to-b from-[#555] to-[#333] border border-daw-bright rounded absolute left-1/2 -translate-x-1/2 cursor-ns-resize flex items-center justify-center"
            style={{ top: `${(1 - channel.vol) * 84}%` }}
          >
            <div className="w-3/4 h-px bg-daw-bright" />
          </div>
        </div>
      </div>
      <div className="text-[10px] font-mono text-daw-muted">{Math.round(channel.vol * 100)}</div>

      {/* Pan knob */}
      <PanKnob value={channel.pan} onChange={pan => onUpdate({ pan })} />

      {/* Mute/Solo */}
      <div className="flex gap-1">
        <button
          onClick={() => onUpdate({ muted: !channel.muted })}
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all ${
            channel.muted ? 'bg-daw-yellow text-black border-daw-yellow' : 'bg-daw-raised border-daw-border text-daw-muted hover:text-daw-text'
          }`}
        >
          M
        </button>
        <button
          onClick={() => onUpdate({ soloed: !channel.soloed })}
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all ${
            channel.soloed ? 'bg-daw-green text-black border-daw-green' : 'bg-daw-raised border-daw-border text-daw-muted hover:text-daw-text'
          }`}
        >
          S
        </button>
      </div>
    </div>
  )
}

function PanKnob({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  const norm = (value + 1) / 2
  const angle = -135 + norm * 270
  const rad = angle * Math.PI / 180
  const r = 11, cx = 14, cy = 14
  const ex = cx + r * Math.sin(rad), ey = cy - r * Math.cos(rad)

  const startDrag = (e: React.MouseEvent) => {
    const startY = e.clientY, startVal = value
    const onMove = (ev: MouseEvent) => {
      const delta = (startY - ev.clientY) * 0.02
      onChange(Math.max(-1, Math.min(1, startVal + delta)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="28" height="28" className="cursor-ns-resize" onMouseDown={startDrag}>
        <circle cx={cx} cy={cy} r={r} fill="#111" stroke="#444" strokeWidth="1"/>
        <circle cx={cx} cy={cy} r={r - 3} fill="#1a1a22" stroke="#333" strokeWidth="1"/>
        <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="#ff6b00" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span className="text-[9px] text-daw-muted uppercase tracking-wide">Pan</span>
    </div>
  )
}
