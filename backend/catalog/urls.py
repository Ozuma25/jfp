from django.urls import include, path
from rest_framework.routers import DefaultRouter

from catalog import views

router = DefaultRouter()
router.register(r"categories", views.CategoryViewSet, basename="category")
router.register(r"products", views.ProductViewSet, basename="product")

urlpatterns = [
    path("site-settings/", views.SiteSettingsPublicView.as_view(), name="site-settings"),
    path("", include(router.urls)),
]
