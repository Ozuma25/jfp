from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Coupon(models.Model):
    class DiscountType(models.TextChoices):
        FIXED = "fixed", "Fixed Amount (INR)"
        PERCENT = "percent", "Percentage (%)"

    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(
        max_length=10, 
        choices=DiscountType.choices, 
        default=DiscountType.FIXED
    )
    discount_value = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Amount or Percentage value."
    )
    min_purchase_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Minimum order subtotal to apply this coupon."
    )
    max_discount_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="For percentage discounts, the maximum amount that can be deducted."
    )
    
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField()
    
    active = models.BooleanField(default=True)
    usage_limit = models.PositiveIntegerField(
        null=True, blank=True, help_text="Total times this can be used."
    )
    used_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-valid_from"]

    def __str__(self):
        return f"{self.code} ({self.get_discount_type_display()})"

    @property
    def is_valid(self):
        now = timezone.now()
        if not self.active:
            return False
        if not (self.valid_from <= now <= self.valid_to):
            return False
        if self.usage_limit and self.used_count >= self.usage_limit:
            return False
        return True

    def calculate_discount(self, subtotal):
        from decimal import Decimal
        subtotal = Decimal(str(subtotal))
        if not self.is_valid:
            return Decimal("0.00")
        if subtotal < self.min_purchase_amount:
            return Decimal("0.00")
            
        if self.discount_type == self.DiscountType.FIXED:
            discount = self.discount_value
        else:
            discount = (subtotal * self.discount_value / Decimal("100"))
            if self.max_discount_amount:
                discount = min(discount, self.max_discount_amount)
                
        return min(discount, subtotal).quantize(Decimal("0.01"))
