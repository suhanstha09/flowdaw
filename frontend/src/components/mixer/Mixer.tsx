'use client'
import { useEffect, useRef, useState } from 'react'
import { useDawStore, MixerChannel } from '@/store/dawStore'

export function Mixer() {
  const { mixerChannels, isPlaying, updateMixerChannel } = useDawStore()
  const [vuLevels, setVuLevels] = useState<number[]>(mixerChannels.map(() => 0))

  useEffect(() => {
    const id = setInterval(() => {
      setVuLevels(mixerChannels.map((ch, i) => {
        if (ch.muted) return 0
        const base = isPlaying ? ch.volume * 65 + Math.random() * 35 : Math.random() * 4
        return Math.min(100, base)
      }))
    }, 80)
    return () => clearInterval(id)
  }, [mixerChannels, isPlaying])

  return (
    <div className="flex flex-1 overflow-x-auto bg-base p-4 gap-3 items-end">
      {mixerChannels.map((ch, i) => (
        <ChannelStrip key={ch.id} ch={ch} vu={vuLevels[i]} isMaster={i===0}
          onUpdate={(u) => updateMixerChannel(ch.id, u)} />
      ))}
    </div>
  )
}

function ChannelStrip({ ch, vu, isMaster, onUpdate }: {
  ch: MixerChannel; vu: number; isMaster: boolean
  onUpdate: (u: Partial<MixerChannel>) => void
}) {
  const faderRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startVol: number } | null>(null)

  const handleFaderDown = (e: React.MouseEvent) => {
    dragRef.current = { startY: e.clientY, startVol: ch.volume }
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const delta = (dragRef.current.startY - e.clientY) / 88
      const vol = Math.max(0, Math.min(1, dragRef.current.startVol + delta))
      onUpdate({ volume: vol })
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const vuColor = vu > 85 ? '#ff5252' : vu > 70 ? '#ffea00' : '#00e676'

  return (
    <div className={`flex flex-col items-center gap-2 rounded-lg border p-2 flex-shrink-0 ${
      isMaster
        ? 'w-[86px] border-accent-dim bg-[#1e1810]'
        : 'w-[70px] border-border bg-panel'
    }`}>
      <div className={`text-[11px] font-semibold tracking-wider truncate w-full text-center ${isMaster ? 'text-accent' : 'text-text-dim'}`}>
        {ch.name}
      </div>

      {/* FX Slots */}
      <div className="w-full flex flex-col gap-0.5">
        {[0,1].map(fi => (
          <div key={fi} className={`h-4 rounded border text-[9px] flex items-center justify-center truncate px-1 cursor-pointer transition-colors ${
            ch.fx[fi] ? 'border-[#1a4a6a] text-daw-blue bg-[#111a22]' : 'border-border text-text-faint bg-raised hover:border-border-bright'
          }`}>
            {ch.fx[fi] || '—'}
          </div>
        ))}
      </div>

      {/* VU Meter */}
      <div className="w-6 h-28 bg-[#0e0e14] border border-border rounded overflow-hidden flex flex-col justify-end">
        <div
          className="w-full rounded-sm transition-all duration-75"
          style={{
            height: `${vu}%`,
            background: `linear-gradient(to top, #00e676, #ffea00 70%, #ff5252 90%)`,
          }}
        />
      </div>

      {/* Fader */}
      <div className="h-24 flex flex-col items-center relative w-full" ref={faderRef}>
        <div className="w-1 h-full bg-[#0e0e14] border border-border rounded-full relative mx-auto">
          <div
            className="w-8 h-3.5 bg-gradient-to-b from-[#555] to-[#2a2a2a] border border-border-bright rounded cursor-ns-resize flex items-center justify-center absolute left-1/2 -translate-x-1/2 select-none"
            style={{ top: `${(1-ch.volume)*76}px` }}
            onMouseDown={handleFaderDown}
          >
            <div className="w-3/4 h-px bg-border-bright" />
          </div>
        </div>
      </div>
      <div className="font-mono text-[10px] text-text-dim">{Math.round(ch.volume*100)}</div>

      {/* Pan Knob */}
      <PanKnob value={ch.pan} onChange={v => onUpdate({ pan: v })} />

      {/* M / S */}
      <div className="flex gap-1">
        <button
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all ${ch.muted ? 'bg-daw-yellow border-daw-yellow text-black' : 'bg-raised border-border text-text-dim hover:text-text'}`}
          onClick={() => onUpdate({ muted: !ch.muted })}>M</button>
        <button
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all ${ch.soloed ? 'bg-daw-green border-daw-green text-black' : 'bg-raised border-border text-text-dim hover:text-text'}`}
          onClick={() => onUpdate({ soloed: !ch.soloed })}>S</button>
      </div>
    </div>
  )
}

function PanKnob({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const norm = (value + 1) / 2
  const angle = -135 + norm * 270
  const r = 12, cx = 14, cy = 14
  const rad = angle * Math.PI / 180
  const ex = cx + r * Math.sin(rad), ey = cy - r * Math.cos(rad)
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null)

  const handleDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startVal: value }
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const delta = (dragRef.current.startY - e.clientY) / 100
      onChange(Math.max(-1, Math.min(1, dragRef.current.startVal + delta)))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="flex flex-col items-center gap-0.5 cursor-ns-resize">
      <span className="text-[8px] text-text-dim uppercase tracking-wider">Pan</span>
      <svg width="28" height="28" onMouseDown={handleDown}>
        <circle cx={cx} cy={cy} r={r} fill="#0e0e14" stroke="#3a3a44" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r-4} fill="#18181f" stroke="#2a2a34" strokeWidth="1" />
        <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="#ff6b00" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}
