'use client'
import { useDawStore } from '@/store/dawStore'
import { TransportBar } from '@/components/ui/TransportBar'
import { Sequencer } from '@/components/sequencer/Sequencer'
import { PianoRoll } from '@/components/piano/PianoRoll'
import { Mixer } from '@/components/mixer/Mixer'
import { StemSplitter } from '@/components/stemSplitter/StemSplitter'
import { AudioEditor } from '@/components/editor/AudioEditor'

const TABS = [
  { id: 'sequencer', label: '🎛 Sequencer' },
  { id: 'piano',     label: '🎹 Piano Roll' },
  { id: 'mixer',     label: '🎚 Mixer' },
  { id: 'stem',      label: '✂️ Stem Splitter' },
  { id: 'editor',    label: '🎧 Audio Editor' },
] as const

export default function Home() {
  const { activeTab, setActiveTab } = useDawStore()

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base">
      {/* Title Bar */}
      <div className="h-9 bg-[#111115] border-b border-border flex items-center px-3 gap-4 flex-shrink-0">
        <div className="font-display font-bold text-[18px] text-accent tracking-[2px] uppercase">
          Flow<span className="text-text-dim font-normal">DAW</span>
        </div>
        <div className="flex gap-0.5">
          {['File','Edit','View','Tools','Help'].map(m => (
            <button key={m} className="px-2.5 py-1 text-[12px] text-text-dim hover:text-text hover:bg-raised rounded uppercase tracking-wider font-medium transition-all">
              {m}
            </button>
          ))}
        </div>
        <div className="ml-auto text-[11px] text-text-faint font-mono">v0.1.0-alpha</div>
      </div>

      {/* Transport */}
      <TransportBar />

      {/* Tabs */}
      <div className="flex bg-[#111115] border-b-2 border-border flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 text-[12px] font-semibold uppercase tracking-wider border-r border-border transition-all relative cursor-pointer
              ${activeTab === tab.id
                ? 'text-accent bg-panel after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[2px] after:bg-accent'
                : 'text-text-dim hover:text-text hover:bg-raised'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {activeTab === 'sequencer' && <Sequencer />}
        {activeTab === 'piano'     && <PianoRoll />}
        {activeTab === 'mixer'     && <Mixer />}
        {activeTab === 'stem'      && <StemSplitter />}
        {activeTab === 'editor'    && <AudioEditor />}
      </div>
    </div>
  )
}
