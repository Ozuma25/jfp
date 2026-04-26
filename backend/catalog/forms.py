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
            "gst_percentage": forms.NumberInput(
                attrs={"step": "0.01", "min": "0", "max": "100"}
            ),
        }

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
        v = self.cleaned_data.get("gst_percentage")
        if v is None:
            return None
        try:
            d = Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except (InvalidOperation, ValueError):
            raise ValidationError("Enter a valid GST percentage.")
        if d < 0 or d > 100:
            raise ValidationError("GST percentage must be between 0 and 100.")
        return d


class ProductVariantAdminForm(forms.ModelForm):
    class Meta:
        model = ProductVariant
        fields = "__all__"
        widgets = {
            "height_cm": forms.NumberInput(attrs={"step": "0.01", "min": "0"}),
            "width_cm": forms.NumberInput(attrs={"step": "0.01", "min": "0"}),
            "weight_g": forms.NumberInput(attrs={"step": "0.01", "min": "0"}),
        }

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
