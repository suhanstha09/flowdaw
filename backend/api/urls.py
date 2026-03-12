from django.urls import path, re_path
from . import views

urlpatterns = [
    path('split/', views.StemSplitView.as_view(), name='stem-split'),
    path('split', views.StemSplitView.as_view(), name='stem-split-no-slash'),
    path('split/status/<str:job_id>/', views.StemStatusView.as_view(), name='stem-status'),
    re_path(r'^split/status/(?P<job_id>[^/]+)$', views.StemStatusView.as_view(), name='stem-status-no-slash'),
    path('export/', views.ExportView.as_view(), name='export'),
    path('export', views.ExportView.as_view(), name='export-no-slash'),
    path('waveform/', views.WaveformView.as_view(), name='waveform'),
    path('waveform', views.WaveformView.as_view(), name='waveform-no-slash'),
    path('health/', views.HealthView.as_view(), name='health'),
    path('health', views.HealthView.as_view(), name='health-no-slash'),
]
