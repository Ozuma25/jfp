import sys

path = r'c:\laragon\www\vishal\jai_fancy_packs\E_com\backend\orders\views.py'
with open(path, 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if 'class BulkQuoteRequestViewSet' in line:
        start_idx = i
    if start_idx != -1 and 'class OrderReceiptDownloadView' in line:
        end_idx = i - 1
        break

if start_idx == -1 or end_idx == -1:
    print(f"Error: Could not find markers. start={start_idx}, end={end_idx}")
    sys.exit(1)

new_code = [
    'class BulkQuoteRequestViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):\n',
    '    permission_classes = [AllowAny]\n',
    '    serializer_class = BulkQuoteRequestSerializer\n',
    '\n',
    '    def get_queryset(self):\n',
    '        if self.request.user.is_authenticated:\n',
    '            return BulkQuoteRequest.objects.filter(email=self.request.user.email).select_related("product")\n',
    '        return BulkQuoteRequest.objects.none()\n',
    '\n',
    '    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])\n',
    '    def accept(self, request, pk=None):\n',
    '        quote = self.get_object()\n',
    '        if quote.status != BulkQuoteRequest.Status.QUOTED:\n',
    '            return Response({"detail": "This boutique quote is not yet priced for acceptance."}, status=status.HTTP_400_BAD_REQUEST)\n',
    '        \n',
    '        with transaction.atomic():\n',
    '            from catalog.models import Product\n',
    '            from accounts.models import SavedAddress\n',
    '            product = Product.objects.select_for_update().get(pk=quote.product_id)\n',
    '            if product.stock < quote.quantity:\n',
    '                 return Response({"detail": f"This boutique piece is currently low on stock ({product.stock} available). Please request a fresh quote or reduce quantity."}, status=status.HTTP_400_BAD_REQUEST)\n',
    '            \n',
    '            product.stock -= quote.quantity\n',
    '            product.save(update_fields=["stock"])\n',
    '\n',
    '            subtotal = (Decimal(quote.quantity) * quote.quoted_price_per_unit).quantize(Decimal("0.01"))\n',
    '            gst_pct = Decimal(str(product.gst_percentage or 18))\n',
    '            total_gst = (subtotal * gst_pct / Decimal("100")).quantize(Decimal("0.01"))\n',
    '            cgst = (total_gst / Decimal("2")).quantize(Decimal("0.01"))\n',
    '            sgst = (total_gst - cgst)\n',
    '            order_total = subtotal + total_gst\n',
    '\n',
    '            addr = SavedAddress.objects.filter(user=request.user, is_default=True).first() or \\\n',
    '                   SavedAddress.objects.filter(user=request.user).first()\n',
    '            \n',
    '            ship_name = addr.recipient_name if addr else quote.name\n',
    '            ship_phone = addr.phone if addr else quote.phone\n',
    '            ship_l1 = addr.address_line1 if addr else "Update Required"\n',
    '            ship_city = addr.city if addr else "Update Required"\n',
    '            ship_state = addr.state if addr else "Update Required"\n',
    '            ship_pin = addr.postal_code if addr else "000000"\n',
    '\n',
    '            order = Order.objects.create(\n',
    '                user=request.user,\n',
    '                status=Order.Status.PENDING_PAYMENT,\n',
    '                subtotal=subtotal,\n',
    '                gst_amount=total_gst,\n',
    '                cgst_amount=cgst,\n',
    '                sgst_amount=sgst,\n',
    '                total=order_total,\n',
    '                shipping_name=ship_name,\n',
    '                shipping_phone=ship_phone,\n',
    '                shipping_address_line1=ship_l1,\n',
    '                shipping_city=ship_city,\n',
    '                shipping_state=ship_state,\n',
    '                shipping_postal_code=ship_pin\n',
    '            )\n',
    '            \n',
    '            OrderLine.objects.create(\n',
    '                order=order,\n',
    '                product=product,\n',
    '                quantity=quote.quantity,\n',
    '                unit_price=quote.quoted_price_per_unit,\n',
    '                gst_percentage=gst_pct,\n',
    '                gst_amount=total_gst,\n',
    '                line_total=order_total,\n',
    '            )\n',
    '            from orders.utils import append_history\n',
    '            append_history(order, Order.Status.PENDING_PAYMENT, f"Created from bulk quote #{quote.id}. Stock reserved.")\n',
    '            \n',
    '            quote.status = BulkQuoteRequest.Status.ACCEPTED\n',
    '            quote.order = order\n',
    '            quote.save(update_fields=["status", "order"])\n',
    '            \n',
    '        return Response({"order_id": order.id, "detail": "Quote accepted. Boutique order generated."})\n',
    '\n',
    '    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])\n',
    '    def reject(self, request, pk=None):\n',
    '        quote = self.get_object()\n',
    '        if quote.status != BulkQuoteRequest.Status.QUOTED:\n',
    '            return Response({"detail": "This quote cannot be rejected."}, status=status.HTTP_400_BAD_REQUEST)\n',
    '            \n',
    '        quote.status = BulkQuoteRequest.Status.REJECTED\n',
    '        quote.save(update_fields=["status"])\n',
    '        return Response({"detail": "Quote declined."})\n',
]

result_lines = lines[:start_idx] + new_code + lines[end_idx:]
with open(path, 'w') as f:
    f.writelines(result_lines)
print("SUCCESS: View patched successfully.")
