from decimal import Decimal

from django.conf import settings
from django.db import models

from catalog.models import Product


class BulkQuoteRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        QUOTED = "quoted", "Quoted"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="quotes")
    quantity = models.PositiveIntegerField()
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    requirements = models.TextField(blank=True, help_text="Specific customization or packaging needs.")
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    quoted_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    admin_notes = models.TextField(blank=True)
    order = models.ForeignKey("Order", on_delete=models.SET_NULL, null=True, blank=True, related_name="bulk_quote")

    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Quote #{self.pk} - {self.name} ({self.product.name} x {self.quantity})"



class Order(models.Model):
    class Status(models.TextChoices):
        UNDER_REVIEW = "under_review", "Under Review (Bespoke Design)"
        DESIGN_APPROVED_PENDING_PAYMENT = "design_approved", "Design Approved, Pending Payment"
        DESIGN_REJECTED = "design_rejected", "Design Rejected"
        PENDING_PAYMENT = "pending_payment", "Pending payment"
        PAID = "paid", "Paid"
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING_PAYMENT,
        db_index=True,
    )
    currency = models.CharField(max_length=3, default="INR")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    coupon = models.ForeignKey(
        "coupons.Coupon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )

    shipping_name = models.CharField(max_length=200)
    shipping_phone = models.CharField(max_length=20)
    shipping_address_line1 = models.CharField(max_length=255)
    shipping_address_line2 = models.CharField(max_length=255, blank=True)
    shipping_city = models.CharField(max_length=100)
    shipping_state = models.CharField(max_length=100)
    shipping_postal_code = models.CharField(max_length=20)

    is_bulk = models.BooleanField(default=False, help_text="True if order was created via Bulk Quote.")
    order_number = models.CharField(
        max_length=50, 
        unique=True, 
        db_index=True, 
        blank=True,
        verbose_name="Order ID",
        help_text="Modern alphanumeric ID (e.g., JFPA-X7K94-ML)"
    )

    tracking_number = models.CharField(max_length=100, blank=True, help_text="Courier AWB or Tracking Number")
    tracking_provider = models.CharField(max_length=100, blank=True, help_text="e.g., Shiprocket, Delhivery, BlueDart")
    tracking_url = models.URLField(max_length=500, blank=True, help_text="Direct link to track the package")


    razorpay_order_id = models.CharField(max_length=255, blank=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True)
    admin_rejection_reason = models.TextField(blank=True, help_text="Reason for design rejection.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.order_number or self.pk} ({self.status})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.order_number:
            from .utils import generate_order_number
            self.order_number = generate_order_number(self)
            self.save(update_fields=['order_number'])


class OrderLine(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="lines")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    custom_design_file = models.FileField(
        upload_to="custom_designs/%Y/%m/",
        null=True,
        blank=True,
        help_text="Uploaded JPG, PNG, or PDF for bespoke orders.",
    )

    def save(self, *args, **kwargs):
        if self.unit_price is not None and self.quantity is not None:
            # unit_price is EXCLUSIVE of GST
            amount = Decimal(self.unit_price) * Decimal(self.quantity)
            self.gst_amount = (amount * Decimal(self.gst_percentage) / Decimal("100")).quantize(Decimal("0.01"))
            self.line_total = (amount + self.gst_amount).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="history")
    status = models.CharField(max_length=32)
    note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
