from django.db import models
import uuid


class AudioProject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, default='Untitled Project')
    bpm = models.IntegerField(default=128)
    time_signature_num = models.IntegerField(default=4)
    time_signature_den = models.IntegerField(default=4)
    key = models.CharField(max_length=10, default='C')
    scale = models.CharField(max_length=20, default='Major')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.name


class Track(models.Model):
    TRACK_TYPES = [
        ('audio', 'Audio'),
        ('synth', 'Synth'),
        ('drums', 'Drums'),
        ('midi', 'MIDI'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(AudioProject, related_name='tracks', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    track_type = models.CharField(max_length=20, choices=TRACK_TYPES, default='audio')
    color = models.CharField(max_length=7, default='#ff6b00')
    volume = models.FloatField(default=0.8)
    pan = models.FloatField(default=0.0)
    muted = models.BooleanField(default=False)
    soloed = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.project.name} / {self.name}"


class AudioClip(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    track = models.ForeignKey(Track, related_name='clips', on_delete=models.CASCADE)
    start_beat = models.FloatField(default=0)
    duration_beats = models.FloatField(default=4)
    audio_file = models.FileField(upload_to='uploads/', null=True, blank=True)
    name = models.CharField(max_length=100, default='Clip')
    created_at = models.DateTimeField(auto_now_add=True)


class MidiNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    track = models.ForeignKey(Track, related_name='midi_notes', on_delete=models.CASCADE)
    midi_note = models.IntegerField()  # 0-127
    start_beat = models.FloatField()
    duration_beats = models.FloatField(default=0.5)
    velocity = models.IntegerField(default=100)


class StemSplitJob(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('done', 'Done'),
        ('error', 'Error'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_file = models.FileField(upload_to='uploads/')
    original_filename = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Stem output files
    vocals_file = models.FileField(upload_to='stems/', null=True, blank=True)
    drums_file = models.FileField(upload_to='stems/', null=True, blank=True)
    bass_file = models.FileField(upload_to='stems/', null=True, blank=True)
    other_file = models.FileField(upload_to='stems/', null=True, blank=True)

    def __str__(self):
        return f"StemJob({self.original_filename}, {self.status})"


class MixerChannel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(AudioProject, related_name='mixer_channels', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    volume = models.FloatField(default=0.8)
    pan = models.FloatField(default=0.0)
    muted = models.BooleanField(default=False)
    soloed = models.BooleanField(default=False)
    fx_chain = models.JSONField(default=list)
    order = models.IntegerField(default=0)
    is_master = models.BooleanField(default=False)

    class Meta:
        ordering = ['order']
