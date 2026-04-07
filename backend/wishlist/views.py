from rest_framework import permissions, viewsets, mixins
from rest_framework.response import Response
from rest_framework.decorators import action

from wishlist.models import Wishlist
from wishlist.serializers import WishlistSerializer


class WishlistViewSet(
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)

    @action(detail=False, methods=["delete"], url_path="remove/(?P<product_id>[^/.]+)")
    def remove_by_product(self, request, product_id=None):
        wishlist_item = Wishlist.objects.filter(user=request.user, product_id=product_id).first()
        if not wishlist_item:
            return Response({"error": "Wishlist item not found."}, status=404)
        wishlist_item.delete()
        return Response(status=204)
