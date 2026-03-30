from rest_framework import serializers
from coupons.models import Coupon


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = (
            "code",
            "discount_type",
            "discount_value",
            "min_purchase_amount",
            "max_discount_amount",
            "is_valid",
        )


class ApplyCouponSerializer(serializers.Serializer):
    code = serializers.CharField()
