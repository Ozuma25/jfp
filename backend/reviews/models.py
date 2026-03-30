from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from catalog.models import Product


class Review(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="reviews"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    is_verified_purchase = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("product", "user")

    def __str__(self):
        return f"{self.user.username} - {self.product.name} ({self.rating})"


@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def update_product_stats(sender, instance, **kwargs):
    """Update Product.rating and Product.review_count when a review is changed."""
    product = instance.product
    stats = Review.objects.filter(product=product, is_active=True).aggregate(
        avg_rating=Avg("rating"), count=models.Count("id")
    )
    product.rating = stats["avg_rating"] or 0.0
    product.review_count = stats["count"] or 0
    product.save(update_fields=["rating", "review_count"])
