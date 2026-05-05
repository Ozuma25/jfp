import json
import os
from decimal import Decimal

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
import logging
from django.http import FileResponse
from orders.receipt_utils import generate_order_receipt_pdf
from rest_framework import generics, serializers, status
from rest_framework.renderers import StaticHTMLRenderer
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product

from accounts.models import SavedAddress
from cart.models import Cart, CartItem
from cart.serializers import CartItemWriteSerializer
from orders.models import Order, OrderLine, OrderStatusHistory, BulkQuoteRequest
from orders.serializers import (
    BulkQuoteRequestSerializer,
    CheckoutSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    RazorpayVerifySerializer,
)
from orders.services import (
    create_razorpay_order,
    get_razorpay_client,
    verify_payment_signature,
    verify_webhook_signature,
)


def append_history(order: Order, status_val: str, note: str = "") -> None:
    OrderStatusHistory.objects.create(order=order, status=status_val, note=note)


class ShippingInfoView(APIView):
    """Public storefront: doorstep fee and default store-pickup address snapshot."""

    permission_classes = [AllowAny]

    def get(self, request):
        from catalog.models import SiteSettings
        row = SiteSettings.objects.first()
        pickup = getattr(settings, "STORE_PICKUP_ADDRESS", {}) or {}
        fee = getattr(settings, "DOORSTEP_SHIPPING_INR", Decimal("0"))
        fee = Decimal(fee).quantize(Decimal("0.01"))
        map_url = getattr(settings, "STORE_PICKUP_MAP_URL", "") or ""
        return Response(
            {
                "doorstep_fee_inr": str(fee),
                "shipping_methods": {
                    "store_pickup": bool(getattr(row, "enable_store_pickup", True)) if row else True,
                    "doorstep": bool(getattr(row, "enable_doorstep_delivery", False)) if row else False,
                    "custom_courier": bool(getattr(row, "enable_custom_courier", False)) if row else False,
                },
                "store_pickup": {
                    "line1": pickup.get("line1", ""),
                    "line2": pickup.get("line2", ""),
                    "city": pickup.get("city", ""),
                    "state": pickup.get("state", ""),
                    "postal_code": pickup.get("postal_code", ""),
                },
                "store_pickup_map_url": map_url,
            }
        )


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # ── Email verification gate ───────────────────────────────────────────
        profile = getattr(request.user, "profile", None)
        if not profile or not profile.is_email_verified:
            return Response(
                {"detail": "Please verify your email address before placing an order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        cart = Cart.objects.filter(user=request.user).first()
        if not cart:
            return Response({"detail": "Cart is empty."}, status=status.HTTP_400_BAD_REQUEST)
        items = list(cart.items.select_related("product").all())
        if not items:
            return Response({"detail": "Cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

        for item in items:
            ser = CartItemWriteSerializer(
                data={"product_slug": item.product.slug, "quantity": item.quantity}
            )
            ser.is_valid(raise_exception=True)

        cs = CheckoutSerializer(data=request.data)
        cs.is_valid(raise_exception=True)
        validated = dict(cs.validated_data)
        is_business_order = bool(validated.pop("is_business_order", False))
        shipping_method = validated.pop("shipping_method", Order.ShippingMethod.DOORSTEP)
        ship = validated

        # Gate shipping methods via SiteSettings toggles (admin-controlled)
        from catalog.models import SiteSettings
        row = SiteSettings.objects.first()
        enabled = {
            Order.ShippingMethod.STORE_PICKUP: bool(getattr(row, "enable_store_pickup", True)) if row else True,
            Order.ShippingMethod.DOORSTEP: bool(getattr(row, "enable_doorstep_delivery", False)) if row else False,
            Order.ShippingMethod.CUSTOM_COURIER: bool(getattr(row, "enable_custom_courier", False)) if row else False,
        }
        if not enabled.get(shipping_method, False):
            return Response(
                {"detail": "This shipping method is currently unavailable."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subtotal = Decimal("0")
        for item in items:
            subtotal += item.product.price * Decimal(item.quantity)
        subtotal = subtotal.quantize(Decimal("0.01"))

        # --- Coupon & Tax Calculation ---
        discount_amount = Decimal("0.00")
        coupon = cart.coupon
        if coupon:
            if coupon.is_valid and subtotal >= coupon.min_purchase_amount:
                discount_amount = coupon.calculate_discount(subtotal)
            else:
                coupon = None
        
        # We must calculate GST line-by-line using taxable value (post-proportional discount)
        total_gst = Decimal("0.00")
        line_data = []
        for item in items:
            ratio = (Decimal(item.product.price) * Decimal(item.quantity)) / subtotal if subtotal > 0 else Decimal(0)
            line_disc = (discount_amount * ratio).quantize(Decimal("0.01"))
            line_subtotal = (Decimal(item.product.price) * Decimal(item.quantity)).quantize(Decimal("0.01"))
            taxable_value = line_subtotal - line_disc
            
            rate = getattr(item.product, "gst_percentage", Decimal("18.00"))
            pst_gst = (taxable_value * rate / Decimal("100")).quantize(Decimal("0.01"))
            total_gst += pst_gst
            
            line_data.append({
                "product": item.product,
                "quantity": item.quantity,
                "unit_price": item.product.price,
                "gst_percentage": rate,
                "gst_amount": pst_gst,
                "line_total": taxable_value + pst_gst,
                "custom_design_file": item.custom_design_file,
            })

        if shipping_method == Order.ShippingMethod.DOORSTEP:
            shipping_cost = getattr(settings, "DOORSTEP_SHIPPING_INR", Decimal("0"))
        else:
            shipping_cost = Decimal("0")
        shipping_cost = Decimal(shipping_cost).quantize(Decimal("0.01"))
        order_total = max(subtotal - discount_amount + total_gst + shipping_cost, Decimal("0.01"))
        cgst = (total_gst / Decimal("2")).quantize(Decimal("0.01"))
        sgst = total_gst - cgst

        is_bespoke = any(item.custom_design_file for item in items)
        status_val = (
            Order.Status.UNDER_REVIEW if is_bespoke else Order.Status.PENDING_PAYMENT
        )
        skip = os.environ.get("RAZORPAY_SKIP", "0") == "1" and settings.DEBUG

        try:
            with transaction.atomic():
                profile = getattr(request.user, "profile", None)
                allow_business = bool(profile and getattr(profile, "is_business", False) and getattr(profile, "gst_number", "").strip())
                is_business_order = bool(is_business_order and allow_business)
                billing_company_name = (getattr(profile, "company_name", "") or "").strip() if is_business_order else ""
                billing_gst_number = (getattr(profile, "gst_number", "") or "").strip() if is_business_order else ""

                order = Order.objects.create(
                    user=request.user,
                    subtotal=subtotal,
                    discount_amount=discount_amount,
                    gst_amount=total_gst,
                    cgst_amount=cgst,
                    sgst_amount=sgst,
                    shipping_cost=shipping_cost,
                    shipping_method=shipping_method,
                    total=order_total,
                    coupon=coupon,
                    status=status_val,
                    is_business_order=is_business_order,
                    billing_company_name=billing_company_name,
                    billing_gst_number=billing_gst_number,
                    **ship,
                )
                if coupon:
                    coupon.used_count += 1
                    coupon.save(update_fields=["used_count"])
                
                for ld in line_data:
                    # --- Stock Reservation Logic ---
                    # Using select_for_update to prevent race conditions during the transaction
                    from catalog.models import Product
                    product = Product.objects.select_for_update().get(pk=ld["product"].pk)
                    
                    if product.stock < ld["quantity"]:
                        raise serializers.ValidationError({
                            "detail": f"Insufficient stock for {product.name}. Only {product.stock} left.",
                            "code": "out_of_stock",
                            "available_stock": product.stock,
                            "product_id": product.id,
                        })
                    
                    product.stock -= ld["quantity"]
                    product.save(update_fields=["stock"])

                    OrderLine.objects.create(
                        order=order,
                        product=product,
                        quantity=ld["quantity"],
                        unit_price=ld["unit_price"],
                        gst_percentage=ld["gst_percentage"],
                        gst_amount=ld["gst_amount"],
                        line_total=ld["line_total"],
                        custom_design_file=ld["custom_design_file"],
                    )
                
                initial_note = "Order created for bespoke design review" if is_bespoke else "Order created awaiting payment"
                append_history(order, status_val, initial_note)
                
                # Clear cart items (but not the cart itself yet, so we can access it again if needed)
                # Optimization: Delete all items linked to this cart
                cart.items.all().delete()
                # Clear the coupon from the cart after order is confirmed
                cart.coupon = None
                cart.save(update_fields=["coupon"])

                # Auto-save address if it does not precisely exist
                is_first_address = not SavedAddress.objects.filter(user=request.user).exists()
                address_exists = SavedAddress.objects.filter(
                    user=request.user,
                    address_line1__iexact=ship.get("shipping_address_line1", ""),
                    postal_code__iexact=ship.get("shipping_postal_code", "")
                ).exists()

                # Don't duplicate the user's company address in SavedAddress; it already lives on the profile
                is_company_shipping = False
                try:
                    if getattr(request.user, "profile", None) and getattr(request.user.profile, "is_business", False):
                        ca = (getattr(request.user.profile, "company_address", "") or "").strip()
                        cp = (getattr(request.user.profile, "company_pincode", "") or "").strip()
                        sa = (ship.get("shipping_address_line1", "") or "").strip()
                        sp = (ship.get("shipping_postal_code", "") or "").strip()
                        if ca and sa and ca.lower() == sa.lower() and (not cp or (cp and cp.lower() == sp.lower())):
                            is_company_shipping = True
                except Exception:
                    is_company_shipping = False

                # Never save the store pickup address as a user address
                is_store_pickup = str(shipping_method) == "store_pickup"
                is_store_pickup_address = False
                try:
                    store = getattr(settings, "STORE_PICKUP_ADDRESS", {}) or {}
                    store_line1 = (store.get("line1", "") or "").strip().lower()
                    store_pc = (store.get("postal_code", "") or "").strip().lower()
                    ship_line1 = (ship.get("shipping_address_line1", "") or "").strip().lower()
                    ship_pc = (ship.get("shipping_postal_code", "") or "").strip().lower()
                    if store_line1 and ship_line1 and ship_line1 == store_line1:
                        if not store_pc or (store_pc and ship_pc and ship_pc == store_pc):
                            is_store_pickup_address = True
                except Exception:
                    is_store_pickup_address = False

                if not address_exists and not is_company_shipping and not is_store_pickup and not is_store_pickup_address:
                    SavedAddress.objects.create(
                        user=request.user,
                        name="Recent Checkout",
                        recipient_name=ship.get("shipping_name", ""),
                        phone=ship.get("shipping_phone", ""),
                        address_line1=ship.get("shipping_address_line1", ""),
                        address_line2=ship.get("shipping_address_line2", ""),
                        city=ship.get("shipping_city", ""),
                        state=ship.get("shipping_state", ""),
                        postal_code=ship.get("shipping_postal_code", ""),
                        is_default=is_first_address
                    )

                if is_bespoke:
                    # ── Notify admin of incoming bespoke design order (Async) ──────────
                    admin_email = getattr(settings, "ADMINS_EMAIL", None) or getattr(settings, "DEFAULT_FROM_EMAIL", "")
                    if admin_email:
                        lines_summary = "\n".join(
                            f"  – {item.product.name} × {item.quantity} (₹{item.product.price})"
                            for item in items if item.custom_design_file
                        )
                        admin_subject = f"[JFP] Bespoke Order #{order.id} — Design Review Required"
                        admin_message = (
                            f"A new BESPOKE order requires your review.\n\n"
                            f"Order ID     : #{order.id}\n"
                            f"Customer     : {request.user.get_full_name() or request.user.email}\n"
                            f"Email        : {request.user.email}\n"
                            f"Order Total  : ₹{order.total}\n\n"
                            f"Items with Custom Design:\n{lines_summary}\n\n"
                            f"Shipping To  : {ship.get('shipping_name', '')}, "
                            f"{ship.get('shipping_city', '')}, {ship.get('shipping_state', '')} – "
                            f"{ship.get('shipping_postal_code', '')}\n\n"
                            f"Review & Approve: {settings.BACKEND_URL}/admin/orders/order/{order.id}/change/\n"
                        )
                        from notifications.tasks import send_email_sync
                        send_email_sync(admin_subject, admin_message, [admin_email])

                    return Response(
                        {
                            "order_id": order.id,
                            "order_number": order.order_number,
                            "is_bespoke": True,
                            "detail": "Boutique design submitted for elite review. We will notify you once approved for payment.",
                        },
                        status=status.HTTP_201_CREATED
                    )

                if skip:
                    order.status = Order.Status.PAID
                    order.save(update_fields=["status"])
                    append_history(order, Order.Status.PAID, "Mock payment (RAZORPAY_SKIP)")
                    CartItem.objects.filter(cart=cart).delete()
                    return Response(
                        {
                            "order_id": order.id,
                            "order_number": order.order_number,
                            "mock_payment": True,
                            "detail": "RAZORPAY_SKIP: order marked paid for local development.",
                        }
                    )

                rp_order = create_razorpay_order(order)
                if rp_order is None:
                    raise RuntimeError("razorpay_not_configured")

                order.razorpay_order_id = rp_order["id"]
                order.save(update_fields=["razorpay_order_id"])
        except Exception as e:
            if str(e) == "razorpay_not_configured":
                return Response(
                    {
                        "detail": (
                            "Razorpay is not configured. Set RAZORPAY_KEY_ID and "
                            "RAZORPAY_KEY_SECRET in .env, or set RAZORPAY_SKIP=1 with DEBUG=1 "
                            "for local testing."
                        )
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            raise e

        _, key_id, _ = get_razorpay_client()
        order = Order.objects.get(pk=order.pk)
        return Response(
            {
                "order_id": order.id,
                "order_number": order.order_number,
                "razorpay_order_id": order.razorpay_order_id,
                "amount": rp_order["amount"],
                "currency": order.currency,
                "key_id": key_id,
            },
            status=status.HTTP_201_CREATED,
        )


class RazorpayVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = RazorpayVerifySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        with transaction.atomic():
            order = (
                Order.objects.select_for_update()
                .filter(
                    id=d["order_id"],
                    user=request.user,
                    status__in=[Order.Status.PENDING_PAYMENT, Order.Status.DESIGN_APPROVED_PENDING_PAYMENT],
                )
                .first()
            )
            if order is None:
                return Response(
                    {"detail": "Order not found or not awaiting payment."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if order.razorpay_order_id != d["razorpay_order_id"]:
                return Response(
                    {"detail": "Razorpay order id mismatch."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not verify_payment_signature(
                order, d["razorpay_payment_id"], d["razorpay_signature"]
            ):
                return Response(
                    {"detail": "Invalid payment signature."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            order.status = Order.Status.PAID
            order.razorpay_payment_id = d["razorpay_payment_id"]
            order.save(update_fields=["status", "razorpay_payment_id"])
            append_history(order, Order.Status.PAID, "Payment verified")

        CartItem.objects.filter(cart__user=request.user).delete()
        order.refresh_from_db()
        return Response(OrderDetailSerializer(order).data)


class RazorpayWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        body = request.body
        sig = request.headers.get("X-Razorpay-Signature", "")
        if not verify_webhook_signature(body, sig):
            return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(body.decode())
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response({"detail": "Invalid JSON."}, status=status.HTTP_400_BAD_REQUEST)

        event = payload.get("event") or ""
        entity = payload.get("payload", {}).get("payment", {}).get("entity") or {}
        razorpay_order_id = entity.get("order_id")
        payment_id = entity.get("id")

        if event == "payment.captured" and razorpay_order_id and payment_id:
            with transaction.atomic():
                order = (
                    Order.objects.select_for_update()
                    .filter(
                        razorpay_order_id=razorpay_order_id,
                        status__in=[Order.Status.PENDING_PAYMENT, Order.Status.DESIGN_APPROVED_PENDING_PAYMENT],
                    )
                    .first()
                )
                if order:
                    order.status = Order.Status.PAID
                    order.razorpay_payment_id = payment_id
                    order.save(update_fields=["status", "razorpay_payment_id"])
                    append_history(order, Order.Status.PAID, "Webhook payment.captured")

        return Response({"ok": True})


class OrderCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_number):
        from django.db.models import Q
        order = Order.objects.filter(Q(order_number=order_number) | Q(id=order_number if str(order_number).isdigit() else 0), user=request.user).first()
        if not order:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            # Re-check status inside atomic block
            if order.status in [
                Order.Status.PAID,
                Order.Status.READY_FOR_PICKUP,
                Order.Status.SHIPPED,
                Order.Status.DELIVERED,
                Order.Status.CANCELLED,
            ]:
                return Response({"detail": "Cannot cancel this order."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Return stock
            for line in order.lines.all():
                p = Product.objects.select_for_update().get(pk=line.product_id)
                p.stock += line.quantity
                p.save(update_fields=["stock"])

            order.status = Order.Status.CANCELLED
            order.save(update_fields=["status"])
            append_history(order, Order.Status.CANCELLED, "User cancelled order. Stock restored.")
        return Response({"detail": "Order cancelled."})


class OrderPayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_number):
        from django.db.models import Q
        order = Order.objects.filter(Q(order_number=order_number) | Q(id=order_number if str(order_number).isdigit() else 0), user=request.user, status__in=[Order.Status.DESIGN_APPROVED_PENDING_PAYMENT, Order.Status.PENDING_PAYMENT]).first()
        if not order:
            return Response({"detail": "Order not ready for payment."}, status=status.HTTP_400_BAD_REQUEST)
        
        skip = os.environ.get("RAZORPAY_SKIP", "0") == "1" and settings.DEBUG
        if skip:
            order.status = Order.Status.PAID
            order.save(update_fields=["status"])
            append_history(order, Order.Status.PAID, "Mock payment (RAZORPAY_SKIP)")
            return Response({"mock_payment": True})

        try:
            rp_order = create_razorpay_order(order)
            if rp_order is None:
                raise RuntimeError("razorpay_not_configured")
            order.razorpay_order_id = rp_order["id"]
            order.save(update_fields=["razorpay_order_id"])
        except Exception as e:
            print(f"Razorpay Error: {e}")
            return Response({"detail": f"Payment gateway error: {e}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        _, key_id, _ = get_razorpay_client()
        return Response({
            "order_id": order.id,
            "order_number": order.order_number,
            "razorpay_order_id": order.razorpay_order_id,
            "amount": rp_order["amount"],
            "currency": order.currency,
            "key_id": key_id,
        })


class OrderReuploadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, order_number):
        from django.db.models import Q
        order = Order.objects.filter(Q(order_number=order_number) | Q(id=order_number if str(order_number).isdigit() else 0), user=request.user, status=Order.Status.DESIGN_REJECTED).prefetch_related("lines").first()
        if not order:
            return Response({"detail": "Order not eligible for reupload."}, status=status.HTTP_400_BAD_REQUEST)
        
        design_file = request.FILES.get("custom_design_file")
        if not design_file:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            for line in order.lines.all():
                if line.custom_design_file:
                    line.custom_design_file = design_file
                    line.save(update_fields=["custom_design_file"])
            
            order.status = Order.Status.UNDER_REVIEW
            order.admin_rejection_reason = ""
            order.save(update_fields=["status", "admin_rejection_reason"])
            append_history(order, Order.Status.UNDER_REVIEW, "User uploaded new design.")
        
        return Response({"detail": "Design reuploaded successfully."})


class OrderListView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related("lines__product", "history")
        )

    def get_object(self):
        queryset = self.get_queryset()
        lookup_val = self.kwargs.get("order_number")
        # Try professional ID first, fallback to primary key for retro-compatibility
        obj = queryset.filter(order_number=lookup_val).first()
        if not obj and str(lookup_val).isdigit():
            obj = queryset.filter(id=lookup_val).first()
            
        if not obj:
            from rest_framework.exceptions import NotFound
            raise NotFound("No Order matches the given query.")
            
        self.check_object_permissions(self.request, obj)
        return obj

from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated

class BulkQuoteRequestViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    serializer_class = BulkQuoteRequestSerializer

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return BulkQuoteRequest.objects.filter(email=self.request.user.email).select_related("product")
        return BulkQuoteRequest.objects.none()

    def perform_create(self, serializer):
        quote = serializer.save()
        # --- Notify admin of new bulk quote inquiry (Async) ---
        admin_email = getattr(settings, "ADMINS_EMAIL", None) or getattr(settings, "DEFAULT_FROM_EMAIL", "")
        if admin_email:
            admin_subject = f"[JFP] New Bulk Inquiry #{quote.id} — Action Required"
            admin_message = (
                f"A new HIGH-VOLUME inquiry has arrived.\n\n"
                f"Quote ID     : #{quote.id}\n"
                f"Client       : {quote.name} ({quote.email})\n"
                f"Product      : {quote.product.name}\n"
                f"Quantity     : {quote.quantity}\n"
                f"Requirements : {quote.requirements}\n\n"
                f"Set Price & Reply: {settings.BACKEND_URL}/admin/orders/bulkquoterequest/{quote.id}/change/\n"
            )
            from notifications.tasks import send_email_sync
            send_email_sync(admin_subject, admin_message, [admin_email])

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def accept(self, request, pk=None):
        # ── Email verification gate ───────────────────────────────────────────
        profile = getattr(request.user, "profile", None)
        if not profile or not profile.is_email_verified:
            return Response(
                {"detail": "Please verify your email address before approving a quote."},
                status=status.HTTP_403_FORBIDDEN,
            )

        quote = self.get_object()
        if quote.status != BulkQuoteRequest.Status.QUOTED:
            return Response({"detail": "This boutique quote is not yet priced for acceptance."}, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            from catalog.models import Product
            from accounts.models import SavedAddress
            product = Product.objects.select_for_update().get(pk=quote.product_id)
            if product.stock < quote.quantity:
                 return Response({"detail": f"This boutique piece is currently low on stock ({product.stock} available). Please request a fresh quote or reduce quantity."}, status=status.HTTP_400_BAD_REQUEST)
            
            product.stock -= quote.quantity
            product.save(update_fields=["stock"])

            subtotal = (Decimal(quote.quantity) * quote.quoted_price_per_unit).quantize(Decimal("0.01"))
            gst_pct = Decimal(str(product.gst_percentage or 18))
            total_gst = (subtotal * gst_pct / Decimal("100")).quantize(Decimal("0.01"))
            cgst = (total_gst / Decimal("2")).quantize(Decimal("0.01"))
            sgst = (total_gst - cgst)
            shipping_method = Order.ShippingMethod.DOORSTEP
            shipping_cost = Decimal(getattr(settings, "DOORSTEP_SHIPPING_INR", Decimal("0"))).quantize(Decimal("0.01"))
            lines_total = (subtotal + total_gst).quantize(Decimal("0.01"))
            order_total = (lines_total + shipping_cost).quantize(Decimal("0.01"))

            addr = SavedAddress.objects.filter(user=request.user, is_default=True).first() or \
                   SavedAddress.objects.filter(user=request.user).first()
            
            ship_name = addr.recipient_name if addr else quote.name
            ship_phone = addr.phone if addr else quote.phone
            ship_l1 = addr.address_line1 if addr else "Update Required"
            ship_city = addr.city if addr else "Update Required"
            ship_state = addr.state if addr else "Update Required"
            ship_pin = addr.postal_code if addr else "000000"

            order = Order.objects.create(
                user=request.user,
                status=Order.Status.PENDING_PAYMENT,
                subtotal=subtotal,
                gst_amount=total_gst,
                cgst_amount=cgst,
                sgst_amount=sgst,
                shipping_cost=shipping_cost,
                shipping_method=shipping_method,
                total=order_total,
                shipping_name=ship_name,
                shipping_phone=ship_phone,
                shipping_address_line1=ship_l1,
                shipping_city=ship_city,
                shipping_state=ship_state,
                shipping_postal_code=ship_pin,
                is_bulk=True
            )
            
            OrderLine.objects.create(
                order=order,
                product=product,
                quantity=quote.quantity,
                unit_price=quote.quoted_price_per_unit,
                gst_percentage=gst_pct,
                gst_amount=total_gst,
                line_total=lines_total,
            )
            append_history(order, Order.Status.PENDING_PAYMENT, f"Created from bulk quote #{quote.id}. Stock reserved.")
            
            quote.status = BulkQuoteRequest.Status.ACCEPTED
            quote.order = order
            quote.save(update_fields=["status", "order"])
            
        return Response({"order_id": order.id, "order_number": order.order_number, "detail": "Quote accepted. Boutique order generated."})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        quote = self.get_object()
        if quote.status != BulkQuoteRequest.Status.QUOTED:
            return Response({"detail": "This quote cannot be rejected."}, status=status.HTTP_400_BAD_REQUEST)
            
        quote.status = BulkQuoteRequest.Status.REJECTED
        quote.save(update_fields=["status"])
        return Response({"detail": "Quote declined."})

class OrderReceiptDownloadView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [StaticHTMLRenderer]

    def get(self, request, order_number):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Receipt request for Order #{order_number} from User: {request.user}")
        
        from django.db.models import Q
        order = Order.objects.filter(Q(order_number=order_number) | Q(id=order_number if str(order_number).isdigit() else 0), user=request.user).first()
        if not order:
            actual_order = Order.objects.filter(Q(order_number=order_number) | Q(id=order_number if str(order_number).isdigit() else 0)).first()
            if actual_order:
                logger.warning(f"Order #{order_number} belongs to {actual_order.user}, but requested by {request.user}")
            return Response({"detail": "Order not found or authorization mismatch."}, status=status.HTTP_404_NOT_FOUND)

        try:
            buffer = generate_order_receipt_pdf(order)
            filename = f"JFP_Receipt_{order.id}.pdf"
            
            return FileResponse(
                buffer, 
                as_attachment=True, 
                filename=filename, 
                content_type="application/pdf"
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Receipt generation failed for order #{order.id}: {e}")
            return Response(
                {"detail": f"Generation failed: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

