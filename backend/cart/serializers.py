from decimal import Decimal

from rest_framework import serializers

from cart.models import CartItem
from catalog.models import Product, ProductVariant
from catalog.utils import effective_bulk_threshold


class CartItemSerializer(serializers.ModelSerializer):
    product_slug   = serializers.SlugField(source="product.slug", read_only=True)
    product_name   = serializers.CharField(source="product.name", read_only=True)
    product_sku    = serializers.CharField(source="product.sku",  read_only=True)
    effective_sku  = serializers.SerializerMethodField()  # base_sku[-suffix] for variant items
    product_image  = serializers.SerializerMethodField()
    unit_price     = serializers.SerializerMethodField()   # uses effective_price
    line_total     = serializers.SerializerMethodField()
    bulk_threshold = serializers.SerializerMethodField()

    # Variant info
    variant_id    = serializers.IntegerField(source="variant.id",    read_only=True, allow_null=True)
    variant_label = serializers.SerializerMethodField()  # e.g. "Blue / Medium"

    # ── Price-change detection ────────────────────────────────────────────────
    price_changed = serializers.SerializerMethodField()
    price_at_add  = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, allow_null=True)

    # ── Stock-availability warning ────────────────────────────────────────────
    stock_warning   = serializers.SerializerMethodField()
    available_stock = serializers.SerializerMethodField()  # variant stock or product stock

    class Meta:
        model = CartItem
        fields = (
            "id",
            "product_slug",
            "product_name",
            "product_sku",
            "effective_sku",
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
            "variant_id",
            "variant_label",
        )
        read_only_fields = ("id",)

    def get_product_image(self, obj):
        # Prefer variant images when available
        if obj.variant:
            vi = obj.variant.images.first()
            if vi and vi.image:
                request = self.context.get("request")
                url = vi.image.url
                return request.build_absolute_uri(url) if request and url.startswith("/") else url
        img = obj.product.images.first()
        if not img or not img.image:
            return None
        request = self.context.get("request")
        url = img.image.url
        return request.build_absolute_uri(url) if request and url.startswith("/") else url

    def get_unit_price(self, obj):
        return str(obj.effective_price.quantize(Decimal("0.01")))

    def get_effective_sku(self, obj):
        base = obj.product.sku or obj.product.slug
        if obj.variant and obj.variant.sku_suffix:
            return f"{base}-{obj.variant.sku_suffix}"
        return base

    def get_variant_label(self, obj):
        if not obj.variant:
            return None
        parts = [p for p in [obj.variant.color, obj.variant.size] if p]
        return " / ".join(parts) if parts else None

    def get_line_total(self, obj):
        return str((obj.effective_price * Decimal(obj.quantity)).quantize(Decimal("0.01")))

    def get_bulk_threshold(self, obj):
        return effective_bulk_threshold(obj.product)

    def get_price_changed(self, obj):
        """True when the current effective price differs from price at add time."""
        if obj.price_at_add is None:
            return False
        return obj.effective_price != obj.price_at_add

    def get_stock_warning(self, obj):
        """True when cart quantity exceeds the stock of the variant (or product)."""
        stock = obj.variant.stock if obj.variant else obj.product.stock
        return obj.quantity > stock

    def get_available_stock(self, obj):
        """Return variant stock when a variant is present, else product stock."""
        return obj.variant.stock if obj.variant else obj.product.stock



class CartSerializer(serializers.Serializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    coupon = serializers.SerializerMethodField()
    tax_data = serializers.SerializerMethodField()

    def get_subtotal(self, cart) -> str:
        total = Decimal("0")
        for item in cart.items.all().select_related("product", "variant"):
            total += item.effective_price * Decimal(item.quantity)
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
        for item in cart.items.all().select_related("product", "variant"):
            line_price = (item.effective_price * Decimal(item.quantity)).quantize(Decimal("0.01"))
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
    quantity     = serializers.IntegerField(min_value=1)
    variant_id   = serializers.IntegerField(required=False, allow_null=True)
    custom_design_file = serializers.FileField(required=False, allow_null=True)

    def validate(self, attrs):
        slug       = attrs["product_slug"]
        qty        = attrs["quantity"]
        variant_id = attrs.get("variant_id")

        try:
            product = Product.objects.get(slug=slug, is_active=True)
        except Product.DoesNotExist as e:
            raise serializers.ValidationError({"product_slug": "Product not found."}) from e

        # ── Validate variant belongs to this product ───────────────────────
        variant = None
        if variant_id is not None:
            try:
                variant = ProductVariant.objects.get(id=variant_id, product=product)
            except ProductVariant.DoesNotExist:
                raise serializers.ValidationError(
                    {"variant_id": "Invalid variant for this product."}
                )

        # ── Stock check: use variant stock when variant is selected ────────
        available_stock = variant.stock if variant else product.stock
        threshold       = effective_bulk_threshold(product)

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
        if qty > available_stock:
            raise serializers.ValidationError(
                {"quantity": f"Only {available_stock} available in stock."}
            )

        attrs["product"] = product
        attrs["variant"] = variant
        return attrs
