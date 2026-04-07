from django import forms
from django.core.exceptions import ValidationError

from catalog.models import Product


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
