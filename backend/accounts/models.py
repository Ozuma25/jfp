from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    phone = models.CharField(max_length=20, blank=True)
    is_email_verified = models.BooleanField(default=False)
    sms_opt_in = models.BooleanField(default=False)
    whatsapp_opt_in = models.BooleanField(default=False)

    # Business Fields
    is_business = models.BooleanField(default=False)
    company_name = models.CharField(max_length=200, blank=True)
    gst_number = models.CharField(max_length=50, blank=True)
    company_phone = models.CharField(max_length=20, blank=True)
    company_email = models.EmailField(blank=True)
    company_address = models.TextField(blank=True)
    company_city = models.CharField(max_length=100, blank=True)
    company_state = models.CharField(max_length=100, blank=True)
    company_country = models.CharField(max_length=100, blank=True, default="India")
    company_pincode = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"Profile({self.user_id})"


class SavedAddress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="addresses",
    )
    name = models.CharField(max_length=200, help_text="e.g. Home, Office")
    recipient_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Saved addresses"
        ordering = ["-is_default", "-updated_at"]

    def __str__(self):
        return f"{self.name} - {self.recipient_name}"


class SavedPaymentMethod(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payment_methods",
    )
    method_type = models.CharField(max_length=50, default="UPI")
    provider = models.CharField(max_length=50, blank=True, help_text="e.g. Google Pay, PhonePe")
    identifier = models.CharField(max_length=255, help_text="e.g. vpa/upi id or last 4 digits")
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "-updated_at"]

    def __str__(self):
        return f"{self.method_type} - {self.identifier}"
