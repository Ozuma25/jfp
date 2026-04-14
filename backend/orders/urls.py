from django.urls import path, include
from rest_framework.routers import DefaultRouter
from orders import views

router = DefaultRouter()
router.register(r"quotes", views.BulkQuoteRequestViewSet, basename="quote")

urlpatterns = [
    path("", include(router.urls)),
    path("checkout/", views.CheckoutView.as_view(), name="checkout"),
    path("payments/razorpay/verify/", views.RazorpayVerifyView.as_view(), name="razorpay-verify"),
    path(
        "payments/razorpay/webhook/",
        views.RazorpayWebhookView.as_view(),
        name="razorpay-webhook",
    ),
    path("orders/", views.OrderListView.as_view(), name="order-list"),
    path("orders/<str:order_number>/", views.OrderDetailView.as_view(), name="order-detail"),
    path("orders/<str:order_number>/pay/", views.OrderPayView.as_view(), name="order-pay"),
    path("orders/<str:order_number>/reupload/", views.OrderReuploadView.as_view(), name="order-reupload"),
    path("orders/<str:order_number>/cancel/", views.OrderCancelView.as_view(), name="order-cancel"),
    path("orders/<str:order_number>/receipt/", views.OrderReceiptDownloadView.as_view(), name="order-receipt"),
]
