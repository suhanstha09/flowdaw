from django.urls import path
from .consumers import StemProgressConsumer, DAWCollabConsumer

websocket_urlpatterns = [
    path('ws/stems/<str:job_id>/', StemProgressConsumer.as_asgi()),
    path('ws/project/<str:project_id>/', DAWCollabConsumer.as_asgi()),
]
