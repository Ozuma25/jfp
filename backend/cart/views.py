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
        
        # Self-healing: merge duplicate line items if they exist
        # (same product, both with no custom design file)
        from collections import defaultdict
        from django.db.models import Q
        
        # We consider a "standard" (non-bespoke) item as one with no name in the file field
        items = list(cart.items.filter(Q(custom_design_file=None) | Q(custom_design_file='')).select_related("product"))
        if len(items) > 1:
            product_map = defaultdict(list)
            for item in items:
                product_map[item.product_id].append(item)
            
            needs_save = False
            for product_id, dupes in product_map.items():
                if len(dupes) > 1:
                    primary = dupes[0]
                    total_qty = sum(d.quantity for d in dupes)
                    primary.quantity = total_qty
                    primary.save(update_fields=["quantity"])
                    # Delete the others
                    for d in dupes[1:]:
                        d.delete()
                    needs_save = True
            
            if needs_save:
                cart.save(update_fields=["updated_at"])
                
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
        variant = ser.validated_data.get("variant")   # may be None
        qty     = ser.validated_data["quantity"]
        design  = ser.validated_data.get("custom_design_file")

        # Effective price: variant override if set, else base product price
        effective_price = (
            variant.price_override
            if variant and variant.price_override is not None
            else product.price
        )

        if design:
            # Always create a new line for bespoke designs
            CartItem.objects.create(
                cart=cart,
                product=product,
                variant=variant,
                quantity=qty,
                price_at_add=effective_price,
                custom_design_file=design,
            )
            created = True
        else:
            from django.db.models import Q
            # Match same product + same variant (None variant = no variant)
            item = CartItem.objects.filter(
                Q(custom_design_file=None) | Q(custom_design_file=''),
                cart=cart,
                product=product,
                variant=variant,
            ).first()

            if item:
                new_qty = item.quantity + qty
                # Re-validate the new total quantity
                ser_check = CartItemWriteSerializer(
                    data={"product_slug": product.slug, "quantity": new_qty,
                          "variant_id": variant.id if variant else None}
                )
                ser_check.is_valid(raise_exception=True)
                item.quantity = new_qty
                item.save(update_fields=["quantity"])
                created = False
            else:
                CartItem.objects.create(
                    cart=cart,
                    product=product,
                    variant=variant,
                    quantity=qty,
                    price_at_add=effective_price,
                )
                created = True

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
