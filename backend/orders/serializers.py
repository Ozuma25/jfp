from decimal import Decimal

from rest_framework import serializers

from orders.models import Order, OrderLine, OrderStatusHistory, BulkQuoteRequest
from catalog.models import Product


class BulkQuoteRequestSerializer(serializers.ModelSerializer):
    product_slug = serializers.SlugField(source="product.slug")
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.SerializerMethodField()
    order_display_number = serializers.CharField(source="order.order_number", read_only=True)
    
    class Meta:
        model = BulkQuoteRequest
        fields = ("id", "product_slug", "product_name", "product_image", "quantity", "name", "email", "phone", "requirements", "status", "quoted_price_per_unit", "admin_notes", "order", "order_display_number", "created_at")
        read_only_fields = ("id", "status", "quoted_price_per_unit", "admin_notes", "order", "order_display_number", "created_at")

    def get_product_image(self, obj):
        img = obj.product.images.first()
        if img and img.image:
            request = self.context.get("request")
            return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None

    def create(self, validated_data):
        product_identifier = validated_data.pop("product")["slug"]  # field value from frontend

        # Try slug first, then SKU — the frontend now sends the real SKU
        product = (
            Product.objects.filter(slug=product_identifier).first()
            or Product.objects.filter(sku__iexact=product_identifier).first()
        )
        if not product:
            raise serializers.ValidationError(
                {"product_slug": f"No product found with slug or SKU '{product_identifier}'."}
            )
        return BulkQuoteRequest.objects.create(product=product, **validated_data)


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ("status", "note", "created_at")


class OrderLineSerializer(serializers.ModelSerializer):
    product_id = serializers.ReadOnlyField(source="product.id")
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.SlugField(source="product.slug", read_only=True)
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderLine
        fields = (
            "product_id",
            "product_name",
            "product_slug",
            "product_image",
            "quantity",
            "unit_price",
            "line_total",
            "custom_design_file",
        )

    def get_product_image(self, obj):
        img = obj.product.images.first()
        if img and img.image:
            request = self.context.get("request")
            return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None


class OrderListSerializer(serializers.ModelSerializer):
    first_item_image = serializers.SerializerMethodField()
    first_item_name = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ("id", "order_number", "status", "total", "currency", "created_at", "first_item_image", "first_item_name", "item_count")

    def get_first_item_image(self, obj):
        first_line = obj.lines.first()
        if first_line:
            img = first_line.product.images.first()
            if img and img.image:
                request = self.context.get("request")
                return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None

    def get_first_item_name(self, obj):
        line = obj.lines.first()
        return line.product.name if line else ""
        
    def get_item_count(self, obj):
        return sum(line.quantity for line in obj.lines.all())


class OrderDetailSerializer(serializers.ModelSerializer):
    lines = OrderLineSerializer(many=True, read_only=True)
    history = OrderStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "status",
            "currency",
            "subtotal",
            "total",
            "shipping_name",
            "shipping_phone",
            "shipping_address_line1",
            "shipping_address_line2",
            "shipping_city",
            "shipping_state",
            "shipping_postal_code",
            "razorpay_order_id",
            "admin_rejection_reason",
            "is_bulk",
            "tracking_number",
            "tracking_provider",
            "tracking_url",
            "created_at",
            "lines",
            "history",
        )


class CheckoutSerializer(serializers.Serializer):
    shipping_name = serializers.CharField(max_length=200)
    shipping_phone = serializers.CharField(max_length=20)
    shipping_address_line1 = serializers.CharField(max_length=255)
    shipping_address_line2 = serializers.CharField(
        max_length=255, required=False, allow_blank=True
    )
    shipping_city = serializers.CharField(max_length=100)
    shipping_state = serializers.CharField(max_length=100)
    shipping_postal_code = serializers.CharField(max_length=20)


class RazorpayVerifySerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()
