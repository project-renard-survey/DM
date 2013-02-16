# project urls module

from django.conf.urls.defaults import patterns, url, include
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
import workspace
import accounts
import semantic_store

admin.autodiscover()

urlpatterns = patterns('',
    url(r'^admin/', include(admin.site.urls)),
    url(r'^workspace/', include(workspace.urls)),
    url(r'^accounts/', include(accounts.urls)),
    url(r'^store/', include(semantic_store.urls)),
) + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
