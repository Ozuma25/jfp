from django.urls import path
from coupons.views import ApplyCouponView, RemoveCouponView

urlpatterns = [
    path("apply/", ApplyCouponView.as_view(), name="coupon-apply"),
    path("remove/", RemoveCouponView.as_view(), name="coupon-remove"),
]
