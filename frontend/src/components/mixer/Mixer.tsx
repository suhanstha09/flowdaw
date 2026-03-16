'use client'
import { useEffect, useRef, useState } from 'react'
import { useDawStore, MixerChannel } from '@/store/dawStore'

const STRIP_W  = 52   // FL Studio default strip width
const MASTER_W = 64

export function Mixer() {
  const { mixerChannels, isPlaying, updateMixerChannel } = useDawStore()
  const [vuLevels, setVuLevels] = useState<number[]>(mixerChannels.map(() => 0))

  useEffect(() => {
    const id = setInterval(() => {
      setVuLevels(mixerChannels.map((ch) => {
        if (ch.muted) return 0
        const base = isPlaying ? ch.volume * 68 + Math.random() * 28 : Math.random() * 3
        return Math.min(100, base)
      }))
    }, 80)
    return () => clearInterval(id)
  }, [mixerChannels, isPlaying])

  return (
    <div
      className="flex overflow-x-auto"
      style={{
        background: '#1a1a1a',
        height: '100%',
        alignItems: 'stretch',
        gap: 0,
        padding: '0 6px',
        paddingTop: 4,
        paddingBottom: 6,
      }}
    >
      {mixerChannels.map((ch, i) => (
        <ChannelStrip
          key={ch.id}
          ch={ch}
          vu={vuLevels[i]}
          isMaster={i === 0}
          onUpdate={(u) => updateMixerChannel(ch.id, u)}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────── */
/* Channel Strip                           */
/* ─────────────────────────────────────── */
function ChannelStrip({
  ch, vu, isMaster, onUpdate,
}: {
  ch: MixerChannel; vu: number; isMaster: boolean
  onUpdate: (u: Partial<MixerChannel>) => void
}) {
  const faderRef = useRef<HTMLDivElement>(null)
  const dragRef  = useRef<{ startY: number; startVol: number } | null>(null)

  const handleFaderDown = (e: React.MouseEvent) => {
    dragRef.current = { startY: e.clientY, startVol: ch.volume }
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const delta = (dragRef.current.startY - e.clientY) / 90
      onUpdate({ volume: Math.max(0, Math.min(1, dragRef.current.startVol + delta)) })
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const w = isMaster ? MASTER_W : STRIP_W

  return (
    <div
      style={{
        width: w,
        minWidth: w,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        paddingTop: 4,
        paddingBottom: 4,
        borderRight: '1px solid #0d0d0d',
        background: isMaster ? '#222218' : '#1e1e1e',
      }}
    >
      {/* Channel number */}
      <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {isMaster ? 'MST' : String(ch.name).slice(0, 4).toUpperCase()}
      </div>

      {/* Mini EQ curve display */}
      <MiniEq color={isMaster ? '#ff6a00' : '#00c8ff'} muted={ch.muted} />

      {/* FX slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: '90%' }}>
        {ch.fx.slice(0, 2).map((fx, fi) => (
          <div
            key={fi}
            style={{
              height: 13,
              fontSize: 8,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 2px',
              background: fx ? '#0e1e2a' : '#222222',
              border: `1px solid ${fx ? '#1a5a7a' : '#0d0d0d'}`,
              color: fx ? '#00c8ff' : '#444',
              borderRadius: 1,
              cursor: 'pointer',
            }}
          >
            {fx || '—'}
          </div>
        ))}
      </div>

      {/* VU Meter + Fader — side by side */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', flexShrink: 0, height: 110 }}>
        {/* VU meter */}
        <VuMeter level={vu} />

        {/* Fader */}
        <div
          ref={faderRef}
          style={{ position: 'relative', width: 10, height: 96, flexShrink: 0 }}
        >
          {/* Track */}
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 3,
            height: '100%',
            background: '#111',
            border: '1px solid #0d0d0d',
            borderRadius: 0,
          }} />
          {/* Thumb */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: `${(1 - ch.volume) * 76}px`,
              width: 18,
              height: 10,
              background: 'linear-gradient(180deg, #606060 0%, #3a3a3a 100%)',
              border: '1px solid #0d0d0d',
              borderBottom: '1px solid #666',
              borderRight: '1px solid #555',
              borderRadius: 1,
              cursor: 'ns-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              zIndex: 2,
            }}
            onMouseDown={handleFaderDown}
          >
            <div style={{ width: '70%', height: 1, background: '#888' }} />
          </div>
        </div>
      </div>

      {/* Volume readout */}
      <div style={{ fontSize: 9, fontFamily: 'Courier New, monospace', color: '#666' }}>
        {Math.round(ch.volume * 100)}
      </div>

      {/* Pan knob */}
      <PanKnob value={ch.pan} onChange={(v) => onUpdate({ pan: v })} />

      {/* M / S buttons */}
      <div style={{ display: 'flex', gap: 2 }}>
        <button
          onClick={() => onUpdate({ muted: !ch.muted })}
          style={{
            width: 18, height: 14,
            fontSize: 8,
            fontWeight: 700,
            cursor: 'pointer',
            background: ch.muted ? '#ffea00' : '#2e2e2e',
            color: ch.muted ? '#000' : '#888',
            border: `1px solid ${ch.muted ? '#ccbb00' : '#0d0d0d'}`,
            borderBottom: `1px solid ${ch.muted ? '#ddcc00' : '#444'}`,
            borderRadius: 1,
            textTransform: 'uppercase',
          }}
        >M</button>
        <button
          onClick={() => onUpdate({ soloed: !ch.soloed })}
          style={{
            width: 18, height: 14,
            fontSize: 8,
            fontWeight: 700,
            cursor: 'pointer',
            background: ch.soloed ? '#00e676' : '#2e2e2e',
            color: ch.soloed ? '#000' : '#888',
            border: `1px solid ${ch.soloed ? '#00aa55' : '#0d0d0d'}`,
            borderBottom: `1px solid ${ch.soloed ? '#00cc66' : '#444'}`,
            borderRadius: 1,
            textTransform: 'uppercase',
          }}
        >S</button>
      </div>

      {/* Channel name — rotated label */}
      <div
        style={{
          fontSize: 9,
          color: isMaster ? '#ff6a00' : '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          maxWidth: w - 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          fontWeight: 600,
        }}
      >
        {ch.name}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────── */
/* VU Meter — green/yellow/red segments    */
/* ─────────────────────────────────────── */
function VuMeter({ level }: { level: number }) {
  const segments = 20
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: 1,
      width: 8,
      height: 96,
      justifyContent: 'flex-start',
    }}>
      {Array.from({ length: segments }).map((_, i) => {
        const threshold = ((i + 1) / segments) * 100
        const active    = level >= threshold
        const color     = threshold > 90 ? '#ff5252' : threshold > 75 ? '#ffea00' : '#00e676'
        return (
          <div
            key={i}
            style={{
              flex: 1,
              background: active ? color : '#1a1a1a',
              border: '0.5px solid #0d0d0d',
              borderRadius: 0,
            }}
          />
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────── */
/* Mini EQ display — small graph           */
/* ─────────────────────────────────────── */
function MiniEq({ color, muted }: { color: string; muted: boolean }) {
  const points = [2, 4, 3, 5, 6, 8, 7, 5, 4, 3, 2]
  const max    = 10
  const W = 38, H = 22
  const ptStr  = points.map((v, i) => `${(i / (points.length - 1)) * W},${H - (v / max) * (H - 4) - 2}`).join(' ')
  return (
    <div style={{
      width: W,
      height: H,
      background: '#0a0a0a',
      border: '1px solid #0d0d0d',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <svg width={W} height={H}>
        <polyline
          points={ptStr}
          fill="none"
          stroke={muted ? '#333' : color}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

/* ─────────────────────────────────────── */
/* Pan Knob                                */
/* ─────────────────────────────────────── */
function PanKnob({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const norm  = (value + 1) / 2
  const angle = -135 + norm * 270
  const r = 9, cx = 11, cy = 11
  const toRad = (a: number) => a * Math.PI / 180
  const ex = cx + r * Math.sin(toRad(angle))
  const ey = cy - r * Math.cos(toRad(angle))
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null)

  const handleDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startVal: value }
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      onChange(Math.max(-1, Math.min(1, dragRef.current.startVal + (dragRef.current.startY - e.clientY) / 100)))
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, cursor: 'ns-resize' }}>
      <span style={{ fontSize: 8, textTransform: 'uppercase', color: '#555', letterSpacing: '0.08em' }}>PAN</span>
      <svg width={22} height={22} onMouseDown={handleDown}>
        {/* Track arc */}
        <path d={arc(cx, cy, r - 2, -135, 135)} fill="none" stroke="#444" strokeWidth={2} strokeLinecap="butt" />
        {/* Value arc — center to current */}
        <path d={arc(cx, cy, r - 2, -135 + 135, angle)} fill="none" stroke="#ff6a00" strokeWidth={2} strokeLinecap="butt" />
        {/* Body */}
        <circle cx={cx} cy={cy} r={r - 4} fill="#1e1e1e" stroke="#0d0d0d" strokeWidth={1} />
        {/* Indicator dot */}
        <circle cx={ex} cy={ey} r={1.5} fill="#ff6a00" />
      </svg>
    </div>
  )
}

function arc(cx: number, cy: number, r: number, startA: number, endA: number) {
  const toRad = (a: number) => a * Math.PI / 180
  const sx = cx + r * Math.sin(toRad(startA)), sy = cy - r * Math.cos(toRad(startA))
  const ex = cx + r * Math.sin(toRad(endA)),   ey = cy - r * Math.cos(toRad(endA))
  const large = Math.abs(endA - startA) > 180 ? 1 : 0
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`
}
