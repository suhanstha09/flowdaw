import json
from channels.generic.websocket import AsyncWebsocketConsumer


class StemProgressConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time stem splitting progress.
    Frontend connects to ws://localhost:8000/ws/stems/<job_id>/
    and receives progress updates.
    """

    async def connect(self):
        self.job_id = self.scope['url_route']['kwargs']['job_id']
        self.group_name = f'stem_{self.job_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def stem_update(self, event):
        """Receive update from stem_service and forward to WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'progress',
            'status': event.get('status'),
            'progress': event.get('progress', 0),
            'message': event.get('message', ''),
        }))


class DAWCollabConsumer(AsyncWebsocketConsumer):
    """
    (Future) Real-time collaboration consumer.
    Multiple users can edit the same project simultaneously.
    """

    async def connect(self):
        self.project_id = self.scope['url_route']['kwargs']['project_id']
        self.group_name = f'project_{self.project_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        # Broadcast changes to all collaborators
        await self.channel_layer.group_send(
            self.group_name,
            {'type': 'project.change', 'data': data, 'sender': self.channel_name}
        )

    async def project_change(self, event):
        if event.get('sender') != self.channel_name:
            await self.send(text_data=json.dumps(event['data']))
