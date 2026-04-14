from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action

from reviews.models import Review
from reviews.serializers import ReviewSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.filter(is_active=True)
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        product_id = self.request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def can_review(self, request):
        """Returns True if the user can review the specific product."""
        product_id = self.request.query_params.get("product")
        if not product_id:
            return Response({"can_review": False, "error": "No product provided."})
            
        # Already reviewed?
        if Review.objects.filter(user=request.user, product_id=product_id).exists():
            return Response({"can_review": False, "reason": "Already reviewed."})
            
        # Has delivered order?
        from orders.models import Order
        has_delivered_order = Order.objects.filter(
            user=request.user, 
            lines__product_id=product_id, 
            status="delivered"
        ).exists()
        
        return Response({"can_review": has_delivered_order})

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def my_reviews(self, request):
        reviews = Review.objects.filter(user=request.user)
        serializer = self.get_serializer(reviews, many=True)
        return Response(serializer.data)
