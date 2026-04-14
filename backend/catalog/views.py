from django.db.models import Prefetch
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.filters import ProductFilter
from catalog.models import Category, Product, ProductImage, SiteSettings
from catalog.pagination import CatalogPagination
from catalog.serializers import CategorySerializer, ProductDetailSerializer, ProductListSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = "slug"


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    filterset_class = ProductFilter
    pagination_class = CatalogPagination
    lookup_field = "slug"

    def get_queryset(self):
        qs = (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related(
                Prefetch(
                    "images",
                    queryset=ProductImage.objects.order_by("sort_order", "id"),
                )
            )
        )
        ordering = self.request.query_params.get("ordering", "")
        if ordering in ("created_at", "-created_at", "price", "-price", "name", "-name"):
            qs = qs.order_by(ordering)
        elif ordering == "new":
            qs = qs.order_by("-created_at")
        else:
            qs = qs.order_by("name")
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["site_settings"] = SiteSettings.objects.first()
        return ctx

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductListSerializer


class SiteSettingsPublicView(APIView):
    """Expose default bulk threshold for storefront logic."""

    def get(self, request):
        row = SiteSettings.objects.first()
        if not row:
            return Response({"default_bulk_threshold": 100})
        return Response({"default_bulk_threshold": row.default_bulk_threshold})
