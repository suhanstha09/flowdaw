"""
Stem splitting service using Meta's Demucs model.
Runs as a background task and updates job status via WebSocket.
"""
import os
import threading
import traceback
from pathlib import Path
from django.conf import settings
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def split_stems_async(job_id: str):
    """Launch stem splitting in a background thread."""
    thread = threading.Thread(target=_run_split, args=(job_id,), daemon=True)
    thread.start()


def _notify(job_id: str, data: dict):
    """Send WebSocket update to the job's channel group."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'stem_{job_id}',
            {'type': 'stem.update', **data}
        )
    except Exception:
        pass  # WebSocket optional; don't crash the job


def _run_split(job_id: str):
    from api.models import StemSplitJob

    job = StemSplitJob.objects.get(id=job_id)
    job.status = 'processing'
    job.progress = 5
    job.save()
    _notify(job_id, {'status': 'processing', 'progress': 5})

    try:
        import demucs.separate
        import torch
        import soundfile as sf
        import numpy as np

        input_path = Path(settings.MEDIA_ROOT) / job.original_file.name
        out_dir = Path(settings.MEDIA_ROOT) / 'stems' / str(job_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        job.progress = 15
        job.save()
        _notify(job_id, {'status': 'processing', 'progress': 15, 'message': 'Loading model...'})

        # Run demucs (htdemucs = hybrid transformer, best quality)
        demucs.separate.main([
            '--two-stems', 'no',  # get all 4 stems
            '-n', 'htdemucs',
            '--mp3',
            '-o', str(out_dir),
            str(input_path),
        ])

        job.progress = 85
        job.save()
        _notify(job_id, {'status': 'processing', 'progress': 85, 'message': 'Saving stems...'})

        # Demucs outputs to: out_dir/htdemucs/<filename>/{vocals,drums,bass,other}.mp3
        stem_base = out_dir / 'htdemucs' / input_path.stem
        stem_map = {
            'vocals': stem_base / 'vocals.mp3',
            'drums':  stem_base / 'drums.mp3',
            'bass':   stem_base / 'bass.mp3',
            'other':  stem_base / 'other.mp3',
        }

        rel_base = Path('stems') / str(job_id) / 'htdemucs' / input_path.stem
        job.vocals_file = str(rel_base / 'vocals.mp3')
        job.drums_file  = str(rel_base / 'drums.mp3')
        job.bass_file   = str(rel_base / 'bass.mp3')
        job.other_file  = str(rel_base / 'other.mp3')
        job.status = 'done'
        job.progress = 100
        job.completed_at = timezone.now()
        job.save()

        _notify(job_id, {
            'status': 'done',
            'progress': 100,
            'message': 'Stems ready!',
        })

    except Exception as e:
        job.status = 'error'
        job.error_message = traceback.format_exc()
        job.save()
        _notify(job_id, {'status': 'error', 'message': str(e)})
