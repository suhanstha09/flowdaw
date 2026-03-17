'use client'

import type { ReactNode } from 'react'
import { useDawStore } from '@/store/dawStore'
import { TransportBar } from '@/components/ui/TransportBar'
import { Sequencer }    from '@/components/sequencer/Sequencer'
import { PianoRoll }    from '@/components/piano/PianoRoll'
import { Mixer }        from '@/components/mixer/Mixer'
import { StemSplitter } from '@/components/stemSplitter/StemSplitter'
import { AudioEditor }  from '@/components/editor/AudioEditor'

type DockTab = 'piano' | 'mixer' | 'stem' | 'editor'

const DOCK_TABS: Array<{ id: DockTab; label: string }> = [
  { id: 'piano',  label: 'Piano Roll' },
  { id: 'mixer',  label: 'Mixer' },
  { id: 'editor', label: 'Audio Editor' },
  { id: 'stem',   label: 'Stem Splitter' },
]

const MENU_ITEMS = ['File', 'Edit', 'Add', 'Patterns', 'View', 'Options', 'Tools', 'Help']

const BROWSER_GROUPS = [
  { name: 'Current Project', items: ['Patterns', 'Automation', 'Audio clips', 'Recorded'] },
  { name: 'Generators',      items: ['Drums', 'Bass synth', 'Keys', 'Pads'] },
  { name: 'Effects',         items: ['EQ', 'Compressor', 'Delay', 'Reverb'] },
]

/* ─────────────────────────────────────────── */
/*  MAIN PAGE                                  */
/* ─────────────────────────────────────────── */
export default function Home() {
  const {
    activeTab, setActiveTab,
    tracks, mixerChannels,
    bpm, key, timeSignature,
    playPosition, isPlaying, isRecording,
  } = useDawStore()

  const dockTab: DockTab =
    activeTab === 'mixer' || activeTab === 'stem' || activeTab === 'editor'
      ? activeTab : 'piano'

  const clipCount     = tracks.reduce((t, tr) => t + tr.clips.length, 0)
  const activeChannels = mixerChannels.filter(c => !c.muted).length
  const bars  = Math.floor(playPosition / 4) + 1
  const beats = Math.floor(playPosition % 4) + 1

  return (
    /* Outermost shell: fills the viewport */
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#1a1a1a',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#e0e0e0',
    }}>

      {/* ════ TITLE / MENU BAR ════ */}
      <div style={{
        height: 28,
        background: 'linear-gradient(180deg, #2c2c2c 0%, #1e1e1e 100%)',
        borderBottom: '1px solid #0d0d0d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: 8,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          width: 20, height: 20,
          background: 'linear-gradient(135deg, #ffb340 0%, #ff6a00 100%)',
          border: '1px solid #cc4400',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 900,
          color: '#000',
          flexShrink: 0,
          boxShadow: '0 0 8px rgba(255,106,0,0.4)',
        }}>F</div>

        {/* App name */}
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color: '#ffffff',
          marginRight: 6,
        }}>FLOWDAW</span>

        {/* Menu items */}
        {MENU_ITEMS.map(item => (
          <button key={item} style={{
            height: 20,
            padding: '0 6px',
            fontSize: 10,
            color: '#aaa',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: "'Segoe UI', sans-serif",
          }}>
            {item}
          </button>
        ))}

        {/* Right-side status pills */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusPill label="Project" value="ATS Guitar Riff" accent="#e8a000" />
          <StatusPill
            label="Mode"
            value={isRecording ? 'REC' : isPlaying ? 'PLAY' : 'STOP'}
            accent={isRecording ? '#ff5252' : isPlaying ? '#00e676' : '#888'}
          />
        </div>
      </div>

      {/* ════ TRANSPORT BAR ════ */}
      <TransportBar />

      {/* ════ MAIN WORKSPACE ════ */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        background: '#1a1a1a',
      }}>

        {/* ─── LEFT SIDEBAR (Channel Rack + Browser) ─── */}
        <div style={{
          width: 220,
          minWidth: 220,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #0d0d0d',
          overflow: 'hidden',
          background: '#1e1e1e',
        }}>

          {/* CHANNEL RACK */}
          <PanelFrame title="CHANNEL RACK" style={{ flex: '0 0 auto', minHeight: 180, maxHeight: '55%' }}>
            <div style={{ overflow: 'auto', flex: 1 }}>
              {tracks.map((track, idx) => (
                <ChannelRow key={track.id} track={track} index={idx} />
              ))}
              {/* Add Channel button */}
              <div style={{ padding: '4px 6px' }}>
                <button style={{
                  width: '100%',
                  height: 22,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  cursor: 'pointer',
                  background: '#252525',
                  color: '#ff6a00',
                  border: '1px solid #0d0d0d',
                  borderBottom: '1px solid #444',
                  borderRight: '1px solid #444',
                  borderRadius: 1,
                  fontFamily: "'Segoe UI', sans-serif",
                }}>
                  + ADD
                </button>
              </div>
            </div>
          </PanelFrame>

          {/* BROWSER */}
          <PanelFrame title="BROWSER" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Search bar */}
            <div style={{
              padding: '3px 6px',
              borderBottom: '1px solid #0d0d0d',
              flexShrink: 0,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#111',
                border: '1px solid #0d0d0d',
                borderRadius: 1,
                padding: '1px 6px',
                gap: 4,
              }}>
                <span style={{ fontSize: 10, color: '#555' }}>⌕</span>
                <input
                  type="text"
                  placeholder="Search…"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 10,
                    color: '#e0e0e0',
                    width: '100%',
                    fontFamily: "'Segoe UI', sans-serif",
                  }}
                />
              </div>
            </div>

            {/* Tree view */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {BROWSER_GROUPS.map(group => (
                <div key={group.name}>
                  <div style={{
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: '#555',
                    borderTop: '1px solid #0d0d0d',
                    padding: '3px 8px',
                    background: '#161616',
                  }}>
                    {group.name}
                  </div>
                  {group.items.map(item => (
                    <div key={item} className="fl-tree-item">
                      <span style={{ color: '#444', fontSize: 9 }}>▶</span>
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </PanelFrame>
        </div>

        {/* ─── CENTER (Playlist + Dock) ─── */}
        <div style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Playlist toolbar strip */}
          <div style={{
            height: 28,
            background: '#252525',
            borderBottom: '1px solid #0d0d0d',
            display: 'flex',
            alignItems: 'center',
            padding: '0 6px',
            gap: 3,
            flexShrink: 0,
          }}>
            {['Pattern 1', 'Song', 'Snap ¼', 'Draw', 'Slip'].map(tool => (
              <button key={tool} className="fl-btn" style={{ height: 20, fontSize: 9 }}>{tool}</button>
            ))}
            <div style={{ flex: 1 }} />
            <MiniReadout label="BAR"   value={String(bars).padStart(2, '0')} />
            <MiniReadout label="BEAT"  value={String(beats)} />
            <MiniReadout label="CLIPS" value={String(clipCount).padStart(2, '0')} />
            <MiniReadout label="BPM"   value={String(bpm)} />
            <MiniReadout label="KEY"   value={key} />
          </div>

          {/* Playlist / Arrangement view */}
          <div style={{
            flex: '1 1 60%',
            minHeight: 160,
            overflow: 'hidden',
            borderBottom: '1px solid #0d0d0d',
          }}>
            {/* Panel titlebar */}
            <div className="fl-titlebar">
              <span className="fl-titlebar__label">PLAYLIST</span>
              <span style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Arrangement · Song mode
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                <button className="fl-titlebar__btn">_</button>
                <button className="fl-titlebar__btn">□</button>
                <button className="fl-titlebar__btn">×</button>
              </span>
            </div>
            <div style={{ height: 'calc(100% - 20px)', overflow: 'hidden' }}>
              <Sequencer />
            </div>
          </div>

          {/* Dock (Piano Roll / Mixer / Editor / Stem) */}
          <div style={{
            flex: '0 0 40%',
            minHeight: 180,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Dock tab bar */}
            <div style={{
              height: 26,
              background: '#252525',
              borderBottom: '1px solid #0d0d0d',
              display: 'flex',
              alignItems: 'flex-end',
              padding: '0 4px',
              gap: 2,
              flexShrink: 0,
            }}>
              {DOCK_TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`fl-tab${dockTab === tab.id ? ' fl-tab--active' : ''}`}
                  style={{ height: 22 }}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dock content */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {/* Panel chrome */}
              <div className="fl-titlebar">
                <span className="fl-titlebar__label">
                  {DOCK_TABS.find(t => t.id === dockTab)?.label.toUpperCase()}
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                  <button className="fl-titlebar__btn">_</button>
                  <button className="fl-titlebar__btn">□</button>
                  <button className="fl-titlebar__btn">×</button>
                </span>
              </div>
              <div style={{ height: 'calc(100% - 20px)', overflow: 'hidden' }}>
                {dockTab === 'piano'  && <PianoRoll />}
                {dockTab === 'mixer'  && <Mixer />}
                {dockTab === 'editor' && <AudioEditor />}
                {dockTab === 'stem'   && <StemSplitter />}
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT SIDEBAR (Inspector) ─── */}
        <div style={{
          width: 200,
          minWidth: 200,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #0d0d0d',
          overflow: 'hidden',
          background: '#1e1e1e',
        }}>

          {/* Inspector panel */}
          <PanelFrame title="INSPECTOR" style={{ flex: '0 0 auto' }}>
            <div style={{ padding: '6px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <InspectorTile label="Tracks"   value={String(tracks.length)} />
              <InspectorTile label="Inserts"  value={String(activeChannels)} />
              <InspectorTile label="Patterns" value="04" />
              <InspectorTile label="Scene"    value="Main" />
            </div>

            {/* Insert meters */}
            <div style={{ borderTop: '1px solid #0d0d0d', padding: '5px 8px' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#555', marginBottom: 5 }}>
                Insert Meters
              </div>
              {mixerChannels.slice(0, 6).map((ch, i) => {
                const level = Math.max(12, Math.round(ch.volume * 100))
                return (
                  <div key={ch.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 28px', alignItems: 'center', gap: 4, marginBottom: 3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <span style={{ color: '#888' }}>{i === 0 ? 'MST' : String(i).padStart(2, '0')}</span>
                    <div style={{ height: 6, background: '#0a0a0a', border: '1px solid #0d0d0d', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${ch.muted ? 0 : level}%`,
                        background: 'linear-gradient(90deg, #00e676 0%, #ffea00 65%, #ff5252 100%)',
                        transition: 'width 0.1s',
                      }} />
                    </div>
                    <span style={{ textAlign: 'right', fontFamily: 'Courier New', color: '#555', fontSize: 9 }}>
                      {ch.muted ? '--' : level}
                    </span>
                  </div>
                )
              })}
            </div>
          </PanelFrame>

          {/* Quick Focus panel — dock switcher */}
          <PanelFrame title="QUICK FOCUS" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ flex: 1, overflow: 'auto', padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {DOCK_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '5px 8px',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    background: dockTab === tab.id ? 'rgba(255,106,0,0.12)' : '#1a1a1a',
                    color: dockTab === tab.id ? '#ff6a00' : '#888',
                    border: `1px solid ${dockTab === tab.id ? '#ff6a00' : '#0d0d0d'}`,
                    borderRadius: 1,
                    textAlign: 'left',
                    fontFamily: "'Segoe UI', sans-serif",
                  }}
                >
                  {tab.label}
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: dockTab === tab.id ? '#ff6a00' : '#333',
                    boxShadow: dockTab === tab.id ? '0 0 5px rgba(255,106,0,0.7)' : 'none',
                    flexShrink: 0,
                  }} />
                </button>
              ))}

              {/* Project notes */}
              <div style={{
                marginTop: 4,
                padding: '6px 8px',
                background: '#1a1a1a',
                border: '1px solid #0d0d0d',
                borderRadius: 1,
                fontSize: 10,
                color: '#555',
                lineHeight: 1.5,
              }}>
                <div style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#444', marginBottom: 4, fontSize: 9 }}>
                  Project Notes
                </div>
                Arrangement-first workspace. Browser and rack stay visible while the lower dock switches between note, mix, audio, and stem tools.
              </div>
            </div>
          </PanelFrame>
        </div>

      </div>{/* end workspace */}
    </div>
  )
}

/* ════════════════════════════════════════════ */
/*  UI ATOMS                                   */
/* ════════════════════════════════════════════ */

/** Panel wrapper with FL Studio-style title bar */
function PanelFrame({
  title,
  children,
  style,
}: {
  title: string
  children: ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderBottom: '1px solid #0d0d0d',
      overflow: 'hidden',
      ...style,
    }}>
      {/* Title bar */}
      <div className="fl-titlebar">
        <span className="fl-titlebar__label">{title}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <button className="fl-titlebar__btn">_</button>
          <button className="fl-titlebar__btn">×</button>
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minHeight: 0 }}>
        {children}
      </div>
    </div>
  )
}

/** Channel Rack row — LED + name + 16-step buttons */
function ChannelRow({ track, index }: { track: any; index: number }) {
  const { updateTrack, addClip } = useDawStore()

  return (
    <div style={{
      height: 28,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px',
      gap: 3,
      background: index % 2 === 0 ? '#222222' : '#1e1e1e',
      borderBottom: '1px solid #0d0d0d',
      flexShrink: 0,
    }}>
      {/* Colored LED — click to mute */}
      <div
        onClick={() => updateTrack(track.id, { muted: !track.muted })}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: track.muted ? '#333' : track.color,
          boxShadow: track.muted ? 'none' : `0 0 4px ${track.color}99`,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />

      {/* Name */}
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: track.muted ? '#555' : '#ccc',
        width: 38,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        cursor: 'pointer',
      }}
        onClick={() => updateTrack(track.id, { muted: !track.muted })}
      >
        {track.name}
      </div>

      {/* 16-step sequencer buttons */}
      <div style={{ display: 'flex', gap: 1, flex: 1 }}>
        {Array.from({ length: 16 }, (_, step) => {
          const active = track.clips.some((c: any) => step >= c.start && step < c.start + c.length)
          return (
            <div
              key={step}
              className={`fl-step-btn${active ? ' fl-step-btn--lit' : ''}`}
              style={{
                flex: 1,
                height: 16,
                width: 'auto',
                minWidth: 0,
              }}
              onClick={() => {
                if (!active) addClip(track.id, { start: step, length: 1, color: track.color })
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

/** Status pill (top bar) */
function StatusPill({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: '#111',
      border: '1px solid #0d0d0d',
      borderRadius: 1,
      padding: '1px 6px',
      lineHeight: 1,
    }}>
      <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#444' }}>{label}</div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, marginTop: 1 }}>
        {value}
      </div>
    </div>
  )
}

/** Mini LCD readout for toolbar */
function MiniReadout({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid #0d0d0d',
      borderRadius: 1,
      padding: '1px 5px',
      lineHeight: 1,
      minWidth: 36,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#444' }}>{label}</div>
      <div style={{ fontSize: 11, fontFamily: 'Courier New, monospace', color: '#e8a000', marginTop: 1 }}>{value}</div>
    </div>
  )
}

/** Inspector tile */
function InspectorTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#1a1a1a',
      border: '1px solid #0d0d0d',
      borderRadius: 1,
      padding: '4px 6px',
    }}>
      <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#e0e0e0', marginTop: 2, fontFamily: 'Courier New' }}>{value}</div>
    </div>
  )
}
