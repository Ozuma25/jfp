from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from core import views as core_views

urlpatterns = [
    path("", core_views.root),
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/", include("catalog.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("cart.urls")),
    path("api/", include("orders.urls")),
    path("api/", include("reviews.urls")),
    path("api/", include("wishlist.urls")),
    path("api/coupons/", include("coupons.urls")),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = "Jai Fancy Packs"
admin.site.site_title = "Jai Fancy Packs Admin"
