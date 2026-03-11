"""
Server-side audio processing utilities.
Used for waveform data generation and audio effects.
"""
import numpy as np
import io
import struct
import wave
from pathlib import Path


def get_waveform_peaks(audio_file_path: str, num_points: int = 1000) -> dict:
    """
    Read an audio file and return downsampled peak data for waveform display.
    Returns min/max arrays for efficient waveform rendering.
    """
    try:
        import soundfile as sf
        data, samplerate = sf.read(audio_file_path, always_2d=True)
        # Mix to mono
        mono = data.mean(axis=1)
        samples = len(mono)
        step = max(1, samples // num_points)
        mins, maxs = [], []
        for i in range(0, samples, step):
            chunk = mono[i:i+step]
            mins.append(float(chunk.min()))
            maxs.append(float(chunk.max()))
        return {
            'mins': mins[:num_points],
            'maxs': maxs[:num_points],
            'duration': len(mono) / samplerate,
            'samplerate': samplerate,
            'channels': data.shape[1],
        }
    except Exception as e:
        return {'error': str(e)}


def apply_effects(input_path: str, output_path: str, effects: list) -> bool:
    """
    Apply a chain of audio effects to a file.
    effects: list of dicts like [{'type': 'normalize'}, {'type': 'fade_in', 'duration': 2.0}]
    """
    try:
        import soundfile as sf
        import numpy as np
        data, sr = sf.read(input_path, always_2d=True)

        for effect in effects:
            etype = effect.get('type')
            if etype == 'normalize':
                peak = np.abs(data).max()
                if peak > 0:
                    data = data / peak * 0.95
            elif etype == 'fade_in':
                dur = effect.get('duration', 1.0)
                samples = min(int(dur * sr), len(data))
                fade = np.linspace(0, 1, samples)
                data[:samples] *= fade[:, np.newaxis]
            elif etype == 'fade_out':
                dur = effect.get('duration', 1.0)
                samples = min(int(dur * sr), len(data))
                fade = np.linspace(1, 0, samples)
                data[-samples:] *= fade[:, np.newaxis]
            elif etype == 'reverse':
                data = data[::-1]
            elif etype == 'gain':
                db = effect.get('db', 0)
                data = data * (10 ** (db / 20))
                data = np.clip(data, -1.0, 1.0)
            elif etype == 'trim_silence':
                threshold = effect.get('threshold', 0.01)
                mono = data.mean(axis=1)
                mask = np.abs(mono) > threshold
                if mask.any():
                    start = np.argmax(mask)
                    end = len(mask) - np.argmax(mask[::-1])
                    data = data[start:end]

        sf.write(output_path, data, sr)
        return True
    except Exception as e:
        print(f"Effect error: {e}")
        return False


def generate_spectrogram_data(audio_file_path: str, n_fft: int = 2048) -> dict:
    """Generate spectrogram data for visualization."""
    try:
        import librosa
        import numpy as np
        y, sr = librosa.load(audio_file_path, sr=None, duration=30)
        S = librosa.amplitude_to_db(np.abs(librosa.stft(y, n_fft=n_fft)), ref=np.max)
        # Downsample for transfer
        step_t = max(1, S.shape[1] // 200)
        step_f = max(1, S.shape[0] // 128)
        S_small = S[::step_f, ::step_t]
        return {
            'data': S_small.tolist(),
            'shape': list(S_small.shape),
            'duration': float(len(y) / sr),
        }
    except Exception as e:
        return {'error': str(e)}
