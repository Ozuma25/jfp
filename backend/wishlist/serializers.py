from rest_framework import serializers
from wishlist.models import Wishlist
from catalog.serializers import ProductListSerializer


class WishlistSerializer(serializers.ModelSerializer):
    product_details = ProductListSerializer(source="product", read_only=True)

    class Meta:
        model = Wishlist
        fields = ("id", "user", "product", "product_details", "created_at")
        read_only_fields = ("user", "created_at")

    def validate(self, data):
        user = self.context["request"].user
        product = data["product"]
        if Wishlist.objects.filter(user=user, product=product).exists():
            raise serializers.ValidationError("This product is already in your wishlist.")
        return data

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
