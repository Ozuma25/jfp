from django.urls import path
from . import views

app_name = "backoffice"

urlpatterns = [
    path("", views.backoffice_dashboard, name="dashboard"),
    path("products/", views.backoffice_products, name="products"),
    path("products/save/", views.backoffice_product_save, name="product_save"),
    path("products/stock-update/", views.backoffice_stock_update, name="stock_update"),
    path("products/toggle-active/", views.backoffice_toggle_active, name="toggle_active"),
    path("products/bulk-import/", views.backoffice_bulk_import, name="bulk_import"),
    path("orders/", views.backoffice_orders, name="orders"),
    path("orders/<int:order_id>/status/", views.backoffice_update_order_status, name="update_order_status"),
    path("orders/<int:order_id>/invoice/", views.backoffice_order_invoice, name="order_invoice"),
    path("customers/", views.backoffice_customers, name="customers"),
    path("customers/<int:user_id>/toggle-status/", views.backoffice_toggle_customer_status, name="toggle_customer_status"),
    path("coupons/", views.backoffice_coupons, name="coupons"),
    path("coupons/save/", views.backoffice_coupon_save, name="coupon_save"),
]
