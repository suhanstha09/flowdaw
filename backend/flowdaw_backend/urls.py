from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def root(request):
    return JsonResponse({
        'service': 'FlowDAW backend',
        'status': 'ok',
        'health': '/api/health/',
    })

urlpatterns = [
    path('', root),
    path('api/', include('api.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
