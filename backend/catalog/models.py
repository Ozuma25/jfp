from django.db import models
from django.utils import timezone
from django.utils.text import slugify


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
