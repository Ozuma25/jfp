from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.models import CartItem
from cart.serializers import CartItemWriteSerializer, CartSerializer
from cart.utils import cart_with_item_prefetch, get_or_create_cart


def _cart_response(request, cart, *, status_code=status.HTTP_200_OK):
    cart = cart_with_item_prefetch(cart)
    return Response(
        CartSerializer(cart, context={"request": request}).data,
        status=status_code,
    )


class CartDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cart, err = get_or_create_cart(request)
        if err:
            return Response({"detail": err}, status=status.HTTP_401_UNAUTHORIZED)
        return _cart_response(request, cart)


class CartItemListView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        cart, err = get_or_create_cart(request)
        if err:
            return Response({"detail": err}, status=status.HTTP_401_UNAUTHORIZED)

        ser = CartItemWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        product = ser.validated_data["product"]
        qty = ser.validated_data["quantity"]
        design = ser.validated_data.get("custom_design_file")

        if design:
            # Always create a new item for bespoke designs to avoid merging
            item = CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=qty,
                custom_design_file=design
            )
            created = True
        else:
            item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                custom_design_file__isnull=True,
                defaults={"quantity": qty},
            )
            if not created:
                new_qty = item.quantity + qty
                threshold_msg = CartItemWriteSerializer(
                    data={"product_slug": product.slug, "quantity": new_qty}
                )
                threshold_msg.is_valid(raise_exception=True)
                item.quantity = new_qty
                item.save(update_fields=["quantity"])

        cart.abandoned_reminder_sent = False
        cart.save(update_fields=["updated_at", "abandoned_reminder_sent"])
        return _cart_response(
            request,
            cart,
            status_code=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CartItemDetailView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, item_id):
        cart, err = get_or_create_cart(request)
        if err:
            return Response({"detail": err}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            item = CartItem.objects.select_related("product").get(id=item_id, cart=cart)
        except CartItem.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        qty = int(request.data.get("quantity", item.quantity))
        if qty < 1:
            item.delete()
            return _cart_response(request, cart)

        ser = CartItemWriteSerializer(
            data={"product_slug": item.product.slug, "quantity": qty}
        )
        ser.is_valid(raise_exception=True)
        item.quantity = qty
        item.save(update_fields=["quantity"])
        cart.abandoned_reminder_sent = False
        cart.save(update_fields=["updated_at", "abandoned_reminder_sent"])
        return _cart_response(request, cart)

    def delete(self, request, item_id):
        cart, err = get_or_create_cart(request)
        if err:
            return Response({"detail": err}, status=status.HTTP_401_UNAUTHORIZED)
        deleted, _ = CartItem.objects.filter(id=item_id, cart=cart).delete()
        if not deleted:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        cart.abandoned_reminder_sent = False
        cart.save(update_fields=["updated_at", "abandoned_reminder_sent"])
        return _cart_response(request, cart)
