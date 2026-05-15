from django.contrib import admin
from django.contrib import messages
from django.db.models.deletion import ProtectedError
from django.db.models import Max

from catalog.forms import ProductAdminForm, ProductVariantAdminForm
from catalog.models import Category, Product, ProductImage, ProductVariant, ProductVariantImage, SiteSettings


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


class ProductVariantImageInline(admin.TabularInline):
    model = ProductVariantImage
    extra = 1


class ProductVariantInline(admin.StackedInline):
    model = ProductVariant
    form = ProductVariantAdminForm
    extra = 0
    show_change_link = True  # click through to upload variant images
    fields = (
        "color",
        "size",
        "price_override",
        "stock",
        "sku_suffix",
        "height_cm",
        "width_cm",
        "weight_g",
        "sort_order",
    )
    readonly_fields = ()
    verbose_name = "Variant (Color / Size)"
    verbose_name_plural = "Variants — add one row per Color/Size combination"

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        po = formset.form.base_fields.get("price_override")
        if po:
            po.help_text = (
                "Leave blank to use the base product price above. "
                "Set only if this color/size costs differently. GST is added for the storefront display."
            )
        return formset


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
                    "gst_percentage",
                    "stock",
                    "height_cm",
                    "width_cm",
                    "weight_g",
                    "is_active",
                    "is_bestseller",
                    "is_customizable",
                    "is_returnable",
                    "bulk_threshold",
                    "min_qty",
                    "created_at",
                    "updated_at",
                ),
                "description": (
                    "<strong>Price</strong>: Set the base selling price before GST. "
                    "If this product has NO variants (no colors/sizes), GST is added to this price for customers. "
                    "If it HAS variants (added below), this is the <em>fallback</em> price — "
                    "each variant can optionally override it before GST. "
                    "<br><br>"
                    "<strong>Stock</strong>: For products WITH variants, set stock on each variant below instead. "
                    "This base stock is only used for products with no variants."
                    "<br><br>"
                    "<strong>GST %</strong>: Tax rate added to the product price for storefront MRP (e.g. 5, 12, 18). "
                    "Default when creating a new product is 18% - change per item as needed."
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
        if "gst_percentage" in form.base_fields:
            form.base_fields["gst_percentage"].help_text = (
                "GST rate added to this product's admin price for customer-facing MRP (0-100)."
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
        "gst_percentage",
        "min_qty",
        "stock",
        "height_cm",
        "width_cm",
        "weight_g",
        "is_active",
        "is_bestseller",
    )
    list_filter = ("is_active", "is_customizable", "is_bestseller", "category")
    search_fields = ("name", "sku", "description")
    prepopulated_fields = {"slug": ("name",)}
    inlines = (ProductImageInline, ProductVariantInline)

    def get_deleted_objects(self, objs, request):
        deleted_objects, model_count, perms_needed, protected = super().get_deleted_objects(
            objs, request
        )
        # Let delete flow continue for protected order references; we archive on delete.
        if protected:
            protected = []
            deleted_objects = list(deleted_objects) + [
                "Referenced order lines will be kept and linked products will be archived."
            ]
        return deleted_objects, model_count, perms_needed, protected

    def delete_model(self, request, obj):
        try:
            super().delete_model(request, obj)
        except ProtectedError:
            # Keep historical order lines intact; archive the product instead.
            obj.is_active = False
            obj.save(update_fields=["is_active"])
            self.message_user(
                request,
                (
                    f"'{obj.name}' is used in existing orders, so it was archived "
                    "instead of being permanently deleted."
                ),
                level=messages.WARNING,
            )

    def delete_queryset(self, request, queryset):
        protected_count = 0
        deleted_count = 0
        for product in queryset:
            try:
                product.delete()
                deleted_count += 1
            except ProtectedError:
                product.is_active = False
                product.save(update_fields=["is_active"])
                protected_count += 1

        if deleted_count:
            self.message_user(
                request,
                f"Permanently deleted {deleted_count} product(s).",
                level=messages.SUCCESS,
            )
        if protected_count:
            self.message_user(
                request,
                (
                    f"Archived {protected_count} product(s) because they are "
                    "referenced by existing orders."
                ),
                level=messages.WARNING,
            )


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    """Separate admin for editing a variant and uploading its images."""
    form = ProductVariantAdminForm
    inlines = [ProductVariantImageInline]
    list_display = ("product", "color", "size", "stock", "price_override", "height_cm", "width_cm", "weight_g")
    list_filter = ("product__category", "color")
    search_fields = ("product__name", "color", "size")
    fields = (
        "product",
        "color",
        "size",
        "price_override",
        "stock",
        "sku_suffix",
        "height_cm",
        "width_cm",
        "weight_g",
        "sort_order",
    )
    autocomplete_fields = ["product"]


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    fields = (
        "default_bulk_threshold",
        "enable_store_pickup",
        "enable_doorstep_delivery",
        "enable_custom_courier",
    )

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()
