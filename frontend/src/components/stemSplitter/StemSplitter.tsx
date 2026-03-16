'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient, pollJob, StemJob } from '@/lib/api'

const STEM_DEFS = [
  { key: 'vocals', label: 'Vocals', short: 'VOX',  slot: 'Insert 1', color: '#ff6a00' },
  { key: 'drums',  label: 'Drums',  short: 'DRM',  slot: 'Insert 2', color: '#ff5252' },
  { key: 'bass',   label: 'Bass',   short: 'BASS', slot: 'Insert 3', color: '#00c8ff' },
  { key: 'other',  label: 'Other',  short: 'MUS',  slot: 'Insert 4', color: '#00e676' },
] as const

type StemDef      = (typeof STEM_DEFS)[number]
type StemKey      = StemDef['key']
type StemSettings = Record<StemKey, { volume: number; pan: number }>

const DEFAULT_STEM_SETTINGS: StemSettings = {
  vocals: { volume: 82, pan: 0 },
  drums:  { volume: 78, pan: 0 },
  bass:   { volume: 74, pan: -8 },
  other:  { volume: 76, pan: 6 },
}

/* ─── shared style tokens ─── */
const S = {
  panel: {
    background: '#1e1e1e',
    border: '1px solid #0d0d0d',
    borderRadius: 1,
  } as React.CSSProperties,
  titlebar: {
    background: 'linear-gradient(180deg,#2c2c2c 0%,#1e1e1e 100%)',
    borderBottom: '1px solid #0d0d0d',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  } as React.CSSProperties,
  titleLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.14em',
    color: '#ff6a00',
  },
  subtitle: {
    fontSize: 9,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#555',
  },
  btn: {
    height: 22,
    padding: '0 8px',
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    background: '#2e2e2e',
    color: '#ccc',
    border: '1px solid #0d0d0d',
    borderBottom: '1px solid #444',
    borderRight: '1px solid #444',
    borderRadius: 1,
    fontFamily: "'Segoe UI', sans-serif",
  } as React.CSSProperties,
}

export function StemSplitter() {
  const [job,           setJob]           = useState<StemJob | null>(null)
  const [uploading,     setUploading]     = useState(false)
  const [uploadPct,     setUploadPct]     = useState(0)
  const [dragOver,      setDragOver]      = useState(false)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [selectedStem,  setSelectedStem]  = useState<StemKey>('vocals')
  const [stemSettings,  setStemSettings]  = useState<StemSettings>(DEFAULT_STEM_SETTINGS)
  const stopPollRef = useRef<(() => void) | null>(null)

  useEffect(() => () => { stopPollRef.current?.() }, [])

  useEffect(() => {
    if (job?.status !== 'done') return
    const first = STEM_DEFS.find(d => job.stems[d.key])
    if (first) setSelectedStem(first.key)
  }, [job])

  const checkBackend = useCallback(async () => {
    try { await apiClient.health(); setBackendOnline(true) }
    catch { setBackendOnline(false) }
  }, [])

  const handleFile = async (file: File) => {
    if (!file) return
    setUploading(true); setUploadPct(0); setJob(null)
    try {
      const { data } = await apiClient.splitStems(file, setUploadPct)
      setUploading(false); setBackendOnline(true)
      setJob({ job_id: data.job_id, status: 'queued', progress: 0, error: null, filename: file.name, stems: {} })
      stopPollRef.current?.()
      stopPollRef.current = pollJob(data.job_id, j => setJob(j))
    } catch { setUploading(false); setBackendOnline(false) }
  }

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]; if (file) handleFile(file)
  }

  const updateStemSetting = (stem: StemKey, key: 'volume' | 'pan', value: number) =>
    setStemSettings(cur => ({ ...cur, [stem]: { ...cur[stem], [key]: value } }))

  const progress        = uploading ? uploadPct : (job?.progress ?? 0)
  const selectedDef     = STEM_DEFS.find(d => d.key === selectedStem) ?? STEM_DEFS[0]
  const readyStemCount  = STEM_DEFS.filter(d => job?.stems[d.key]).length

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#1a1a1a' }}>
      {/* ── Top info bar ── */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 28,
        background: '#111',
        borderBottom: '1px solid #0d0d0d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        gap: 12,
        zIndex: 5,
        flexShrink: 0,
      }}>
        <span style={S.titleLabel}>Stem Rack</span>
        <span style={{ ...S.subtitle, marginLeft: 4 }}>Demucs htdemucs</span>
        <span style={{ flex: 1 }} />
        <Chip label="Mode"   value="Split"                     accent="#e8a000" />
        <Chip label="Output" value={`${readyStemCount}/4`}     accent="#00e676" />
        <Chip label="Sync"   value={backendOnline === false ? 'Offline' : 'Live'}
              accent={backendOnline === false ? '#ff5252' : '#00c8ff'} />
      </div>

      {/* ── Main 3-column layout ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr 220px',
        gap: 4,
        flex: 1,
        overflow: 'hidden',
        padding: '32px 6px 6px',
      }}>

        {/* ── Column 1: Browser / Upload ── */}
        <div style={{ ...S.panel, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={S.titlebar}>
            <span style={S.titleLabel}>Browser</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/* Upload zone */}
            <label
              style={{
                minHeight: 120,
                border: `1px solid ${dragOver ? '#ff6a00' : '#333'}`,
                background: dragOver ? 'rgba(255,106,0,0.08)' : '#161616',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 8,
                cursor: 'pointer',
                borderRadius: 1,
                position: 'relative',
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <input type="file" accept="audio/*" style={{ position: 'absolute', inset: 0, opacity: 0 }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              <span style={{ ...S.subtitle }}>Audio Pool</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#e0e0e0' }}>
                  {dragOver ? 'Drop File' : 'Load Sample'}
                </div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 4, letterSpacing: '0.06em' }}>
                  wav · mp3 · ogg · flac
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#555' }}>
                {job?.filename ? job.filename.slice(0, 28) + (job.filename.length > 28 ? '…' : '') : 'No file loaded'}
              </div>
            </label>

            {/* Engine status */}
            <div style={{ ...S.panel, padding: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={S.subtitle}>Engine Status</span>
                <button onClick={checkBackend} style={{ ...S.btn, height: 18, padding: '0 5px', fontSize: 9 }}>
                  Ping
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: backendOnline === false ? '#ff5252' : '#00e676',
                  boxShadow: backendOnline === false ? '0 0 6px rgba(255,82,82,0.8)' : '0 0 6px rgba(0,230,118,0.8)',
                }} />
                <span style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {backendOnline === false ? 'Offline' : backendOnline === true ? 'Connected' : 'Not checked'}
                </span>
              </div>
              <StatusRow label="Model"   value="htdemucs" />
              <StatusRow label="Queue"   value={job?.status === 'queued' ? 'Waiting' : 'Ready'} />
              <StatusRow label="Process" value={uploading ? 'Uploading' : job?.status ?? 'Idle'} />
              {backendOnline === false && (
                <div style={{ marginTop: 5, fontSize: 10, color: '#ff5252', background: 'rgba(255,82,82,0.08)', padding: '4px 6px', borderRadius: 1, border: '1px solid rgba(255,82,82,0.2)' }}>
                  Run: python manage.py runserver
                </div>
              )}
            </div>

            {/* Progress */}
            <div style={{ ...S.panel, padding: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={S.subtitle}>Global Progress</span>
                <span style={{ fontSize: 11, fontFamily: 'Courier New', color: '#ff6a00' }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 8, background: '#0a0a0a', border: '1px solid #0d0d0d', overflow: 'hidden', borderRadius: 0, marginBottom: 5 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#ff6a00,#e8a000)', transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 10, color: '#555' }}>
                {uploading ? 'Uploading…'
                  : job?.status === 'error' ? job.error
                  : job?.status_detail || (job ? 'Processing…' : 'Load audio to start')}
              </div>
            </div>

            {/* Split timeline */}
            <div style={{ ...S.panel, padding: 7 }}>
              <div style={S.subtitle}>Split Timeline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                <TimelineStep label="Upload"   active={uploading}                          complete={!uploading && !!job} />
                <TimelineStep label="Queue"    active={job?.status === 'queued'}            complete={job?.status === 'processing' || job?.status === 'done'} />
                <TimelineStep label="Demucs"   active={job?.status === 'processing'}        complete={job?.status === 'done'} />
                <TimelineStep label="Ready"    active={job?.status === 'done'}              complete={job?.status === 'done'} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Column 2: Channel Rack (4 stems) ── */}
        <div style={{ ...S.panel, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={S.titlebar}>
            <span style={S.titleLabel}>Channel Rack</span>
            <span style={{ ...S.subtitle, marginLeft: 4 }}>
              {job?.filename ?? 'No file loaded'}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, minWidth: 480 }}>
              {STEM_DEFS.map(def => (
                <TrackStrip
                  key={def.key}
                  def={def}
                  url={job?.stems[def.key]}
                  progress={progress}
                  selected={selectedStem === def.key}
                  processing={job?.status === 'processing' || job?.status === 'queued' || uploading}
                  settings={stemSettings[def.key]}
                  onSelect={() => setSelectedStem(def.key)}
                  onAdjust={(k, v) => updateStemSetting(def.key, k, v)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Column 3: Master/Inspector ── */}
        <div style={{ ...S.panel, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={S.titlebar}>
            <span style={S.titleLabel}>Master</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 7, display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/* Selected stem info */}
            <div style={{ ...S.panel, padding: 8 }}>
              <div style={{ ...S.subtitle, marginBottom: 4 }}>Selected Insert</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e0e0e0' }}>
                    {selectedDef.label}
                  </div>
                  <div style={{ fontSize: 9, color: selectedDef.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {selectedDef.slot}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: selectedDef.color, background: '#1a1a1a', border: `1px solid ${selectedDef.color}33`, padding: '2px 6px', borderRadius: 1, fontWeight: 700 }}>
                  {selectedDef.short}
                </div>
              </div>

              {/* Waveform preview */}
              <div style={{ height: 44, background: '#0a0a0a', border: '1px solid #0d0d0d', marginBottom: 6, overflow: 'hidden', padding: '2px 4px' }}>
                <WaveformPreview color={selectedDef.color} active={Boolean(job?.stems[selectedDef.key])} />
              </div>

              <StatusRow label="Volume" value={`${stemSettings[selectedDef.key].volume}%`} />
              <StatusRow label="Pan"    value={fmtPan(stemSettings[selectedDef.key].pan)} />
              <StatusRow label="Split"  value={job?.status === 'done' ? 'Rendered' : 'Standby'} />
              <StatusRow label="File"   value={job?.stems[selectedDef.key] ? 'Ready' : 'Pending'} />
            </div>

            {/* Output meter */}
            <div style={{ ...S.panel, padding: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={S.subtitle}>Output Meter</span>
                <span style={{ fontSize: 10, fontFamily: 'Courier New', color: '#00e676' }}>-3.1 dB</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 48, background: '#0a0a0a', border: '1px solid #0d0d0d', padding: '3px' }}>
                {Array.from({ length: 20 }).map((_, i) => {
                  const h = 20 + (i % 5) * 7 + progress * 0.25
                  const active = i < Math.max(2, Math.round(progress / 10))
                  return (
                    <div key={i} style={{
                      flex: 1,
                      height: `${Math.min(h, 90)}%`,
                      background: active ? (i > 15 ? '#ff5252' : i > 10 ? '#ffea00' : '#00e676') : '#222',
                      borderRadius: 0,
                      transition: 'height 0.2s',
                    }} />
                  )
                })}
              </div>
            </div>

            {/* Export bus */}
            <div style={{ ...S.panel, padding: 8 }}>
              <div style={S.subtitle}>Export Bus</div>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <StatusRow label="Rendered" value={`${readyStemCount} / 4`} />
                <StatusRow label="Container" value="wav" />
                <StatusRow label="Status" value={job?.status === 'done' ? 'Ready' : 'Waiting'} />
              </div>
              {job?.status === 'error' && (
                <div style={{ marginTop: 5, fontSize: 10, color: '#ff5252', background: 'rgba(255,82,82,0.08)', padding: '4px 6px', borderRadius: 1, border: '1px solid rgba(255,82,82,0.2)' }}>
                  Error: {job.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────── */
/* Track Strip                             */
/* ─────────────────────────────────────── */
function TrackStrip({ def, url, progress, selected, processing, settings, onSelect, onAdjust }: {
  def: StemDef; url?: string; progress: number; selected: boolean; processing: boolean
  settings: StemSettings[StemKey]
  onSelect: () => void; onAdjust: (k: 'volume' | 'pan', v: number) => void
}) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null }, [])

  const togglePlay = async () => {
    if (!url) return
    if (!audioRef.current) {
      audioRef.current = new Audio(url)
      audioRef.current.onended = () => setPlaying(false)
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); return }
    try { audioRef.current.currentTime = 0; await audioRef.current.play(); setPlaying(true) }
    catch { setPlaying(false) }
  }

  const meterLevel = url ? Math.max(16, Math.round(settings.volume * 0.82)) : processing ? Math.max(8, Math.round(progress * 0.8)) : 0

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: selected ? '#252520' : '#1e1e1e',
        border: `1px solid ${selected ? def.color + '66' : '#0d0d0d'}`,
        borderRadius: 1,
        overflow: 'hidden',
        cursor: 'pointer',
        minHeight: 360,
      }}
    >
      {/* Strip header */}
      <div style={{ background: '#111', borderBottom: '1px solid #0d0d0d', padding: '4px 6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', color: '#555', letterSpacing: '0.1em' }}>{def.slot}</span>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: url ? '#00e676' : processing ? '#ff6a00' : '#333',
            boxShadow: url ? '0 0 5px rgba(0,230,118,0.7)' : processing ? '0 0 5px rgba(255,106,0,0.7)' : 'none',
          }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e0e0e0', marginTop: 2 }}>
          {def.label}
        </div>
        <div style={{ fontSize: 9, color: def.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{def.short}</div>
      </div>

      {/* Meter + controls */}
      <div style={{ flex: 1, display: 'flex', gap: 4, padding: '6px 5px' }}>
        {/* VU meter */}
        <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 1, width: 8 }}>
          {Array.from({ length: 16 }).map((_, i) => {
            const t = ((i + 1) / 16) * 100
            const active = meterLevel >= t
            return (
              <div key={i} style={{
                flex: 1,
                background: active ? (t > 85 ? '#ff5252' : t > 60 ? '#ffea00' : '#00e676') : '#1a1a1a',
                border: '0.5px solid #0d0d0d',
              }} />
            )
          })}
        </div>

        {/* Fader + pan + waveform */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
          {/* Volume fader */}
          <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 2, width: '100%' }}>
            <span style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vol</span>
            <input
              type="range" min={0} max={100} value={settings.volume}
              onChange={e => onAdjust('volume', Number(e.target.value))}
              style={{ width: '100%' }}
              onClick={e => e.stopPropagation()}
            />
            <span style={{ fontSize: 9, fontFamily: 'Courier New', color: '#888' }}>{settings.volume}</span>
          </div>

          {/* Pan */}
          <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 2, width: '100%' }}>
            <span style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pan</span>
            <input
              type="range" min={-50} max={50} value={settings.pan}
              onChange={e => onAdjust('pan', Number(e.target.value))}
              style={{ width: '100%' }}
              onClick={e => e.stopPropagation()}
            />
            <span style={{ fontSize: 9, fontFamily: 'Courier New', color: '#888' }}>{fmtPan(settings.pan)}</span>
          </div>

          {/* Waveform mini preview */}
          <div style={{ width: '100%', height: 30, background: '#0a0a0a', border: '1px solid #0d0d0d', overflow: 'hidden', borderRadius: 0, padding: '1px 2px' }}>
            <WaveformPreview color={def.color} active={Boolean(url) || processing || playing} />
          </div>

          {/* Buttons */}
          <button
            onClick={e => { e.stopPropagation(); togglePlay() }}
            disabled={!url}
            style={{
              width: '100%',
              height: 20,
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: url ? 'pointer' : 'not-allowed',
              background: playing ? 'rgba(0,230,118,0.15)' : url ? '#2e2e2e' : '#1a1a1a',
              color: playing ? '#00e676' : url ? '#ccc' : '#444',
              border: `1px solid ${playing ? '#00aa55' : url ? '#333' : '#0d0d0d'}`,
              borderRadius: 1,
              opacity: url ? 1 : 0.4,
              fontFamily: "'Segoe UI', sans-serif",
            }}
          >
            {playing ? 'Stop' : 'Preview'}
          </button>

          <a
            href={url}
            download
            onClick={e => { e.stopPropagation(); if (!url) e.preventDefault() }}
            style={{
              width: '100%',
              height: 20,
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: url ? 'pointer' : 'not-allowed',
              background: '#1a1a1a',
              color: url ? '#00c8ff' : '#444',
              border: `1px solid ${url ? '#1a4a6a' : '#0d0d0d'}`,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              opacity: url ? 1 : 0.4,
              fontFamily: "'Segoe UI', sans-serif",
            }}
          >
            Export
          </a>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────── */
/* Helpers                                 */
/* ─────────────────────────────────────── */
function Chip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 8, textTransform: 'uppercase', color: '#444', letterSpacing: '0.1em' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{value}</span>
    </div>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 10 }}>
      <span style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ fontFamily: 'Courier New', color: '#888' }}>{value}</span>
    </div>
  )
}

function TimelineStep({ label, active, complete }: { label: string; active?: boolean; complete?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: complete ? '#00e676' : active ? '#ff6a00' : '#1e1e1e',
        border: `1px solid ${complete ? '#00aa55' : active ? '#cc4400' : '#333'}`,
        boxShadow: complete ? '0 0 5px rgba(0,230,118,0.6)' : active ? '0 0 5px rgba(255,106,0,0.6)' : 'none',
        flexShrink: 0,
      }} />
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: complete ? '#888' : active ? '#ccc' : '#444' }}>
        {label}
      </div>
    </div>
  )
}

function WaveformPreview({ color, active }: { color: string; active: boolean }) {
  const bars = Array.from({ length: 32 }, (_, i) => {
    const h = 30 + Math.sin(i * 0.72) * 18 + Math.cos(i * 0.33) * 14 + (i % 5) * 4
    return Math.max(12, Math.min(96, h))
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${h}%`,
            background: active ? color : color + '44',
            borderRadius: 0,
          }}
        />
      ))}
    </div>
  )
}

function fmtPan(v: number) {
  if (v === 0) return 'C'
  return v < 0 ? `L${Math.abs(v)}` : `R${v}`
}
