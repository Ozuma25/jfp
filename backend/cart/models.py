from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from catalog.models import Product, ProductVariant
from catalog.utils import gst_inclusive_price


class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="cart_owned",
    )
    session_key = models.CharField(max_length=64, null=True, blank=True, unique=True)
    coupon = models.ForeignKey(
        "coupons.Coupon", 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name="carts"
    )
    updated_at = models.DateTimeField(auto_now=True)
    abandoned_reminder_sent = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(user__isnull=False, session_key__isnull=True)
                    | models.Q(user__isnull=True, session_key__isnull=False)
                ),
                name="cart_user_xor_session",
            ),
        ]

    def clean(self):
        if bool(self.user_id) == bool(self.session_key):
            raise ValidationError("Cart must have either user or session_key, not both or neither.")


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cart_items",
        help_text="Selected color/size variant, if any.",
    )
    quantity = models.PositiveIntegerField(default=1)
    price_at_add = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Effective price (variant or base) at the time the item was added.",
    )
    custom_design_file = models.FileField(
        upload_to="cart_designs/%Y/%m/",
        null=True,
        blank=True,
        help_text="Uploaded JPG, PNG, or PDF for bespoke orders.",
    )

    class Meta:
        pass  # Allow multiple items per product for bespoke designs

    @property
    def effective_price(self):
        """Final customer price: variant/base price plus product GST."""
        if self.variant and self.variant.price_override is not None:
            return gst_inclusive_price(self.variant.price_override, self.product.gst_percentage)
        return gst_inclusive_price(self.product.price, self.product.gst_percentage)
