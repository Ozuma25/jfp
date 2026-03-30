from rest_framework import serializers
from reviews.models import Review


class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source="user.username")

    class Meta:
        model = Review
        fields = (
            "id",
            "product",
            "user",
            "username",
            "rating",
            "comment",
            "is_verified_purchase",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("user", "is_verified_purchase", "created_at", "updated_at")

    def validate(self, data):
        """Check if user has already reviewed the product and if they contextually own it."""
        user = self.context["request"].user
        product = data["product"]
        
        # 1. Check for duplicate reviews
        if Review.objects.filter(user=user, product=product).exists():
            raise serializers.ValidationError("You have already reviewed this product.")
            
        # 2. Strict policy: Only verified buyers who received the order can review
        from orders.models import Order
        has_delivered_order = Order.objects.filter(
            user=user, 
            lines__product=product, 
            status="delivered"
        ).exists()
        
        if not has_delivered_order:
            raise serializers.ValidationError("Only customers who have received this product can share a review.")
            
        return data

    def create(self, validated_data):
        validated_data["is_verified_purchase"] = True # We already validated this above
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
