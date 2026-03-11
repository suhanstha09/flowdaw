from rest_framework import serializers
from .models import AudioProject, Track, AudioClip, MidiNote, StemSplitJob, MixerChannel


class MidiNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MidiNote
        fields = '__all__'


class AudioClipSerializer(serializers.ModelSerializer):
    audio_url = serializers.SerializerMethodField()

    class Meta:
        model = AudioClip
        fields = '__all__'

    def get_audio_url(self, obj):
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
        return None


class TrackSerializer(serializers.ModelSerializer):
    clips = AudioClipSerializer(many=True, read_only=True)
    midi_notes = MidiNoteSerializer(many=True, read_only=True)

    class Meta:
        model = Track
        fields = '__all__'


class MixerChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = MixerChannel
        fields = '__all__'


class AudioProjectSerializer(serializers.ModelSerializer):
    tracks = TrackSerializer(many=True, read_only=True)
    mixer_channels = MixerChannelSerializer(many=True, read_only=True)

    class Meta:
        model = AudioProject
        fields = '__all__'


class AudioProjectListSerializer(serializers.ModelSerializer):
    track_count = serializers.SerializerMethodField()

    class Meta:
        model = AudioProject
        fields = ['id', 'name', 'bpm', 'key', 'scale', 'created_at', 'updated_at', 'track_count']

    def get_track_count(self, obj):
        return obj.tracks.count()


class StemSplitJobSerializer(serializers.ModelSerializer):
    vocals_url = serializers.SerializerMethodField()
    drums_url = serializers.SerializerMethodField()
    bass_url = serializers.SerializerMethodField()
    other_url = serializers.SerializerMethodField()

    class Meta:
        model = StemSplitJob
        fields = '__all__'
        read_only_fields = ['status', 'progress', 'vocals_file', 'drums_file', 'bass_file', 'other_file']

    def _build_url(self, obj, field):
        f = getattr(obj, field)
        if f:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f.url)
        return None

    def get_vocals_url(self, obj): return self._build_url(obj, 'vocals_file')
    def get_drums_url(self, obj):  return self._build_url(obj, 'drums_file')
    def get_bass_url(self, obj):   return self._build_url(obj, 'bass_file')
    def get_other_url(self, obj):  return self._build_url(obj, 'other_file')
