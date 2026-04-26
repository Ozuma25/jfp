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
    pickup_at_store = serializers.SerializerMethodField()

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
            "shipping_method",
            "shipping_cost",
            "pickup_at_store",
            "is_business_order",
            "billing_company_name",
            "billing_gst_number",
            "razorpay_order_id",
            "admin_rejection_reason",
            "is_bulk",
            "tracking_number",
            "tracking_provider",
            "tracking_url",
            "invoice_pdf",
            "created_at",
            "lines",
            "history",
        )

    def get_pickup_at_store(self, obj: Order):
        """Current store address from settings (not the order snapshot). Used for store pickup display."""
        if obj.shipping_method != Order.ShippingMethod.STORE_PICKUP:
            return None
        from django.conf import settings as dj_settings

        spa = getattr(dj_settings, "STORE_PICKUP_ADDRESS", {}) or {}
        return {
            "line1": spa.get("line1", ""),
            "line2": spa.get("line2", ""),
            "city": spa.get("city", ""),
            "state": spa.get("state", ""),
            "postal_code": spa.get("postal_code", ""),
            "map_url": (getattr(dj_settings, "STORE_PICKUP_MAP_URL", "") or "").strip(),
        }


class CheckoutSerializer(serializers.Serializer):
    shipping_method = serializers.ChoiceField(
        choices=Order.ShippingMethod.choices,
        default=Order.ShippingMethod.DOORSTEP,
    )
    shipping_name = serializers.CharField(max_length=200)
    shipping_phone = serializers.CharField(max_length=20)
    shipping_address_line1 = serializers.CharField(
        max_length=255, required=False, allow_blank=True
    )
    shipping_address_line2 = serializers.CharField(
        max_length=255, required=False, allow_blank=True
    )
    shipping_city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    shipping_state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    shipping_postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    is_business_order = serializers.BooleanField(required=False, default=False)

    def validate(self, data):
        from django.conf import settings as dj_settings

        method = data.get("shipping_method", Order.ShippingMethod.DOORSTEP)
        pickup_addr = getattr(dj_settings, "STORE_PICKUP_ADDRESS", {}) or {}

        if method == Order.ShippingMethod.STORE_PICKUP:
            data["shipping_address_line1"] = (
                (data.get("shipping_address_line1") or "").strip()
                or pickup_addr.get("line1", "Store pickup")
            )
            data["shipping_address_line2"] = (data.get("shipping_address_line2") or "").strip() or pickup_addr.get(
                "line2", ""
            )
            data["shipping_city"] = (
                (data.get("shipping_city") or "").strip() or pickup_addr.get("city", "")
            )
            data["shipping_state"] = (
                (data.get("shipping_state") or "").strip() or pickup_addr.get("state", "")
            )
            data["shipping_postal_code"] = (
                (data.get("shipping_postal_code") or "").strip() or pickup_addr.get("postal_code", "")
            )
        else:
            errors = {}
            if not (data.get("shipping_address_line1") or "").strip():
                errors["shipping_address_line1"] = "Required for delivery."
            if not (data.get("shipping_city") or "").strip():
                errors["shipping_city"] = "Required for delivery."
            if not (data.get("shipping_state") or "").strip():
                errors["shipping_state"] = "Required for delivery."
            postal = (data.get("shipping_postal_code") or "").strip()
            if len(postal) != 6 or not postal.isdigit():
                errors["shipping_postal_code"] = "Enter a valid 6-digit PIN code."
            if errors:
                raise serializers.ValidationError(errors)
            data["shipping_postal_code"] = postal
        return data


class RazorpayVerifySerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()
