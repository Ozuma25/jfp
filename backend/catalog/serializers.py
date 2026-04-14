from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from catalog.models import Category, Product, SiteSettings


def _money_inr(value: Decimal) -> str:
    return f"₹ {value:,.0f}" if value == value.to_integral() else f"₹ {value:,.2f}"


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description")


class ProductListSerializer(serializers.ModelSerializer):
    """Card / list view."""

    title = serializers.CharField(source="name", read_only=True)
    price = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    badge = serializers.SerializerMethodField()
    rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    bulk_threshold = serializers.SerializerMethodField()
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    images = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "slug",
            "sku",
            "title",
            "price",
            "image",
            "images",
            "badge",
            "rating",
            "review_count",
            "bulk_threshold",
            "min_qty",
            "is_customizable",
            "category_slug",
            "stock",
        )

    def get_images(self, obj: Product) -> list[str]:
        request = self.context.get("request")
        out: list[str] = []
        for im in obj.images.all():
            if not im.image:
                continue
            url = im.image.url
            if request and url.startswith("/"):
                url = request.build_absolute_uri(url)
            out.append(url)
        return out

    def get_price(self, obj: Product) -> str:
        return _money_inr(obj.price)

    def get_image(self, obj: Product) -> str | None:
        img = obj.images.first()
        if not img or not img.image:
            return None
        request = self.context.get("request")
        url = img.image.url
        if request and url.startswith("/"):
            return request.build_absolute_uri(url)
        return url

    def get_badge(self, obj: Product) -> str | None:
        if obj.is_bestseller:
            return "Bestseller"
        if obj.compare_at_price and obj.compare_at_price > obj.price:
            return "Sale"
        days = (timezone.now() - obj.created_at).days
        if days <= 21:
            return "New"
        return None


    def get_bulk_threshold(self, obj: Product) -> int | None:
        if obj.bulk_threshold is not None:
            return obj.bulk_threshold
        settings_row = self.context.get("site_settings")
        if settings_row is None:
            settings_row = SiteSettings.objects.first()
        if settings_row:
            return settings_row.default_bulk_threshold
        return None


class ProductDetailSerializer(ProductListSerializer):
    description = serializers.CharField()
    compare_at_price_display = serializers.SerializerMethodField()
    recent_sales_count = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + (
            "description",
            "compare_at_price_display",
            "is_bestseller",
            "created_at",
            "recent_sales_count",
        )

    def get_recent_sales_count(self, obj: Product) -> int:
        from orders.models import OrderLine
        from django.utils import timezone
        last_24h = timezone.now() - timezone.timedelta(hours=24)
        return OrderLine.objects.filter(
            product=obj,
            order__created_at__gte=last_24h,
            order__status__in=["paid", "processing", "shipped", "delivered"]
        ).values('order__user').distinct().count()

    def get_compare_at_price_display(self, obj: Product) -> str | None:
        if not obj.compare_at_price:
            return None
        return _money_inr(obj.compare_at_price)
