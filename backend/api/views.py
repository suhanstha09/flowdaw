import os
import uuid
import json
import threading
import numpy as np
from pathlib import Path
from django.conf import settings
from django.http import FileResponse, JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework import status

# In-memory job store (use Redis/DB in production)
jobs = {}

def get_media_path(*parts):
    path = Path(settings.MEDIA_ROOT).joinpath(*parts)
    path.parent.mkdir(parents=True, exist_ok=True)
    return str(path)


class HealthView(APIView):
    def get(self, request):
        try:
            import torch
            torch_ok = True
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
        except ImportError:
            torch_ok = False
            device = 'cpu'
        try:
            import demucs
            demucs_ok = True
        except ImportError:
            demucs_ok = False
        return Response({
            'status': 'ok',
            'torch': torch_ok,
            'demucs': demucs_ok,
            'device': device,
        })


class WaveformView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('audio')
        if not file:
            return Response({'error': 'No audio file'}, status=400)
        try:
            import soundfile as sf
            import io
            data, samplerate = sf.read(io.BytesIO(file.read()))
            if data.ndim > 1:
                data = data.mean(axis=1)
            # Downsample to ~2000 points for waveform display
            target = 2000
            step = max(1, len(data) // target)
            peaks = []
            for i in range(0, len(data) - step, step):
                chunk = data[i:i+step]
                peaks.append(float(np.max(np.abs(chunk))))
            return Response({
                'peaks': peaks,
                'duration': len(data) / samplerate,
                'sampleRate': samplerate,
                'channels': 1,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class StemSplitView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('audio')
        if not file:
            return Response({'error': 'No audio file provided'}, status=400)

        job_id = str(uuid.uuid4())
        upload_path = get_media_path('uploads', f'{job_id}_{file.name}')

        with open(upload_path, 'wb') as f:
            for chunk in file.chunks():
                f.write(chunk)

        jobs[job_id] = {
            'status': 'queued',
            'progress': 0,
            'stems': {},
            'error': None,
            'filename': file.name,
            'status_detail': 'Queued for processing',
        }

        thread = threading.Thread(target=run_stem_split, args=(job_id, upload_path))
        thread.daemon = True
        thread.start()

        return Response({'job_id': job_id, 'status': 'queued'})


class StemStatusView(APIView):
    def get(self, request, job_id):
        job = jobs.get(job_id)
        if not job:
            return Response({'error': 'Job not found'}, status=404)

        resp = {
            'job_id': job_id,
            'status': job['status'],
            'progress': job['progress'],
            'error': job['error'],
            'filename': job.get('filename', ''),
            'status_detail': job.get('status_detail', ''),
            'stems': {},
        }

        if job['status'] == 'done':
            for stem_name, stem_path in job['stems'].items():
                if os.path.exists(stem_path):
                    rel = os.path.relpath(stem_path, settings.MEDIA_ROOT)
                    resp['stems'][stem_name] = f'/media/{rel}'

        return Response(resp)


class ExportView(APIView):
    def get(self, request):
        path = request.query_params.get('path')
        if not path:
            return Response({'error': 'No path'}, status=400)
        # Security: ensure path is within MEDIA_ROOT
        full = os.path.abspath(os.path.join(settings.MEDIA_ROOT, path.lstrip('/')))
        if not full.startswith(str(settings.MEDIA_ROOT)):
            return Response({'error': 'Invalid path'}, status=403)
        if not os.path.exists(full):
            return Response({'error': 'File not found'}, status=404)
        return FileResponse(open(full, 'rb'), as_attachment=True)


def run_stem_split(job_id, input_path):
    job = jobs[job_id]
    try:
        job['status'] = 'processing'
        job['progress'] = 5
        job['status_detail'] = 'Preparing audio file'

        output_dir = get_media_path('stems', job_id)
        os.makedirs(output_dir, exist_ok=True)

        try:
            import torch
            import demucs.separate
            job['progress'] = 10
            job['status_detail'] = 'Initializing Demucs model'

            # Run demucs
            model = 'htdemucs'
            args = [
                '--two-stems', 'no',
                '-n', model,
                '-o', output_dir,
                '--mp3',
                input_path
            ]

            job['progress'] = 15
            job['status_detail'] = 'Running Demucs separation (first run may download model ~1GB)'
            demucs.separate.main(args)
            job['progress'] = 85
            job['status_detail'] = 'Collecting generated stems'

            # Find output files
            stem_dir = None
            for root, dirs, files in os.walk(output_dir):
                if any(f.endswith(('.wav', '.mp3')) for f in files):
                    stem_dir = root
                    break

            stems = {}
            stem_names = ['vocals', 'drums', 'bass', 'other']
            if stem_dir:
                for f in os.listdir(stem_dir):
                    name = f.replace('.wav','').replace('.mp3','').lower()
                    if name in stem_names:
                        stems[name] = os.path.join(stem_dir, f)

            job['stems'] = stems
            job['progress'] = 100
            job['status'] = 'done'
            job['status_detail'] = 'Done'

        except (ImportError, Exception) as e:
            # Fallback: simulate splitting with numpy if demucs unavailable
            job['progress'] = 20
            job['status_detail'] = 'Demucs unavailable, using fallback splitter'
            _fallback_split(job_id, input_path, output_dir, job)

    except Exception as e:
        job['status'] = 'error'
        job['error'] = str(e)
        job['status_detail'] = 'Processing failed'


def _fallback_split(job_id, input_path, output_dir, job):
    """Fallback stem splitting using basic frequency filtering when Demucs unavailable."""
    try:
        import soundfile as sf
        import numpy as np

        data, sr = sf.read(input_path)
        if data.ndim > 1:
            data = data.mean(axis=1)

        stem_configs = {
            'vocals': {'freq_low': 300, 'freq_high': 3000, 'gain': 1.0},
            'drums':  {'freq_low': 20,  'freq_high': 200,  'gain': 1.2},
            'bass':   {'freq_low': 40,  'freq_high': 400,  'gain': 1.0},
            'other':  {'freq_low': 2000,'freq_high': 8000, 'gain': 0.8},
        }

        stems = {}
        total = len(stem_configs)
        for i, (name, cfg) in enumerate(stem_configs.items()):
            job['progress'] = 20 + int((i / total) * 70)
            job['status_detail'] = f'Generating {name} stem'

            # Simple band-pass using FFT
            fft = np.fft.rfft(data)
            freqs = np.fft.rfftfreq(len(data), 1/sr)
            mask = (freqs >= cfg['freq_low']) & (freqs <= cfg['freq_high'])
            fft_filtered = fft * mask
            stem_data = np.fft.irfft(fft_filtered, n=len(data)) * cfg['gain']
            stem_data = np.clip(stem_data, -1.0, 1.0).astype(np.float32)

            out_path = os.path.join(output_dir, f'{name}.wav')
            sf.write(out_path, stem_data, sr)
            stems[name] = out_path

        job['stems'] = stems
        job['progress'] = 100
        job['status'] = 'done'
        job['status_detail'] = 'Done (fallback splitter)'

    except Exception as e:
        job['status'] = 'error'
        job['error'] = f'Fallback split failed: {str(e)}'
        job['status_detail'] = 'Fallback splitter failed'
