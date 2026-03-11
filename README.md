# 🎛 FlowDAW

A professional browser-based DAW with **real AI stem splitting** powered by Meta's Demucs model.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| Backend | Django 4.2, Django REST Framework, Channels (WebSocket) |
| AI | Demucs (htdemucs model) — separates vocals, drums, bass, other |
| Audio Engine | Web Audio API (Tone.js) |

---

## Quick Start

### 1. Backend (Django)

```bash
cd backend

# Create virtualenv
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install deps (PyTorch first for your platform)
# CPU only (lighter, slower splitting):
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# GPU (NVIDIA CUDA 12.1, faster):
# pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install rest
pip install -r requirements.txt

# Run migrations & start
python manage.py migrate
python manage.py runserver
```

Backend runs at: **http://localhost:8000**

> **First stem split will download ~1GB Demucs model.** Subsequent runs use cache.

---

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

## Features

### 🎛 Sequencer
- Multi-track arrangement view with color-coded clips
- Live playhead with BPM control (drag to change tempo)
- Mute / Solo per track
- Click grid to add clips

### 🎹 Piano Roll
- 88-key scrollable piano keyboard
- Click to add/remove MIDI notes with audio preview
- Sub-beat grid for fine placement

### 🎚 Mixer
- Per-channel faders, pan knobs, VU meters
- Animated VU levels during playback
- FX slot display (Reverb, Delay, EQ, Compressor)
- Mute / Solo per channel

### ✂️ Stem Splitter (Backend Required)
- Upload any audio file (WAV/MP3/OGG/FLAC, up to 200MB)
- Real AI separation using **Demucs htdemucs** model
- Outputs: Vocals · Drums · Bass · Other
- Play each stem in browser
- Export individual stems as WAV
- Fallback FFT-based splitting when Demucs unavailable

### 🎧 Audio Editor
- Load any audio file and view full waveform
- Zoom (Ctrl+scroll or buttons) and scroll
- Click-drag to select regions
- Effects: Fade In, Fade Out, Normalize, Reverse
- Full Undo/Redo history
- Export as WAV

---

## Project Structure

```
flowdaw/
├── backend/
│   ├── flowdaw_backend/       # Django project settings
│   ├── api/
│   │   ├── views.py           # REST endpoints + Demucs integration
│   │   └── urls.py
│   ├── media/                 # Uploaded & processed audio
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── app/               # Next.js App Router
    │   ├── components/
    │   │   ├── sequencer/     # Song arranger
    │   │   ├── piano/         # Piano roll
    │   │   ├── mixer/         # Channel mixer
    │   │   ├── stemSplitter/  # AI stem splitter UI
    │   │   └── editor/        # Waveform audio editor
    │   ├── store/dawStore.ts  # Zustand global state
    │   └── lib/api.ts         # Django API client
    └── package.json
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health/` | Backend + Demucs status |
| POST | `/api/split/` | Upload audio, start stem job |
| GET | `/api/split/status/<job_id>/` | Poll job progress + stem URLs |
| POST | `/api/waveform/` | Get waveform peaks from audio |

---

## Roadmap

- [ ] Real-time MIDI playback via Tone.js
- [ ] WebSocket live progress (Channels)
- [ ] User accounts & project save/load (PostgreSQL)
- [ ] VST-style effect chain UI
- [ ] Collaborative editing (CRDT)
- [ ] Mobile touch support
