from django.contrib import admin

from orders.models import Order, OrderLine, OrderStatusHistory, BulkQuoteRequest
from django.utils.html import format_html


@admin.register(BulkQuoteRequest)
class BulkQuoteRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "email", "phone", "product", "quantity", "is_resolved", "created_at")
    list_filter = ("is_resolved", "created_at")
    search_fields = ("name", "email", "phone", "product__name")
    readonly_fields = ("created_at",)

class OrderLineInline(admin.TabularInline):
    model = OrderLine
    extra = 0
    readonly_fields = ("product", "quantity", "unit_price", "line_total", "design_preview")

    def design_preview(self, obj):
        if obj.custom_design_file:
            return format_html(
                '<a href="{}" target="_blank">🔍 View Full Selection ({} MB)</a>',
                obj.custom_design_file.url,
                round(obj.custom_design_file.size / (1024 * 1024), 2)
            )
        return "Standard Selection"
    design_preview.short_description = "Bespoke Design"


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "user", "status", "total", "currency", "created_at")
    list_filter = ("status", "currency")
    search_fields = ("order_number", "user__email", "shipping_name", "razorpay_order_id")
    inlines = (OrderLineInline, OrderStatusHistoryInline)
    fieldsets = (
        (None, {"fields": ("order_number", "user", "status", "currency", "subtotal", "total")}),
        ("Bespoke Review", {"fields": ("admin_rejection_reason",)}),
        ("Documents", {"fields": ("invoice_pdf", "invoice_emailed")}),
        ("Shipping", {"fields": ("shipping_name", "shipping_phone", "shipping_address_line1", "shipping_address_line2", "shipping_city", "shipping_state", "shipping_postal_code")}),
        ("Payment Details", {"fields": ("razorpay_order_id", "razorpay_payment_id")}),
    )
    readonly_fields = ("order_number",)

    def save_model(self, request, obj, form, change):
        if change:
            old_obj = Order.objects.get(pk=obj.pk)
            if old_obj.status != obj.status:
                note = f"Status updated from {old_obj.get_status_display()} to {obj.get_status_display()}."
                if obj.status == Order.Status.DESIGN_REJECTED:
                    note = f"Artisanal Review: Design requires refinement. Reason: {obj.admin_rejection_reason}"
                elif obj.status == Order.Status.DESIGN_APPROVED_PENDING_PAYMENT:
                    note = "Bespoke design approved. Awaiting payment authorization."
                elif obj.status == Order.Status.PAID:
                    note = "Payment successful. Moving to production queue."
                elif obj.status == Order.Status.SHIPPED:
                    note = "Handcrafted collection has been dispatched. Track your delivery below."
                elif obj.status == Order.Status.DELIVERED:
                    note = "Delivered to destination. We hope you enjoy your boutique selections!"
                
                OrderStatusHistory.objects.create(order=obj, status=obj.status, note=note)
        super().save_model(request, obj, form, change)
