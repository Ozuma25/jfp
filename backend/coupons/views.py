from rest_framework import permissions, status, views
from rest_framework.response import Response

from cart.models import Cart
from coupons.models import Coupon
from coupons.serializers import ApplyCouponSerializer, CouponSerializer


class ApplyCouponView(views.APIView):
    """
    Apply a coupon to the current user's (or session's) cart.
    Accepts: { "code": "SAVE20" }
    """
    def post(self, request):
        serializer = ApplyCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["code"]
        
        try:
            coupon = Coupon.objects.get(code__iexact=code)
        except Coupon.DoesNotExist:
            return Response({"error": "Invalid coupon code."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not coupon.is_valid:
            return Response({"error": "This coupon has expired or reached its usage limit."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Get the cart (either by user or session)
        cart = None
        if request.user.is_authenticated:
            cart = Cart.objects.filter(user=request.user).first()
        else:
            session_key = request.headers.get("X-Session-Key")
            if session_key:
                cart = Cart.objects.filter(session_key=session_key).first()
                
        if not cart:
            return Response({"error": "No active cart found."}, status=status.HTTP_404_NOT_FOUND)
            
        # Calculate potential discount to check min_purchase_amount
        # Note: We don't recalculate everything yet, just check the coupon itself.
        # The actual final calculation will happen in order creation.
        
        cart.coupon = coupon
        cart.save()
        
        return Response({
            "success": f"Coupon '{code}' applied to your cart.",
            "coupon": CouponSerializer(coupon).data
        })


class RemoveCouponView(views.APIView):
    """Remove coupon from cart."""
    def post(self, request):
        cart = None
        if request.user.is_authenticated:
            cart = Cart.objects.filter(user=request.user).first()
        else:
            session_key = request.headers.get("X-Session-Key")
            if session_key:
                cart = Cart.objects.filter(session_key=session_key).first()
                
        if cart:
            cart.coupon = None
            cart.save()
            
        return Response({"success": "Coupon removed."})
