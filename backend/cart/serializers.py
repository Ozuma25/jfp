from decimal import Decimal

from rest_framework import serializers

from cart.models import CartItem
from catalog.models import Product
from catalog.utils import effective_bulk_threshold


class CartItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.SlugField(source="product.slug", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.SerializerMethodField()
    unit_price = serializers.DecimalField(
        source="product.price", max_digits=12, decimal_places=2, read_only=True
    )
    line_total = serializers.SerializerMethodField()
    bulk_threshold = serializers.SerializerMethodField()

    # ── Price-change detection ────────────────────────────────────────────────
    price_changed = serializers.SerializerMethodField()
    price_at_add = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, allow_null=True)

    # ── Stock-availability warning ────────────────────────────────────────────
    stock_warning = serializers.SerializerMethodField()
    available_stock = serializers.IntegerField(source="product.stock", read_only=True)

    class Meta:
        model = CartItem
        fields = (
            "id",
            "product_slug",
            "product_name",
            "product_image",
            "quantity",
            "unit_price",
            "price_at_add",
            "price_changed",
            "line_total",
            "bulk_threshold",
            "stock_warning",
            "available_stock",
            "custom_design_file",
        )
        read_only_fields = ("id",)

    def get_product_image(self, obj):
        img = obj.product.images.first()
        if not img or not img.image:
            return None
        request = self.context.get("request")
        url = img.image.url
        if request and url.startswith("/"):
            return request.build_absolute_uri(url)
        return url

    def get_line_total(self, obj):
        return str((obj.product.price * Decimal(obj.quantity)).quantize(Decimal("0.01")))

    def get_bulk_threshold(self, obj):
        return effective_bulk_threshold(obj.product)

    def get_price_changed(self, obj):
        """True when the current product price differs from the price at the time of adding."""
        if obj.price_at_add is None:
            return False
        return obj.product.price != obj.price_at_add

    def get_stock_warning(self, obj):
        """True when the cart quantity exceeds current available stock."""
        return obj.quantity > obj.product.stock



class CartSerializer(serializers.Serializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    coupon = serializers.SerializerMethodField()
    tax_data = serializers.SerializerMethodField()

    def get_subtotal(self, cart) -> str:
        total = Decimal("0")
        for item in cart.items.all().select_related("product"):
            total += item.product.price * Decimal(item.quantity)
        return str(total.quantize(Decimal("0.01")))

    def get_discount(self, cart) -> str:
        if not cart.coupon:
            return "0.00"
        subtotal = Decimal(self.get_subtotal(cart))
        discount = cart.coupon.calculate_discount(subtotal)
        return str(discount)

    def get_tax_data(self, cart):
        subtotal = Decimal(self.get_subtotal(cart))
        discount = Decimal(self.get_discount(cart))
        taxable_amount = subtotal - discount

        total_gst = Decimal("0.00")
        for item in cart.items.all().select_related("product"):
            line_price = (Decimal(item.product.price) * Decimal(item.quantity)).quantize(Decimal("0.01"))
            # proportion of this line vs full subtotal (to apportion discount)
            ratio = line_price / subtotal if subtotal > 0 else Decimal(0)
            line_taxable = (taxable_amount * ratio).quantize(Decimal("0.01"))
            rate = getattr(item.product, "gst_percentage", None) or Decimal("18.00")
            total_gst += (line_taxable * Decimal(str(rate)) / Decimal("100")).quantize(Decimal("0.01"))

        cgst = (total_gst / Decimal("2")).quantize(Decimal("0.01"))
        sgst = (total_gst - cgst).quantize(Decimal("0.01"))

        return {
            "gst_amount": str(total_gst.quantize(Decimal("0.01"))),
            "cgst_amount": str(cgst),
            "sgst_amount": str(sgst),
        }

    def get_total(self, cart) -> str:
        subtotal = Decimal(self.get_subtotal(cart))
        discount = Decimal(self.get_discount(cart))
        tax = Decimal(self.get_tax_data(cart)["gst_amount"])
        return str((subtotal - discount + tax).quantize(Decimal("0.01")))

    def get_coupon(self, cart):
        if not cart.coupon:
            return None
        from coupons.serializers import CouponSerializer
        return CouponSerializer(cart.coupon).data


class CartItemWriteSerializer(serializers.Serializer):
    product_slug = serializers.SlugField()
    quantity = serializers.IntegerField(min_value=1)
    custom_design_file = serializers.FileField(required=False, allow_null=True)

    def validate(self, attrs):
        slug = attrs["product_slug"]
        qty = attrs["quantity"]
        try:
            product = Product.objects.get(slug=slug, is_active=True)
        except Product.DoesNotExist as e:
            raise serializers.ValidationError({"product_slug": "Product not found."}) from e

        threshold = effective_bulk_threshold(product)
        if qty > threshold:
            raise serializers.ValidationError(
                {
                    "quantity": (
                        f"Quantity over bulk threshold ({threshold}). "
                        "Use the quote request flow instead."
                    ),
                    "code": "BULK_QUOTE_REQUIRED",
                }
            )
        if qty > product.stock:
            raise serializers.ValidationError(
                {"quantity": f"Only {product.stock} available in stock."}
            )

        attrs["product"] = product
        return attrs
