from django.urls import path
from . import views

urlpatterns = [
    path('split/', views.StemSplitView.as_view(), name='stem-split'),
    path('split/status/<str:job_id>/', views.StemStatusView.as_view(), name='stem-status'),
    path('export/', views.ExportView.as_view(), name='export'),
    path('waveform/', views.WaveformView.as_view(), name='waveform'),
    path('health/', views.HealthView.as_view(), name='health'),
]
