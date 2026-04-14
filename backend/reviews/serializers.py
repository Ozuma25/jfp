from rest_framework import serializers
from reviews.models import Review


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "product",
            "order",
            "user",
            "reviewer_name",
            "rating",
            "comment",
            "is_verified_purchase",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("user", "is_verified_purchase", "created_at", "updated_at")

    def get_reviewer_name(self, obj) -> str:
        if not obj.user:
            return "Atelier Customer"
        name = obj.user.first_name or obj.user.username.split("@")[0]
        return name.title()

    def validate(self, data):
        """Check if user has already reviewed the product in this specific order."""
        user = self.context["request"].user
        product = data["product"]
        order = data.get("order")
        
        # 1. Duplicate check per Order/Product
        if Review.objects.filter(user=user, product=product, order=order).exists():
            raise serializers.ValidationError("You have already reviewed this piece for this particular order.")
            
        # 2. Verify purchase
        from orders.models import Order
        query = Order.objects.filter(user=user, lines__product=product, status="delivered")
        if order:
            query = query.filter(id=order.id)
            
        if not query.exists():
            raise serializers.ValidationError("Only customers who have received this product can share their story.")
            
        return data

    def create(self, validated_data):
        validated_data["is_verified_purchase"] = True # We already validated this above
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
