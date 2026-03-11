import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.generic.websocket import AsyncWebsocketConsumer
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flowdaw_backend.settings')

class ProgressConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.job_id = self.scope['url_route']['kwargs']['job_id']
        await self.channel_layer.group_add(f'job_{self.job_id}', self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(f'job_{self.job_id}', self.channel_name)

    async def job_progress(self, event):
        await self.send(text_data=json.dumps(event))

from django.urls import re_path
websocket_urlpatterns = [
    re_path(r'ws/progress/(?P<job_id>[^/]+)/$', ProgressConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': URLRouter(websocket_urlpatterns),
})
