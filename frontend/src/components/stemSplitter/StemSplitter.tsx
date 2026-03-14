'use client'
import { useState, useRef, useCallback } from 'react'
import { apiClient, pollJob, StemJob } from '@/lib/api'

const STEM_DEFS = [
  { key: 'vocals', label: 'Vocals', icon: '🎤', color: '#ff6b00' },
  { key: 'drums',  label: 'Drums',  icon: '🥁', color: '#ff5252' },
  { key: 'bass',   label: 'Bass',   icon: '🎸', color: '#40c4ff' },
  { key: 'other',  label: 'Other',  icon: '🎹', color: '#00e676' },
]

export function StemSplitter() {
  const [job, setJob] = useState<StemJob | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const stopPollRef = useRef<(() => void) | null>(null)

  const checkBackend = useCallback(async () => {
    try {
      await apiClient.health()
      setBackendOnline(true)
    } catch {
      setBackendOnline(false)
    }
  }, [])

  const handleFile = async (file: File) => {
    if (!file) return
    setUploading(true); setUploadPct(0); setJob(null)
    try {
      const { data } = await apiClient.splitStems(file, setUploadPct)
      setUploading(false)
      setJob({ job_id: data.job_id, status: 'queued', progress: 0, error: null, filename: file.name, stems: {} })
      if (stopPollRef.current) stopPollRef.current()
      stopPollRef.current = pollJob(data.job_id, (j) => setJob(j))
    } catch (e: any) {
      setUploading(false)
      setBackendOnline(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const progress = uploading ? uploadPct : (job?.progress ?? 0)

  return (
    <div className="flex flex-col flex-1 items-center overflow-y-auto p-8 gap-6">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold uppercase tracking-[3px]">Stem Splitter</h2>
        <p className="text-text-dim mt-1">
          AI-powered stem separation using{' '}
          <span className="text-accent font-semibold">Demucs</span> (Meta Research)
        </p>
        {backendOnline === null && (
          <button onClick={checkBackend} className="mt-2 text-[11px] text-text-dim underline hover:text-text">
            Check backend status
          </button>
        )}
        {backendOnline === false && (
          <div className="mt-2 px-3 py-1.5 bg-[#2a1010] border border-daw-red/40 rounded text-[12px] text-daw-red">
            ⚠ Django backend offline — start with <code className="bg-black/30 px-1 rounded">python manage.py runserver</code>
          </div>
        )}
        {backendOnline === true && (
          <div className="mt-2 text-[12px] text-daw-green">✓ Backend connected</div>
        )}
      </div>

      {/* Drop Zone */}
      <div
        className={`w-full max-w-[600px] h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all relative
          ${dragOver ? 'border-accent bg-[#ff6b0015]' : 'border-border-bright bg-raised hover:border-accent hover:bg-[#ff6b000a]'}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input type="file" accept="audio/*" className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <div className="text-4xl pointer-events-none">🎵</div>
        <div className="text-[15px] text-text-dim pointer-events-none">
          {dragOver ? 'Drop to split!' : 'Drop audio file here or click to browse'}
        </div>
        <div className="text-[12px] text-text-faint pointer-events-none">WAV · MP3 · OGG · FLAC · up to 200MB</div>
      </div>

      {/* Progress */}
      {(uploading || (job && job.status !== 'done' && job.status !== 'error')) && (
        <div className="w-full max-w-[600px] flex flex-col gap-2">
          <div className="flex justify-between text-[12px] text-text-dim">
            <span>{uploading ? 'Uploading...' : `Processing: ${job?.filename}`}</span>
            <span className="text-accent font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-raised rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="text-[11px] text-text-faint text-center animate-pulse-glow">
            {uploading
              ? 'Uploading audio...'
              : job?.status_detail ||
                (job?.status === 'queued'
                  ? 'Queued — waiting for worker...'
                  : 'Running Demucs AI model (htdemucs)...')}
          </div>
        </div>
      )}

      {/* Error */}
      {job?.status === 'error' && (
        <div className="w-full max-w-[600px] p-4 bg-[#2a1010] border border-daw-red/40 rounded-lg text-daw-red text-[13px]">
          ❌ Error: {job.error}
        </div>
      )}

      {/* Stems */}
      {job?.status === 'done' && (
        <div className="w-full max-w-[600px] flex flex-col gap-3 animate-slide-up">
          <div className="text-[13px] text-daw-green font-semibold">
            ✓ Stems ready — {job.filename}
          </div>
          {STEM_DEFS.map(def => (
            <StemCard key={def.key} def={def} url={job.stems[def.key]} />
          ))}
        </div>
      )}
    </div>
  )
}

function StemCard({ def, url }: { def: typeof STEM_DEFS[0]; url?: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const togglePlay = () => {
    if (!url) return
    if (!audioRef.current) {
      audioRef.current = new Audio(url)
      audioRef.current.onended = () => setPlaying(false)
    }
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  return (
    <div className="bg-panel border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-raised border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">{def.icon}</span>
          <span className="text-[14px] font-semibold tracking-wider" style={{ color: def.color }}>{def.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} defaultValue={80} className="w-16" title="Volume" />
        </div>
      </div>

      {/* Waveform placeholder */}
      <div className="h-12 mx-3 my-2 rounded" style={{ background: `${def.color}18` }}>
        <WaveformBar color={def.color} active={playing} />
      </div>

      <div className="flex gap-2 px-3 pb-3">
        <button onClick={togglePlay}
          className={`btn-sm ${playing ? 'text-daw-green border-daw-green/50 bg-daw-green/10' : ''}`}>
          {playing ? '⏸ Stop' : '▶ Play'}
        </button>
        {url && (
          <a href={url} download className="btn-sm">⬇ Export WAV</a>
        )}
        {!url && <span className="text-[11px] text-text-faint italic mt-1">— stem not available —</span>}
      </div>

      <style jsx>{`
        .btn-sm {
          padding: 4px 12px;
          border-radius: 4px;
          border: 1px solid #3a3a44;
          background: #2a2a30;
          color: #e0e0e8;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: all 0.1s;
        }
        .btn-sm:hover { background: #32323a; border-color: #555566; }
      `}</style>
    </div>
  )
}

function WaveformBar({ color, active }: { color: string; active: boolean }) {
  return (
    <div className="flex items-center h-full px-2 gap-[2px]">
      {Array.from({ length: 60 }).map((_, i) => {
        const h = 20 + Math.sin(i * 0.8) * 15 + Math.sin(i * 0.3) * 10 + Math.random() * 8
        return (
          <div key={i} className="flex-1 rounded-sm transition-all duration-75"
            style={{
              height: `${h}%`,
              background: active ? color : color + '66',
              animationDelay: `${i * 0.02}s`,
            }} />
        )
      })}
    </div>
  )
}
