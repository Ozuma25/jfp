from decimal import Decimal, ROUND_HALF_UP

from django.db import models
from django.utils import timezone
from django.utils.text import slugify


def _quantize_money_2dp(value: Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _ensure_unique_slug(
    instance: models.Model,
    *,
    slug_field: str,
    name: str,
    max_length: int,
    model_cls: type[models.Model],
    empty_fallback: str,
) -> None:
    """Set slug from name when empty; slugify; enforce uniqueness with numeric suffix."""
    raw = (getattr(instance, slug_field) or "").strip()
    base_source = raw or name or ""
    base = slugify(base_source)[:max_length] if base_source else ""
    if not base:
        base = empty_fallback[:max_length]

    qs = model_cls.objects.all()
    if instance.pk:
        qs = qs.exclude(pk=instance.pk)

    candidate = base[:max_length]
    n = 2
    while qs.filter(**{slug_field: candidate}).exists():
        suffix = f"-{n}"
        trimmed = base[: max(1, max_length - len(suffix))]
        candidate = f"{trimmed}{suffix}"
        n += 1
    setattr(instance, slug_field, candidate)


class SiteSettings(models.Model):
    """Singleton row — use admin to edit."""

    default_bulk_threshold = models.PositiveIntegerField(
        default=100,
        help_text="Used when Product.bulk_threshold is empty.",
    )

    enable_store_pickup = models.BooleanField(
        default=True,
        help_text="Allow customers to choose direct store pickup at checkout.",
    )
    enable_doorstep_delivery = models.BooleanField(
        default=False,
        help_text="Allow customers to choose doorstep delivery at checkout.",
    )
    enable_custom_courier = models.BooleanField(
        default=False,
        help_text="Allow customers to choose custom courier service at checkout.",
    )

    class Meta:
        verbose_name_plural = "Site settings"

    def __str__(self):
        return "Site settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)


class Category(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True, db_index=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        _ensure_unique_slug(
            self,
            slug_field="slug",
            name=self.name,
            max_length=140,
            model_cls=Category,
            empty_fallback="category",
        )
        super().save(*args, **kwargs)


class Product(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    sku = models.CharField(max_length=64, unique=True, db_index=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    compare_at_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="If set above price, shown as strike-through / sale badge.",
    )
    stock = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    review_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_bestseller = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_customizable = models.BooleanField(
        default=False,
        help_text="Customer may upload design (JPG/PNG/PDF).",
    )
    is_returnable = models.BooleanField(
        default=True,
        help_text="Uncheck for non-returnable items (e.g. perishables, custom prints).",
    )
    bulk_threshold = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Qty above this requires a quote; empty = use site default.",
    )
    min_qty = models.PositiveIntegerField(
        default=1,
        help_text="Minimum order quantity for this item.",
    )
    gst_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=18.00,
        help_text="GST percentage for this product (e.g., 18.00)."
    )
    height_cm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Height in centimeters (optional).",
    )
    width_cm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Width in centimeters (optional).",
    )
    weight_g = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Weight in grams (optional).",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def _normalize_sku(self) -> None:
        raw = (self.sku or "").strip()
        if not raw:
            return
        upper = raw.upper()
        if upper.startswith("JFP-"):
            rest = raw[4:].strip()
            self.sku = (f"JFP-{rest}" if rest else "JFP-")[:64]
            return
        self.sku = f"JFP-{raw}"[:64]

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        touch_price = update_fields is None or "price" in update_fields
        touch_compare = update_fields is None or "compare_at_price" in update_fields
        if touch_price:
            self.price = _quantize_money_2dp(self.price)
        if touch_compare and self.compare_at_price is not None:
            self.compare_at_price = _quantize_money_2dp(self.compare_at_price)
        self._normalize_sku()
        _ensure_unique_slug(
            self,
            slug_field="slug",
            name=self.name,
            max_length=220,
            model_cls=Product,
            empty_fallback="product",
        )
        super().save(*args, **kwargs)


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to="products/%Y/%m/")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.product_id}:{self.sort_order}"


class ProductVariant(models.Model):
    """A color/size/material permutation of a product."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants",
    )
    color = models.CharField(
        max_length=80,
        blank=True,
        help_text="e.g. Red, Royal Blue, Gold",
    )
    size = models.CharField(
        max_length=80,
        blank=True,
        help_text="e.g. Small, Medium, Large, XL or 10x12cm",
    )
    price_override = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Leave blank to use the base product price.",
    )
    stock = models.PositiveIntegerField(default=0)
    sku_suffix = models.CharField(
        max_length=64,
        blank=True,
        help_text="Optional suffix appended to the base SKU (e.g. -RED-L).",
    )
    sort_order = models.PositiveSmallIntegerField(default=0)
    height_cm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: height in centimeters (optional).",
    )
    width_cm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: width in centimeters (optional).",
    )
    weight_g = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: weight in grams (optional).",
    )

    class Meta:
        ordering = ["sort_order", "id"]

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if update_fields is None or "price_override" in update_fields:
            if self.price_override is not None:
                self.price_override = _quantize_money_2dp(self.price_override)
        super().save(*args, **kwargs)

    def __str__(self):
        parts = [p for p in [self.color, self.size] if p]
        return f"{self.product.name} — {' / '.join(parts)}" if parts else f"{self.product.name} variant"

    @property
    def effective_price(self):
        return self.price_override if self.price_override is not None else self.product.price


class ProductVariantImage(models.Model):
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to="variants/%Y/%m/")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"variant:{self.variant_id}:{self.sort_order}"
