from django.contrib import admin
from django.db.models import Max

from catalog.forms import ProductAdminForm
from catalog.models import Category, Product, ProductImage, SiteSettings


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    fieldsets = (
        (
            None,
            {
                "fields": ("name", "slug", "description"),
                "description": (
                    "Slug is generated from the name as you type. On save, it is "
                    "normalized for URLs and made unique (e.g. my-category-2) if needed."
                ),
            },
        ),
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    form = ProductAdminForm
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "category",
                    "name",
                    "slug",
                    "sku",
                    "description",
                    "price",
                    "compare_at_price",
                    "stock",
                    "is_active",
                    "is_bestseller",
                    "is_customizable",
                    "bulk_threshold",
                    "min_qty",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
        (
            "Bulk image upload",
            {
                "fields": ("gallery_upload",),
                "description": (
                    "Choose multiple files in one go (Ctrl/Cmd+click or Shift+click). "
                    "Images are appended when you save. Use the table below to reorder or remove."
                ),
            },
        ),
    )

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields["sku"].help_text = (
            "If the JFP- prefix is missing, it is added automatically on save "
            "(e.g. BOX-01 becomes JFP-BOX-01)."
        )
        return form

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        uploads = form.cleaned_data.get("gallery_upload") or []
        if not uploads:
            return
        current_max = obj.images.aggregate(m=Max("sort_order"))["m"]
        start = (current_max if current_max is not None else -1) + 1
        for offset, file_obj in enumerate(uploads):
            ProductImage.objects.create(
                product=obj,
                image=file_obj,
                sort_order=start + offset,
            )

    list_display = (
        "name",
        "sku",
        "category",
        "price",
        "compare_at_price",
        "min_qty",
        "stock",
        "is_active",
        "is_bestseller",
    )
    list_filter = ("is_active", "is_customizable", "is_bestseller", "category")
    search_fields = ("name", "sku", "description")
    prepopulated_fields = {"slug": ("name",)}
    inlines = (ProductImageInline,)


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()
