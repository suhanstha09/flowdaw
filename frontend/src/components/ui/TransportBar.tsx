'use client'
import { useRef } from 'react'
import { useDawStore } from '@/store/dawStore'

export function TransportBar() {
  const { bpm, isPlaying, isRecording, playPosition, key, timeSignature,
          setBpm, setPlaying, setRecording, setPlayPosition } = useDawStore()
  const bpmDragRef = useRef<{ startY: number; startBpm: number } | null>(null)

  const bars = Math.floor(playPosition / 4) + 1
  const beats = Math.floor(playPosition % 4) + 1
  const ticks = String(Math.floor((playPosition % 1) * 1000)).padStart(3, '0')

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
        <TBtn onClick={() => { setPlaying(false); setPlayPosition(0) }} title="Stop">⏹</TBtn>
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
