'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient, pollJob, StemJob } from '@/lib/api'

const STEM_DEFS = [
  { key: 'vocals', label: 'Vocals', short: 'VOX', slot: 'Insert 1', color: '#ff8a1f' },
  { key: 'drums', label: 'Drums', short: 'DRM', slot: 'Insert 2', color: '#ff5252' },
  { key: 'bass', label: 'Bass', short: 'BASS', slot: 'Insert 3', color: '#40c4ff' },
  { key: 'other', label: 'Other', short: 'MUS', slot: 'Insert 4', color: '#00d084' },
] as const

type StemDef = (typeof STEM_DEFS)[number]
type StemKey = StemDef['key']
type StemSettings = Record<StemKey, { volume: number; pan: number }>

const DEFAULT_STEM_SETTINGS: StemSettings = {
  vocals: { volume: 82, pan: 0 },
  drums: { volume: 78, pan: 0 },
  bass: { volume: 74, pan: -8 },
  other: { volume: 76, pan: 6 },
}

export function StemSplitter() {
  const [job, setJob] = useState<StemJob | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [selectedStem, setSelectedStem] = useState<StemKey>('vocals')
  const [stemSettings, setStemSettings] = useState<StemSettings>(DEFAULT_STEM_SETTINGS)
  const stopPollRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      stopPollRef.current?.()
    }
  }, [])

  useEffect(() => {
    if (job?.status !== 'done') return
    const firstReadyStem = STEM_DEFS.find((def) => job.stems[def.key])
    if (firstReadyStem) {
      setSelectedStem(firstReadyStem.key)
    }
  }, [job])

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

    setUploading(true)
    setUploadPct(0)
    setJob(null)

    try {
      const { data } = await apiClient.splitStems(file, setUploadPct)
      setUploading(false)
      setBackendOnline(true)
      setJob({
        job_id: data.job_id,
        status: 'queued',
        progress: 0,
        error: null,
        filename: file.name,
        stems: {},
      })

      stopPollRef.current?.()
      stopPollRef.current = pollJob(data.job_id, (nextJob) => setJob(nextJob))
    } catch {
      setUploading(false)
      setBackendOnline(false)
    }
  }

  const onDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const progress = uploading ? uploadPct : (job?.progress ?? 0)
  const selectedStemDef = STEM_DEFS.find((stem) => stem.key === selectedStem) ?? STEM_DEFS[0]
  const readyStemCount = STEM_DEFS.filter((stem) => job?.stems[stem.key]).length

  const updateStemSetting = (stem: StemKey, key: 'volume' | 'pan', value: number) => {
    setStemSettings((current) => ({
      ...current,
      [stem]: {
        ...current[stem],
        [key]: value,
      },
    }))
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-[#17181d] text-text">
      <div className="flex flex-1 flex-col overflow-hidden border-t border-white/5 bg-[radial-gradient(circle_at_top,#272a33_0%,#1a1c22_30%,#14151a_100%)]">
        <div className="flex items-center justify-between border-b border-border bg-[#101115] px-5 py-3 shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]">
          <div>
            <div className="font-display text-[28px] font-bold uppercase tracking-[0.35em] text-[#f3f4f6]">
              Stem Rack
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.28em] text-text-dim">
              Source separation console · Demucs htdemucs engine
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ModuleChip label="Mode" value="Split" accent="text-accent" />
            <ModuleChip label="Output" value={`${readyStemCount}/4 stems`} accent="text-daw-green" />
            <ModuleChip label="Sync" value={backendOnline === false ? 'Offline' : 'Live'} accent={backendOnline === false ? 'text-daw-red' : 'text-daw-blue'} />
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[320px_minmax(0,1fr)_290px]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-[#1b1d24] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <PanelHeader title="Browser" subtitle="Import audio and monitor split status" />

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <label
                className={`relative flex min-h-[190px] cursor-pointer flex-col justify-between overflow-hidden rounded-xl border px-4 py-4 transition-all ${
                  dragOver
                    ? 'border-accent bg-[linear-gradient(180deg,rgba(255,107,0,0.22),rgba(255,107,0,0.08))] shadow-[0_0_40px_rgba(255,107,0,0.18)]'
                    : 'border-border-bright bg-[linear-gradient(180deg,#262932,#1a1c22)] hover:border-accent/70'
                }`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <input
                  type="file"
                  accept="audio/*"
                  className="absolute inset-0 opacity-0"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      handleFile(file)
                    }
                  }}
                />

                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.3em] text-text-dim">
                  <span>Audio Pool</span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[9px] text-text-faint">wav mp3 ogg flac</span>
                </div>

                <div>
                  <div className="font-display text-[34px] font-bold uppercase tracking-[0.16em] text-white">
                    {dragOver ? 'Drop To Load' : 'Load Sample'}
                  </div>
                  <div className="mt-2 max-w-[230px] text-[13px] leading-5 text-text-dim">
                    Route a track into the splitter rack and export four isolated stems directly from the console.
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-3">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-text-dim">
                    <span>Active file</span>
                    <span>{job?.filename ? formatShortName(job.filename) : 'Empty'}</span>
                  </div>
                  <div className="text-[12px] text-text-faint">
                    Click to browse or drag a song into this module.
                  </div>
                </div>
              </label>

              <div className="rounded-xl border border-border bg-[#14161b] p-4">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-text-dim">
                  <span>Engine Status</span>
                  <button onClick={checkBackend} className="text-text-dim transition hover:text-text">
                    Ping backend
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/5 bg-[#0f1014] px-3 py-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${backendOnline === false ? 'bg-daw-red shadow-[0_0_12px_rgba(255,82,82,0.9)]' : 'bg-daw-green shadow-[0_0_12px_rgba(0,230,118,0.8)]'}`} />
                  <div className="text-[12px] uppercase tracking-[0.18em] text-text">
                    {backendOnline === false ? 'Backend offline' : backendOnline === true ? 'Backend connected' : 'Backend not checked'}
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-[12px] text-text-dim">
                  <StatusRow label="Model" value="htdemucs" />
                  <StatusRow label="Queue" value={job?.status === 'queued' ? 'Waiting' : 'Ready'} />
                  <StatusRow label="Process" value={formatJobStatus(job?.status, uploading)} />
                </div>

                {backendOnline === false && (
                  <div className="mt-3 rounded-lg border border-daw-red/30 bg-[#2a1010] px-3 py-2 text-[12px] text-daw-red">
                    Start the Django API with python manage.py runserver from the backend folder.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-[#14161b] p-4">
                <div className="text-[10px] uppercase tracking-[0.28em] text-text-dim">Split Timeline</div>
                <div className="mt-4 space-y-3">
                  <TimelineStep label="Upload" active={uploading} complete={!uploading && !!job} />
                  <TimelineStep label="Queue" active={job?.status === 'queued'} complete={job?.status === 'processing' || job?.status === 'done'} />
                  <TimelineStep label="Demucs" active={job?.status === 'processing'} complete={job?.status === 'done'} />
                  <TimelineStep label="Export" active={job?.status === 'done'} complete={job?.status === 'done'} />
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-[#1b1d24] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <PanelHeader title="Channel Rack" subtitle="Each split stem lands on its own insert" />

            <div className="border-b border-border bg-[linear-gradient(180deg,#22252d,#1a1c22)] px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[200px] rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim">Current Source</div>
                  <div className="mt-1 text-[14px] font-semibold uppercase tracking-[0.08em] text-white">
                    {job?.filename ?? 'No file loaded'}
                  </div>
                </div>

                <div className="flex-1 rounded-lg border border-white/5 bg-black/20 px-3 py-3">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-text-dim">
                    <span>Global progress</span>
                    <span className="font-mono text-[13px] text-accent">{Math.round(progress)}%</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full border border-black/30 bg-[#0e1014]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#ff6b00,#ffc247)] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[12px] text-text-dim">
                    {uploading
                      ? 'Uploading source audio into the split queue.'
                      : job?.status === 'error'
                        ? job.error
                        : job?.status_detail || (job ? 'Waiting for split activity.' : 'Load an audio file to start the rack.')}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="grid min-w-[760px] grid-cols-4 gap-4">
                {STEM_DEFS.map((def) => (
                  <TrackStrip
                    key={def.key}
                    def={def}
                    url={job?.stems[def.key]}
                    progress={progress}
                    selected={selectedStem === def.key}
                    processing={job?.status === 'processing' || job?.status === 'queued' || uploading}
                    settings={stemSettings[def.key]}
                    onSelect={() => setSelectedStem(def.key)}
                    onAdjust={(key, value) => updateStemSetting(def.key, key, value)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-[#1b1d24] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <PanelHeader title="Master" subtitle="Inspect the selected insert and export results" />

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="rounded-xl border border-border bg-[linear-gradient(180deg,#20232b,#14161b)] p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-text-dim">Selected Insert</div>
                    <div className="mt-2 font-display text-[30px] font-bold uppercase tracking-[0.12em] text-white">
                      {selectedStemDef.label}
                    </div>
                    <div className="text-[12px] uppercase tracking-[0.18em] text-text-dim">{selectedStemDef.slot}</div>
                  </div>
                  <div className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em]" style={{ color: selectedStemDef.color }}>
                    {selectedStemDef.short}
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-white/5 bg-black/20 p-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim">Track Preview</div>
                  <div className="mt-3 h-20 rounded-lg border border-black/30 bg-[#0f1014] px-2 py-2">
                    <WaveformPreview color={selectedStemDef.color} density={1.2} active={Boolean(job?.stems[selectedStemDef.key])} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] text-text-dim">
                  <StatusCard label="Volume" value={`${stemSettings[selectedStemDef.key].volume}%`} />
                  <StatusCard label="Pan" value={formatPan(stemSettings[selectedStemDef.key].pan)} />
                  <StatusCard label="Split" value={job?.status === 'done' ? 'Rendered' : 'Standby'} />
                  <StatusCard label="Stem File" value={job?.stems[selectedStemDef.key] ? 'Available' : 'Pending'} />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-[#14161b] p-4">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-text-dim">
                  <span>Output Meter</span>
                  <span className="font-mono text-[12px] text-daw-green">-3.1 dB</span>
                </div>

                <div className="mt-4 flex items-end gap-2 rounded-lg border border-white/5 bg-[#0f1014] px-3 py-4">
                  {Array.from({ length: 18 }).map((_, index) => {
                    const height = 24 + ((index % 6) * 10) + (progress * 0.35)
                    const active = index < Math.max(2, Math.round(progress / 9))
                    return (
                      <div
                        key={index}
                        className={`flex-1 rounded-t-sm transition-all duration-200 ${active ? 'bg-[linear-gradient(180deg,#c9ff54,#00d084)]' : 'bg-[#252932]'}`}
                        style={{ height: `${Math.min(height, 100)}px` }}
                      />
                    )
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-[#14161b] p-4">
                <div className="text-[10px] uppercase tracking-[0.28em] text-text-dim">Export Bus</div>
                <div className="mt-3 space-y-2 text-[12px] text-text-dim">
                  <StatusRow label="Rendered stems" value={`${readyStemCount} / 4`} />
                  <StatusRow label="Container" value="wav" />
                  <StatusRow label="Action" value={job?.status === 'done' ? 'Ready to export' : 'Waiting'} />
                </div>
                {job?.status === 'error' && (
                  <div className="mt-3 rounded-lg border border-daw-red/30 bg-[#2a1010] px-3 py-2 text-[12px] text-daw-red">
                    Split failed: {job.error}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function TrackStrip({
  def,
  url,
  progress,
  selected,
  processing,
  settings,
  onSelect,
  onAdjust,
}: {
  def: StemDef
  url?: string
  progress: number
  selected: boolean
  processing: boolean
  settings: StemSettings[StemKey]
  onSelect: () => void
  onAdjust: (key: 'volume' | 'pan', value: number) => void
}) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const meterLevel = url ? Math.max(16, Math.round(settings.volume * 0.82)) : processing ? Math.max(8, Math.round(progress * 0.8)) : 0

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  const togglePlay = async () => {
    if (!url) return

    if (!audioRef.current) {
      audioRef.current = new Audio(url)
      audioRef.current.onended = () => setPlaying(false)
    }

    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
      return
    }

    try {
      audioRef.current.currentTime = 0
      await audioRef.current.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  return (
    <div
      className={`flex min-h-[580px] flex-col rounded-xl border transition-all ${
        selected ? 'border-accent bg-[linear-gradient(180deg,#252931,#181a20)] shadow-[0_0_0_1px_rgba(255,107,0,0.18),0_20px_50px_rgba(0,0,0,0.25)]' : 'border-border bg-[linear-gradient(180deg,#21242c,#17191f)]'
      }`}
      onClick={onSelect}
    >
      <div className="border-b border-border px-3 py-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-text-dim">
          <span>{def.slot}</span>
          <span className={`h-2 w-2 rounded-full ${url ? 'bg-daw-green shadow-[0_0_12px_rgba(0,230,118,0.7)]' : processing ? 'bg-accent shadow-[0_0_12px_rgba(255,107,0,0.7)]' : 'bg-[#3b404b]'}`} />
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="font-display text-[24px] font-bold uppercase tracking-[0.14em] text-white">{def.label}</div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-text-dim">{def.short}</div>
          </div>
          <div className="rounded border border-white/10 bg-black/25 px-2 py-1 font-mono text-[11px] text-text-dim">
            {url ? 'WAV' : processing ? 'BUSY' : 'WAIT'}
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-3 px-3 py-4">
        <div className="flex w-10 flex-col justify-end rounded-lg border border-black/30 bg-[#101217] px-1.5 py-2">
          {Array.from({ length: 16 }).map((_, index) => {
            const threshold = ((index + 1) / 16) * 100
            const active = meterLevel >= threshold
            const danger = threshold > 80
            return (
              <div
                key={index}
                className={`mb-1 h-3 rounded-sm transition-all ${
                  active
                    ? danger
                      ? 'bg-[#ff6b57]'
                      : threshold > 55
                        ? 'bg-[#d7ff49]'
                        : 'bg-[#00d084]'
                    : 'bg-[#232732]'
                }`}
              />
            )
          })}
        </div>

        <div className="flex flex-1 flex-col items-center rounded-lg border border-black/30 bg-[linear-gradient(180deg,#171920,#101217)] px-3 py-3">
          <div className="flex h-[220px] items-center justify-center">
            <input
              type="range"
              min={0}
              max={100}
              value={settings.volume}
              onChange={(event) => onAdjust('volume', Number(event.target.value))}
              className="track-slider"
              title={`${def.label} volume`}
            />
          </div>

          <div className="mt-2 rounded-md border border-white/10 bg-black/25 px-2 py-1 font-mono text-[12px] text-white">
            {settings.volume}
          </div>

          <div className="mt-5 w-full rounded-lg border border-black/30 bg-[#0d0f13] p-2">
            <div className="text-center text-[10px] uppercase tracking-[0.2em] text-text-dim">Pan</div>
            <input
              type="range"
              min={-50}
              max={50}
              value={settings.pan}
              onChange={(event) => onAdjust('pan', Number(event.target.value))}
              className="w-full"
              title={`${def.label} pan`}
            />
            <div className="text-center font-mono text-[11px] text-text">{formatPan(settings.pan)}</div>
          </div>

          <div className="mt-5 w-full rounded-lg border border-black/30 bg-[#0d0f13] px-2 py-2">
            <WaveformPreview color={def.color} density={0.95} active={Boolean(url) || processing || playing} />
          </div>

          <div className="mt-auto flex w-full flex-col gap-2 pt-4">
            <button
              onClick={(event) => {
                event.stopPropagation()
                togglePlay()
              }}
              disabled={!url}
              className={`rounded-md border px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] transition ${
                playing
                  ? 'border-daw-green/50 bg-daw-green/10 text-daw-green'
                  : url
                    ? 'border-border-bright bg-[#2a2d36] text-text hover:border-accent hover:text-accent'
                    : 'border-border bg-[#171920] text-text-faint'
              }`}
            >
              {playing ? 'Stop Preview' : 'Preview'}
            </button>

            <a
              href={url}
              download
              onClick={(event) => {
                if (!url) {
                  event.preventDefault()
                }
                event.stopPropagation()
              }}
              className={`rounded-md border px-3 py-2 text-center text-[12px] font-semibold uppercase tracking-[0.18em] transition ${
                url ? 'border-border-bright bg-[#2a2d36] text-text hover:border-daw-blue hover:text-daw-blue' : 'pointer-events-none border-border bg-[#171920] text-text-faint'
              }`}
            >
              Export Stem
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModuleChip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-border bg-[#181a20] px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.28em] text-text-faint">{label}</div>
      <div className={`mt-1 text-[12px] font-semibold uppercase tracking-[0.18em] ${accent}`}>{value}</div>
    </div>
  )
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-border bg-[linear-gradient(180deg,#23262f,#1a1c22)] px-4 py-3">
      <div className="font-display text-[22px] font-bold uppercase tracking-[0.18em] text-white">{title}</div>
      <div className="text-[11px] uppercase tracking-[0.22em] text-text-dim">{subtitle}</div>
    </div>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/5 bg-black/15 px-2.5 py-2">
      <span className="uppercase tracking-[0.18em] text-text-faint">{label}</span>
      <span className="font-mono text-text">{value}</span>
    </div>
  )
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.22em] text-text-faint">{label}</div>
      <div className="mt-1 font-mono text-[13px] text-text">{value}</div>
    </div>
  )
}

function TimelineStep({ label, active, complete }: { label: string; active?: boolean; complete?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-3 w-3 rounded-full border ${
          complete
            ? 'border-daw-green bg-daw-green shadow-[0_0_12px_rgba(0,230,118,0.6)]'
            : active
              ? 'border-accent bg-accent shadow-[0_0_12px_rgba(255,107,0,0.6)]'
              : 'border-border bg-[#1a1d23]'
        }`}
      />
      <div className="flex-1 rounded-md border border-white/5 bg-black/15 px-3 py-2 text-[12px] uppercase tracking-[0.18em] text-text-dim">
        {label}
      </div>
    </div>
  )
}

function WaveformPreview({ color, density, active }: { color: string; density: number; active: boolean }) {
  const bars = Array.from({ length: 42 }, (_, index) => {
    const sineA = Math.sin(index * 0.72) * 14
    const sineB = Math.cos(index * 0.33) * 11
    const base = 28 + sineA + sineB + ((index % 5) * 4)
    return Math.max(12, Math.min(96, base * density))
  })

  return (
    <div className="flex h-full items-center gap-[3px]">
      {bars.map((height, index) => (
        <div
          key={index}
          className="flex-1 rounded-sm transition-all duration-150"
          style={{
            height: `${height}%`,
            background: active ? color : `${color}55`,
            opacity: active ? 1 : 0.55,
          }}
        />
      ))}
    </div>
  )
}

function formatJobStatus(status?: StemJob['status'], uploading?: boolean) {
  if (uploading) return 'Uploading'
  if (!status) return 'Idle'

  switch (status) {
    case 'queued':
      return 'Queued'
    case 'processing':
      return 'Processing'
    case 'done':
      return 'Done'
    case 'error':
      return 'Error'
    default:
      return 'Idle'
  }
}

function formatPan(value: number) {
  if (value === 0) return 'C'
  return value < 0 ? `L ${Math.abs(value)}` : `R ${value}`
}

function formatShortName(name: string) {
  if (name.length <= 22) return name
  return `${name.slice(0, 19)}...`
}

