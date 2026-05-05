from django import forms
from django.core.exceptions import ValidationError
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation

from catalog.models import Product, ProductVariant


class MultipleFileInput(forms.FileInput):
    allow_multiple_selected = True

    def __init__(self, attrs=None):
        attrs = {**(attrs or {}), "multiple": "multiple", "accept": "image/*"}
        super().__init__(attrs)


class MultipleFileField(forms.FileField):
    """Accept several uploaded files in one control (admin bulk gallery upload)."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("widget", MultipleFileInput())
        super().__init__(*args, **kwargs)

    def clean(self, data, initial=None):
        if not data:
            if self.required:
                raise ValidationError(self.error_messages["required"])
            return []
        if not isinstance(data, (list, tuple)):
            data = [data]
        return [super(MultipleFileField, self).clean(item, initial) for item in data]


class ProductAdminForm(forms.ModelForm):
    gallery_upload = MultipleFileField(
        required=False,
        help_text=(
            "Select multiple files at once (Ctrl+click or Cmd+click, or Shift+click). "
            "They are added when you save this product."
        ),
    )

    class Meta:
        model = Product
        fields = "__all__"
        widgets = {
            "height_cm": forms.NumberInput(attrs={"step": "0.01", "min": "0"}),
            "width_cm": forms.NumberInput(attrs={"step": "0.01", "min": "0"}),
            "weight_g": forms.NumberInput(attrs={"step": "0.01", "min": "0"}),
        }

    _money_widget = forms.TextInput(
        attrs={
            "class": "vTextField",
            "inputmode": "decimal",
            "autocomplete": "off",
        }
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Use text fields for money — avoids <input type="number"> mouse-wheel / step nudging
        # (e.g. 337.00 drifting to 336.98 while scrolling the page).
        for name in ("price", "compare_at_price", "gst_percentage"):
            if name in self.fields:
                self.fields[name].widget = self._money_widget

    def _parse_inr_amount(self, field_name: str, *, required: bool, label: str):
        raw = (self.data.get(self.add_prefix(field_name)) or "").strip()
        if raw == "":
            if required:
                raise ValidationError(f"{label} is required.")
            return None
        normalized = raw.replace(",", "")
        try:
            return Decimal(normalized).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except (InvalidOperation, ValueError):
            raise ValidationError(f"Enter a valid amount for {label.lower()}.")

    def clean_price(self):
        d = self._parse_inr_amount("price", required=True, label="Price")
        assert d is not None
        if d < 0:
            raise ValidationError("Price cannot be negative.")
        return d

    def clean_compare_at_price(self):
        d = self._parse_inr_amount("compare_at_price", required=False, label="Compare-at price")
        if d is not None and d < 0:
            raise ValidationError("Compare-at price cannot be negative.")
        return d

    def _clean_decimal_2dp(self, field: str):
        v = self.cleaned_data.get(field)
        if v in (None, ""):
            return None
        try:
            d = Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except (InvalidOperation, ValueError):
            raise ValidationError(f"Invalid value for {field.replace('_', ' ')}.")
        if d < 0:
            raise ValidationError(f"{field.replace('_', ' ')} cannot be negative.")
        return d

    def clean_height_cm(self):
        return self._clean_decimal_2dp("height_cm")

    def clean_width_cm(self):
        return self._clean_decimal_2dp("width_cm")

    def clean_weight_g(self):
        return self._clean_decimal_2dp("weight_g")

    def clean_gst_percentage(self):
        raw = (self.data.get(self.add_prefix("gst_percentage")) or "").strip()
        if raw == "":
            raise ValidationError("GST percentage is required.")
        normalized = raw.replace(",", "")
        try:
            d = Decimal(normalized).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except (InvalidOperation, ValueError):
            raise ValidationError("Enter a valid GST percentage.")
        if d < 0 or d > 100:
            raise ValidationError("GST percentage must be between 0 and 100.")
        return d


class ProductVariantAdminForm(forms.ModelForm):
    _money_widget = forms.TextInput(
        attrs={
            "class": "vTextField",
            "inputmode": "decimal",
            "autocomplete": "off",
        }
    )

    class Meta:
        model = ProductVariant
        fields = "__all__"
        widgets = {
            "height_cm": forms.NumberInput(attrs={"step": "0.01", "min": "0"}),
            "width_cm": forms.NumberInput(attrs={"step": "0.01", "min": "0"}),
            "weight_g": forms.NumberInput(attrs={"step": "0.01", "min": "0"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if "price_override" in self.fields:
            self.fields["price_override"].widget = self._money_widget

    def clean_price_override(self):
        raw = (self.data.get(self.add_prefix("price_override")) or "").strip()
        if raw == "":
            return None
        normalized = raw.replace(",", "")
        try:
            d = Decimal(normalized).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except (InvalidOperation, ValueError):
            raise ValidationError("Enter a valid price override amount.")
        if d < 0:
            raise ValidationError("Price override cannot be negative.")
        return d

    def _clean_decimal_2dp(self, field: str):
        v = self.cleaned_data.get(field)
        if v in (None, ""):
            return None
        try:
            d = Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except (InvalidOperation, ValueError):
            raise ValidationError(f"Invalid value for {field.replace('_', ' ')}.")
        if d < 0:
            raise ValidationError(f"{field.replace('_', ' ')} cannot be negative.")
        return d

    def clean_height_cm(self):
        return self._clean_decimal_2dp("height_cm")

    def clean_width_cm(self):
        return self._clean_decimal_2dp("width_cm")

    def clean_weight_g(self):
        return self._clean_decimal_2dp("weight_g")
