'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { stemApi, StemJob } from '@/lib/api'
import { Upload, Play, Pause, Download, ArrowRight, Mic, Music, Drumstick, Guitar } from 'lucide-react'
import toast from 'react-hot-toast'

const STEMS = [
  { key: 'vocals', label: 'Vocals',   icon: '🎤', color: '#ff6b00', urlKey: 'vocals_url' },
  { key: 'drums',  label: 'Drums',    icon: '🥁', color: '#ff5252', urlKey: 'drums_url'  },
  { key: 'bass',   label: 'Bass',     icon: '🎸', color: '#40c4ff', urlKey: 'bass_url'   },
  { key: 'other',  label: 'Other',    icon: '🎹', color: '#00e676', urlKey: 'other_url'  },
]

export function StemSplitter() {
  const [job, setJob] = useState<StemJob | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})
  const wsRef = useRef<WebSocket | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const connectWS = useCallback((jobId: string) => {
    const ws = new WebSocket(`ws://localhost:8000/ws/stems/${jobId}/`)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setJob(prev => prev ? { ...prev, status: data.status, progress: data.progress } : prev)
      if (data.status === 'done' || data.status === 'error') {
        ws.close()
        // Fetch final state with URLs
        stemApi.status(jobId).then(res => setJob(res.data))
      }
    }
    ws.onerror = () => {
      // Fallback to polling if WS fails
      pollRef.current = setInterval(async () => {
        const res = await stemApi.status(jobId)
        setJob(res.data)
        if (res.data.status === 'done' || res.data.status === 'error') {
          clearInterval(pollRef.current!)
        }
      }, 1500)
    }
    wsRef.current = ws
  }, [])

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file')
      return
    }
    setUploading(true)
    setJob(null)
    try {
      const res = await stemApi.upload(file, setUploadPct)
      const newJob: StemJob = res.data
      setJob(newJob)
      connectWS(newJob.id)
      toast.success('Upload complete! Splitting stems...')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadPct(0)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const togglePlay = (key: string, url: string) => {
    if (playingKey === key) {
      audioRefs.current[key]?.pause()
      setPlayingKey(null)
    } else {
      if (playingKey && audioRefs.current[playingKey]) {
        audioRefs.current[playingKey].pause()
      }
      if (!audioRefs.current[key]) {
        audioRefs.current[key] = new Audio(url)
        audioRefs.current[key].onended = () => setPlayingKey(null)
      }
      audioRefs.current[key].play()
      setPlayingKey(key)
    }
  }

  return (
    <div className="flex flex-col items-center p-8 gap-6 overflow-y-auto flex-1">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold tracking-[3px] uppercase">Stem Splitter</h2>
        <p className="text-daw-muted text-sm mt-1">
          Powered by Meta's Demucs AI · separates vocals, drums, bass & other
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        className="w-full max-w-xl h-36 border-2 border-dashed border-daw-bright rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:border-daw-accent hover:bg-daw-accent/5 relative group"
      >
        <input
          type="file" accept="audio/*" className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Upload size={32} className="text-daw-muted group-hover:text-daw-accent transition-colors" />
        <div className="text-daw-muted text-sm">Drop audio here or click to browse</div>
        <div className="text-daw-faint text-xs">WAV · MP3 · OGG · FLAC · up to 50MB</div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="w-full max-w-xl">
          <div className="flex justify-between text-xs text-daw-muted mb-1">
            <span>Uploading...</span><span>{uploadPct}%</span>
          </div>
          <div className="h-1.5 bg-daw-raised rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-daw-accent to-daw-accent2 transition-all rounded-full" style={{ width: `${uploadPct}%` }} />
          </div>
        </div>
      )}

      {/* Job progress */}
      {job && job.status !== 'done' && job.status !== 'error' && (
        <div className="w-full max-w-xl bg-daw-panel border border-daw-border rounded-xl p-5">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-daw-text font-semibold">
              {job.status === 'pending' ? '⏳ Queued...' : '⚙️ Splitting with Demucs AI...'}
            </span>
            <span className="text-daw-accent font-mono">{job.progress}%</span>
          </div>
          <div className="h-2 bg-daw-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-daw-accent to-daw-accent2 transition-all rounded-full"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {STEMS.map(s => (
              <div key={s.key} className="text-center p-2 bg-daw-raised rounded-lg">
                <div className="text-2xl">{s.icon}</div>
                <div className="text-xs text-daw-muted mt-1">{s.label}</div>
                <div className="text-xs text-daw-faint mt-1">
                  {job.progress > 20 + STEMS.indexOf(s) * 15 ? '✓' : '...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {job?.status === 'error' && (
        <div className="w-full max-w-xl bg-red-900/20 border border-daw-red rounded-xl p-4 text-daw-red text-sm">
          ⚠ Splitting failed: {job.error_message || 'Unknown error'}
        </div>
      )}

      {/* Results */}
      {job?.status === 'done' && (
        <div className="w-full max-w-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 text-daw-green text-sm font-semibold">
            <span>✓</span> Stems ready! — {job.original_filename}
          </div>
          {STEMS.map(s => {
            const url = (job as any)[s.urlKey]
            if (!url) return null
            return (
              <StemCard
                key={s.key}
                stemKey={s.key}
                label={s.label}
                icon={s.icon}
                color={s.color}
                url={url}
                isPlaying={playingKey === s.key}
                onTogglePlay={() => togglePlay(s.key, url)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function StemCard({ stemKey, label, icon, color, url, isPlaying, onTogglePlay }: {
  stemKey: string, label: string, icon: string, color: string, url: string,
  isPlaying: boolean, onTogglePlay: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!url || !canvasRef.current) return
    // Draw fake waveform (real data would come from /api/audio/waveform/)
    const canvas = canvasRef.current
    canvas.width = canvas.parentElement?.offsetWidth ?? 500
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#111115'
    ctx.fillRect(0, 0, canvas.width, 56)
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < canvas.width; x++) {
      const v = Math.sin(x * 0.05) * 0.4 + Math.sin(x * 0.13) * 0.3 + (Math.random() - 0.5) * 0.15
      const y = 28 + v * 20
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [url, color])

  return (
    <div className="bg-daw-panel border border-daw-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-daw-border">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold tracking-wide" style={{ color }}>{label}</span>
        </div>
        <input type="range" min={0} max={100} defaultValue={80} className="w-20" />
      </div>
      <canvas ref={canvasRef} height={56} className="w-full" />
      <div className="flex gap-2 px-4 py-2.5">
        <button
          onClick={onTogglePlay}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border border-daw-border bg-daw-raised hover:bg-daw-hover transition-all text-daw-text"
        >
          {isPlaying ? <Pause size={11} /> : <Play size={11} />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <a
          href={url} download={`${label.toLowerCase()}.mp3`}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border border-daw-border bg-daw-raised hover:bg-daw-hover transition-all text-daw-text"
        >
          <Download size={11} /> Export
        </a>
      </div>
    </div>
  )
}
