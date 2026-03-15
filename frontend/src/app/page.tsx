'use client'

import type { ReactNode } from 'react'
import { useDawStore } from '@/store/dawStore'
import { TransportBar } from '@/components/ui/TransportBar'
import { Sequencer } from '@/components/sequencer/Sequencer'
import { PianoRoll } from '@/components/piano/PianoRoll'
import { Mixer } from '@/components/mixer/Mixer'
import { StemSplitter } from '@/components/stemSplitter/StemSplitter'
import { AudioEditor } from '@/components/editor/AudioEditor'

type DockTab = 'piano' | 'mixer' | 'stem' | 'editor'

const DOCK_TABS: Array<{ id: DockTab; label: string; hint: string }> = [
  { id: 'piano', label: 'Piano Roll', hint: 'Notes and automation' },
  { id: 'mixer', label: 'Mixer', hint: 'Insert routing and levels' },
  { id: 'editor', label: 'Audio Editor', hint: 'Waveform operations' },
  { id: 'stem', label: 'Stem Splitter', hint: 'Source separation rack' },
]

const BROWSER_GROUPS = [
  { name: 'Current project', items: ['Patterns', 'Automation', 'Audio clips', 'Recorded takes'] },
  { name: 'Generators', items: ['Drums', 'Bass synth', 'Keys', 'Texture pads'] },
  { name: 'Effects', items: ['EQ', 'Compressor', 'Delay', 'Reverb'] },
]

const PLAYLIST_TOOLS = ['Pattern 1', 'Song', 'Snap 1/4', 'Draw', 'Slip']

export default function Home() {
  const {
    activeTab,
    setActiveTab,
    tracks,
    mixerChannels,
    bpm,
    key,
    timeSignature,
    playPosition,
    isPlaying,
    isRecording,
  } = useDawStore()

  const dockTab: DockTab = activeTab === 'mixer' || activeTab === 'stem' || activeTab === 'editor'
    ? activeTab
    : 'piano'

  const clipCount = tracks.reduce((total, track) => total + track.clips.length, 0)
  const activeChannels = mixerChannels.filter((channel) => !channel.muted).length
  const bars = Math.floor(playPosition / 4) + 1
  const beats = Math.floor(playPosition % 4) + 1

  return (
    <div className="fl-shell flex min-h-screen flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top,#1b212b_0%,#0d1118_35%,#090c11_100%)] p-2 text-text lg:p-3">
      <div className="fl-window flex min-h-[calc(100vh-1rem)] flex-col overflow-hidden rounded-md lg:min-h-[calc(100vh-1.5rem)]">
      <div className="fl-header-strip flex h-9 items-center gap-3 border-x-0 border-t-0 px-3 text-[11px] uppercase tracking-[0.24em] text-[#d7dbe3]">
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-sm border border-black/50 bg-[linear-gradient(180deg,#ffb34d,#ff7a00)] font-display text-[10px] font-bold text-black shadow-[0_0_16px_rgba(255,122,0,0.35)]">
            F
          </div>
          <div className="font-display text-[14px] font-semibold tracking-[0.32em] text-white">
            FLOWDAW
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-[#b8bec9]">
          {['File', 'Edit', 'Add', 'Patterns', 'View', 'Options', 'Tools', 'Help'].map((item) => (
            <button key={item} className="rounded-sm px-2 py-1 transition hover:bg-white/8 hover:text-white">
              {item}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <StatusPill label="Project" value="ATS Guitar Riff" accent="text-[#ffd089]" />
          <StatusPill label="Mode" value={isRecording ? 'Record' : isPlaying ? 'Play' : 'Stop'} accent={isRecording ? 'text-daw-red' : isPlaying ? 'text-daw-green' : 'text-[#d7dbe3]'} />
        </div>
      </div>

      <TransportBar />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#1d222b_0%,#0f1217_32%,#090c10_100%)] lg:flex-row">
        <aside className="flex max-h-[38vh] w-full flex-col border-b border-white/8 bg-[linear-gradient(180deg,#151920,#0d1014)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] lg:max-h-none lg:w-[270px] lg:border-b-0 lg:border-r">
          <SectionFrame title="Channel Rack" subtitle="Pattern generator">
            <div className="space-y-2 px-3 pb-3 pt-2">
              {tracks.map((track, index) => (
                <RackChannel
                  key={track.id}
                  name={track.name}
                  type={track.type}
                  color={track.color}
                  steps={Array.from({ length: 16 }, (_, step) => track.clips.some((clip) => step >= clip.start && step < clip.start + clip.length))}
                  muted={track.muted}
                  soloed={track.soloed}
                  slot={index + 1}
                />
              ))}
            </div>
          </SectionFrame>

          <SectionFrame title="Browser" subtitle="Project assets">
            <div className="space-y-4 px-3 py-3 text-[11px]">
              {BROWSER_GROUPS.map((group) => (
                <div key={group.name} className="rounded-md border border-white/6 bg-black/15 px-3 py-2">
                  <div className="mb-2 font-display text-[12px] uppercase tracking-[0.22em] text-[#d6d9df]">
                    {group.name}
                  </div>
                  <div className="space-y-1.5 text-text-dim">
                    {group.items.map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#7f8794]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionFrame>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
          <div className="mb-2 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="fl-panel flex items-center justify-between gap-3 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                {PLAYLIST_TOOLS.map((tool) => (
                  <div key={tool} className="fl-control-chip">
                    {tool}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <MiniReadout label="Bars" value={String(bars).padStart(2, '0')} />
                <MiniReadout label="Beat" value={String(beats).padStart(2, '0')} />
                <MiniReadout label="Clips" value={String(clipCount).padStart(2, '0')} />
              </div>
            </div>

            <div className="fl-panel flex items-center justify-between gap-2 px-3 py-2">
              <MiniReadout label="Tempo" value={String(bpm)} />
              <MiniReadout label="Key" value={key} />
              <MiniReadout label="Time" value={`${timeSignature[0]}/${timeSignature[1]}`} />
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
              <section className="fl-panel fl-grid-bg flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm">
                <div className="flex items-center justify-between border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.14))] px-4 py-2">
                  <div>
                    <div className="font-display text-[18px] uppercase tracking-[0.22em] text-white">Playlist</div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">
                      Arrangement · Song mode · Magnetic timeline
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill label="Pattern" value="01" accent="text-accent" />
                    <StatusPill label="Markers" value="Intro / Verse" accent="text-daw-blue" />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  <Sequencer />
                </div>
              </section>

              <section className="fl-panel flex h-[38%] min-h-[280px] flex-col overflow-hidden rounded-sm">
                <div className="flex items-center justify-between border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.16))] px-3 py-2">
                  <div className="flex items-center gap-2">
                    {DOCK_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`rounded-sm border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                          dockTab === tab.id
                            ? 'border-[#ff8a1f] bg-[linear-gradient(180deg,#ff9d38,#d96700)] text-black shadow-[0_0_18px_rgba(255,122,0,0.18)]'
                            : 'border-white/8 bg-white/4 text-text-dim hover:border-white/15 hover:bg-white/8 hover:text-white'
                        }`}
                        title={tab.hint}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim">
                    {DOCK_TABS.find((tab) => tab.id === dockTab)?.hint}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  {dockTab === 'piano' && <PianoRoll />}
                  {dockTab === 'mixer' && <Mixer />}
                  {dockTab === 'editor' && <AudioEditor />}
                  {dockTab === 'stem' && <StemSplitter />}
                </div>
              </section>
            </div>

            <aside className="flex min-h-0 flex-col gap-3 overflow-hidden">
              <section className="fl-panel overflow-hidden rounded-sm">
                <div className="border-b border-white/8 px-4 py-3">
                  <div className="font-display text-[18px] uppercase tracking-[0.22em] text-white">Inspector</div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Playlist state and routing</div>
                </div>

                <div className="space-y-3 px-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InspectorTile label="Active tracks" value={String(tracks.length)} />
                    <InspectorTile label="Open inserts" value={String(activeChannels)} />
                    <InspectorTile label="Patterns" value="04" />
                    <InspectorTile label="Scene" value="Main" />
                  </div>

                  <div className="rounded-md border border-white/8 bg-black/20 p-3">
                    <div className="mb-3 text-[10px] uppercase tracking-[0.22em] text-text-dim">Insert meters</div>
                    <div className="space-y-2">
                      {mixerChannels.slice(0, 6).map((channel, index) => {
                        const level = Math.max(12, Math.round(channel.volume * 100))
                        return (
                          <div key={channel.id} className="grid grid-cols-[54px_minmax(0,1fr)_38px] items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
                            <span className="font-medium text-[#d9dde5]">{index === 0 ? 'MST' : String(index).padStart(2, '0')}</span>
                            <div className="h-2 overflow-hidden rounded-full border border-black/40 bg-[#0b0d11]">
                              <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,#00e676_0%,#ffe55c_62%,#ff7b34_100%)]"
                                style={{ width: `${channel.muted ? 0 : level}%` }}
                              />
                            </div>
                            <span className="text-right font-mono text-text-dim">{channel.muted ? '--' : `${level}`}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="fl-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm">
                <div className="border-b border-white/8 px-4 py-3">
                  <div className="font-display text-[18px] uppercase tracking-[0.22em] text-white">Quick Focus</div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Jump between lower dock tools</div>
                </div>

                <div className="space-y-3 overflow-y-auto px-4 py-4">
                  {DOCK_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-start justify-between rounded-md border px-3 py-3 text-left transition ${
                        dockTab === tab.id
                          ? 'border-[#ff8a1f] bg-[linear-gradient(180deg,rgba(255,138,31,0.22),rgba(255,138,31,0.08))]'
                          : 'border-white/8 bg-white/4 hover:border-white/14 hover:bg-white/7'
                      }`}
                    >
                      <div>
                        <div className="font-display text-[14px] uppercase tracking-[0.18em] text-white">{tab.label}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-text-dim">{tab.hint}</div>
                      </div>
                      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dockTab === tab.id ? 'bg-accent shadow-[0_0_12px_rgba(255,107,0,0.8)]' : 'bg-[#596170]'}`} />
                    </button>
                  ))}

                  <div className="rounded-md border border-white/8 bg-black/20 p-3">
                    <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-text-dim">Project Notes</div>
                    <div className="space-y-2 text-[12px] leading-5 text-[#c8cdd7]">
                      <p>Arrangement-first workspace modeled after a classic FL playlist layout.</p>
                      <p>Left browser and rack stay visible while the lower dock swaps between note, mix, audio, and stem tools.</p>
                    </div>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>
      </div>
    </div>
  )
}

function SectionFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-white/6 last:border-b-0">
      <div className="fl-header-strip border-x-0 border-t-0 border-b px-3 py-2">
        <div className="font-display text-[15px] uppercase tracking-[0.2em] text-white">{title}</div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim">{subtitle}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  )
}

function RackChannel({
  name,
  type,
  color,
  steps,
  muted,
  soloed,
  slot,
}: {
  name: string
  type: string
  color: string
  steps: boolean[]
  muted: boolean
  soloed: boolean
  slot: number
}) {
  return (
    <div className="fl-slot rounded-sm p-2">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-8 w-1 rounded-full" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[13px] uppercase tracking-[0.16em] text-white">{name}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim">{type} · Insert {slot}</div>
        </div>
        <div className="flex gap-1">
          <span className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase ${muted ? 'border-[#f0dc74] bg-[#f0dc74] text-black' : 'border-white/8 bg-black/20 text-text-dim'}`}>M</span>
          <span className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase ${soloed ? 'border-[#72f3b1] bg-[#72f3b1] text-black' : 'border-white/8 bg-black/20 text-text-dim'}`}>S</span>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-1">
        {steps.map((active, step) => (
          <span
            key={step}
            className={`h-3 rounded-sm border ${active ? 'border-black/20 shadow-[0_0_12px_rgba(255,122,0,0.26)]' : 'border-white/6 bg-[#141920]'}`}
            style={active ? { backgroundColor: color } : undefined}
          />
        ))}
      </div>
    </div>
  )
}

function StatusPill({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="fl-slot rounded-sm px-2 py-1 leading-none">
      <div className="text-[8px] uppercase tracking-[0.24em] text-text-dim">{label}</div>
      <div className={`mt-1 font-display text-[12px] uppercase tracking-[0.18em] ${accent}`}>{value}</div>
    </div>
  )
}

function MiniReadout({ label, value }: { label: string; value: string }) {
  return (
    <div className="fl-slot rounded-sm px-2 py-1.5 text-right">
      <div className="text-[8px] uppercase tracking-[0.22em] text-text-faint">{label}</div>
      <div className="font-mono text-[12px] text-[#eef3fa]">{value}</div>
    </div>
  )
}

function InspectorTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="fl-slot rounded-sm px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.22em] text-text-dim">{label}</div>
      <div className="mt-1 font-display text-[18px] uppercase tracking-[0.14em] text-white">{value}</div>
    </div>
  )
}
