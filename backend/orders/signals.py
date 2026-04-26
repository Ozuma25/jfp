from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Order, BulkQuoteRequest
from notifications.tasks import send_email_sync


@receiver(post_save, sender=Order)
def order_status_changed_notification(sender, instance, created, **kwargs):
    frontend = settings.FRONTEND_URL
    order_url = f"{frontend}/orders/{instance.order_number}"

    if created:
        if instance.status == Order.Status.UNDER_REVIEW:
            send_email_sync(
                subject=f"[JFP] Bespoke Design Received — Order #{instance.order_number}",
                message=(
                    f"Hi {instance.shipping_name},\n\n"
                    f"We've received your custom design for Order #{instance.order_number}.\n"
                    f"Our atelier team will review it within 24–48 hours and notify you.\n\n"
                    f"Track your order: {order_url}\n\n"
                    f"Thank you for choosing Jai Fancy Packs."
                ),
                recipient_list=[instance.user.email],
                email_type="order",
                template_context={
                    "title": "Bespoke Design Received",
                    "greeting": f"Hi {instance.shipping_name}",
                    "paragraphs": [
                        f"We've received your custom design for Order <strong>#{instance.order_number}</strong>.",
                        "Our interior atelier team will thoroughly review your upload to ensure it meets our quality standards.",
                        "We will notify you within 24–48 hours once your design is approved and ready for payment."
                    ],
                    "action_url": order_url,
                    "action_text": "Track Order Status",
                }
            )
        return

    # Status change notifications - ONLY FIRE IF STATUS CHANGED!
    if not getattr(instance, '_status_actually_changed', False):
        return

    if instance.status == Order.Status.PAID:
        send_email_sync(
            subject=f"[JFP] Payment Received — Order #{instance.order_number} ✅",
            message=(
                f"Hi {instance.shipping_name},\n\n"
                f"Your payment for Order #{instance.order_number} has been confirmed.\n"
                f"Total Paid: ₹{instance.total}\n\n"
                f"We're now processing your order. You'll receive a shipping update soon.\n\n"
                f"View Order: {order_url}"
            ),
            recipient_list=[instance.user.email],
            email_type="order",
            template_context={
                "title": "Payment Confirmed",
                "greeting": f"Hi {instance.shipping_name}",
                "paragraphs": [
                    f"We've successfully received your payment for Order <strong>#{instance.order_number}</strong>.",
                    "Our team is now carefully preparing your items for dispatch. We will send you another update once your package has shipped."
                ],
                "meta_info": [
                    ("Amount Paid", f"₹{instance.total}")
                ],
                "action_url": order_url,
                "action_text": "View Receipt",
            }
        )

    elif instance.status == Order.Status.DESIGN_APPROVED_PENDING_PAYMENT:
        send_email_sync(
            subject=f"[JFP] Design Approved — Complete Your Payment for Order #{instance.order_number}",
            message=(
                f"Hi {instance.shipping_name},\n\n"
                f"Great news! Your bespoke design for Order #{instance.order_number} has been APPROVED.\n"
                f"Please complete your payment to begin production:\n{order_url}\n\n"
                f"Thank you for choosing elegance."
            ),
            recipient_list=[instance.user.email],
            email_type="order",
            template_context={
                "title": "Design Approved",
                "greeting": f"Hi {instance.shipping_name}",
                "paragraphs": [
                    f"Great news! Your bespoke design for Order <strong>#{instance.order_number}</strong> has been strictly reviewed and <strong>APPROVED</strong> by our production team.",
                    "Please complete your payment so we can immediately begin crafting your custom boutique pieces."
                ],
                "action_url": order_url,
                "action_text": "Complete Payment",
            }
        )

    elif instance.status == Order.Status.DESIGN_REJECTED:
        send_email_sync(
            subject=f"[JFP] Design Revision Required — Order #{instance.order_number}",
            message=(
                f"Hi {instance.shipping_name},\n\n"
                f"Your bespoke design for Order #{instance.order_number} requires a revision.\n\n"
                f"Reason: {instance.admin_rejection_reason or 'See order page for details'}\n\n"
                f"Please upload a corrected design here:\n{order_url}\n\n"
                f"Our team is ready to review your next version."
            ),
            recipient_list=[instance.user.email],
            email_type="order",
            template_context={
                "title": "Design Revision Required",
                "greeting": f"Hi {instance.shipping_name}",
                "paragraphs": [
                    f"Our atelier team has reviewed your custom upload for Order <strong>#{instance.order_number}</strong>.",
                    "Unfortunately, we need a slight adjustment before we can approve it for elite production."
                ],
                "meta_info": [
                    ("Feedback", instance.admin_rejection_reason or 'Please log in for details')
                ],
                "extras": [
                    "Please click below to upload a revised file. We look forward to reviewing your updated design."
                ],
                "action_url": order_url,
                "action_text": "Upload New Design",
            }
        )

    elif instance.status == Order.Status.PROCESSING:
        send_email_sync(
            subject=f"[JFP] Your Order is Being Prepared — #{instance.order_number}",
            message=(
                f"Hi {instance.shipping_name},\n\n"
                f"Your order #{instance.order_number} is now being prepared by our team.\n"
                f"We'll notify you as soon as it's shipped.\n\n"
                f"Track: {order_url}"
            ),
            recipient_list=[instance.user.email],
            email_type="order",
            template_context={
                "title": "Order Processing",
                "greeting": f"Hi {instance.shipping_name}",
                "paragraphs": [
                    f"Your order <strong>#{instance.order_number}</strong> is now smoothly moving through our production line.",
                    "Our team is carefully preparing and packaging your items. We'll send you a tracking link the moment it leaves our facility."
                ],
                "action_url": order_url,
                "action_text": "View Order",
            }
        )

    elif instance.status == Order.Status.READY_FOR_PICKUP:
        spa = getattr(settings, "STORE_PICKUP_ADDRESS", {}) or {}
        map_url = (getattr(settings, "STORE_PICKUP_MAP_URL", "") or "").strip()
        addr_lines = [
            spa.get("line1", "").strip(),
            spa.get("line2", "").strip(),
            f'{spa.get("city", "").strip()}, {spa.get("state", "").strip()} {spa.get("postal_code", "").strip()}'.strip().rstrip(","),
        ]
        addr_plain = "\n".join(line for line in addr_lines if line)
        addr_html = "<br/>".join(line for line in addr_lines if line)

        pickup_extra = []
        meta_info = None
        plaintext_store = ""
        template_ctx = {
            "title": "Ready for Pickup",
            "greeting": f"Hi {instance.shipping_name}",
            "paragraphs": [
                f"Your order <strong>#{instance.order_number}</strong> is packed and ready.",
            ],
            "action_url": order_url,
            "action_text": "View Order",
        }

        if instance.shipping_method == Order.ShippingMethod.STORE_PICKUP:
            pickup_extra.append(
                "Your order is for <strong>store pickup</strong>. Please bring a valid ID and your order number when you visit."
            )
            meta_info = [("Pickup location", addr_html)]
            plaintext_store = f"\n\nPickup location:\n{addr_plain}\n"
            if map_url:
                plaintext_store += f"\nGoogle Maps: {map_url}\n"
                template_ctx["secondary_action_url"] = map_url
                template_ctx["secondary_action_text"] = "Open in Google Maps"
        else:
            pickup_extra.append(
                "Your order is ready for collection. If you chose delivery, our team will contact you if anything further is needed."
            )

        template_ctx["paragraphs"].extend(pickup_extra)
        template_ctx["paragraphs"].append("You can view full details on your order page.")
        if meta_info:
            template_ctx["meta_info"] = meta_info

        plain_message = (
            f"Hi {instance.shipping_name},\n\n"
            f"Good news: Order #{instance.order_number} is ready for pickup."
            f"{plaintext_store}"
            f"\nView your order: {order_url}\n\n"
            f"Thank you for choosing Jai Fancy Packs."
        )

        send_email_sync(
            subject=f"[JFP] Your Order is Ready for Pickup — #{instance.order_number}",
            message=plain_message,
            recipient_list=[instance.user.email],
            email_type="order",
            template_context=template_ctx,
        )

    elif instance.status == Order.Status.SHIPPED:
        tracking_info = []
        if instance.tracking_number:
            tracking_info.append(("Carrier", instance.tracking_provider))
            tracking_info.append(("Tracking ID", instance.tracking_number))
            
        action_btn = instance.tracking_url if instance.tracking_url else order_url
        action_txt = "Track Package Live" if instance.tracking_url else "View Order"

        send_email_sync(
            subject=f"[JFP] Your Order is on the Way 🚚 — #{instance.order_number}",
            message=f"Hi {instance.shipping_name},\n\nYour order #{instance.order_number} has been shipped!\n\nView Order: {order_url}",
            recipient_list=[instance.user.email],
            email_type="order",
            template_context={
                "title": "Your Package Has Shipped",
                "greeting": f"Hi {instance.shipping_name}",
                "paragraphs": [
                    f"We're excited to let you know that your order <strong>#{instance.order_number}</strong> is on its way to you."
                ],
                "meta_info": tracking_info if tracking_info else None,
                "action_url": action_btn,
                "action_text": action_txt,
            }
        )

    elif instance.status == Order.Status.DELIVERED:
        send_email_sync(
            subject=f"[JFP] Delivered! How was your experience? — #{instance.order_number}",
            message=f"Hi {instance.shipping_name},\n\nYour order #{instance.order_number} has been delivered. 🎁",
            recipient_list=[instance.user.email],
            email_type="order",
            template_context={
                "title": "Order Completed",
                "greeting": f"Hi {instance.shipping_name}",
                "paragraphs": [
                    f"Your order <strong>#{instance.order_number}</strong> has been successfully delivered.",
                    "We hope you are thrilled with your premium packaging from Jai Fancy Packs.",
                    "We would appreciate it deeply if you could leave a review to share your experience with other customers."
                ],
                "action_url": f"{frontend}/products",
                "action_text": "Leave a Review",
            }
        )

    elif instance.status == Order.Status.CANCELLED:
        send_email_sync(
            subject=f"[JFP] Order Cancelled — #{instance.order_number}",
            message=f"Hi {instance.shipping_name},\n\nYour order #{instance.order_number} has been cancelled.",
            recipient_list=[instance.user.email],
            email_type="order",
            template_context={
                "title": "Order Cancelled",
                "greeting": f"Hi {instance.shipping_name}",
                "paragraphs": [
                    f"Your order <strong>#{instance.order_number}</strong> has been cancelled.",
                    "If this was unexpected, or if you require any assistance, please don't hesitate to reach out to our support team."
                ],
                "action_url": f"{frontend}/products",
                "action_text": "Browse Boutique",
            }
        )

@receiver(post_save, sender=Order)
def order_invoice_notification(sender, instance, **kwargs):
    if instance.invoice_pdf and not instance.invoice_emailed:
        from notifications.tasks import send_email_sync
        from django.conf import settings
        import base64
        
        frontend = settings.FRONTEND_URL
        order_url = f"{frontend}/orders/{instance.order_number}"
        
        try:
            instance.invoice_pdf.open()
            encoded_pdf = base64.b64encode(instance.invoice_pdf.read()).decode("utf-8")
            instance.invoice_pdf.close()
            
            attachments = [{
                "filename": f"GST_Invoice_{instance.order_number}.pdf",
                "content": encoded_pdf
            }]
            
            send_email_sync(
                subject=f"[JFP] GST Invoice for Order #{instance.order_number}",
                message=f"Hi {instance.shipping_name},\n\nPlease find attached the official GST invoice for your order.\n\nThank you for choosing Jai Fancy Packs.",
                recipient_list=[instance.user.email],
                email_type="order",
                attachments=attachments,
                template_context={
                    "title": "GST Invoice Generated",
                    "greeting": f"Hi {instance.shipping_name}",
                    "paragraphs": [
                        f"We have successfully generated the official GST Invoice for your order <strong>#{instance.order_number}</strong>.",
                        "Please find the invoice PDF safely attached to this email for your accounting records."
                    ],
                    "action_url": order_url,
                    "action_text": "View Order",
                }
            )
            
            Order.objects.filter(pk=instance.pk).update(invoice_emailed=True)
            instance.invoice_emailed = True
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to email invoice for #{instance.order_number}: {e}")


@receiver(post_save, sender=BulkQuoteRequest)
def bulk_quote_status_changed_notification(sender, instance, created, **kwargs):
    frontend = settings.FRONTEND_URL
    quotes_url = f"{frontend}/account/bulk-quotes"

    if created:
        send_email_sync(
            subject="[JFP] Bulk Quote Request Received — We'll Respond Within 48 Hours",
            message=f"Hi {instance.name},\nWe've received your bulk quote request for {instance.product.name} ({instance.quantity} units).",
            recipient_list=[instance.email],
            email_type="noreply",
            template_context={
                "title": "Quote Request Acknowledged",
                "greeting": f"Hi {instance.name}",
                "paragraphs": [
                    "We've received your high-volume request. Our B2B team will analyze your requirements and respond with a customized price within 48 hours."
                ],
                "meta_info": [
                    ("Product", instance.product.name),
                    ("Quantity", f"{instance.quantity} units")
                ],
                "action_url": quotes_url,
                "action_text": "Track Your Quotes",
            }
        )
        return

    # ONLY FIRE IF STATUS ACTUALLY CHANGED!
    if not getattr(instance, '_status_actually_changed', False):
        return

    if instance.status == BulkQuoteRequest.Status.QUOTED:
        # Pre-format total safely
        try:
            total_est = f"₹{float(instance.quoted_price_per_unit or 0) * instance.quantity:,.2f}"
        except:
            total_est = "N/A"

        extras = []
        if instance.admin_notes:
            extras.append(f"<strong>Note from Admin:</strong> {instance.admin_notes}")

        send_email_sync(
            subject=f"[JFP] Your Bulk Quote is Ready — {instance.product.name}",
            message=f"Hi {instance.name}, Your quote is ready.",
            recipient_list=[instance.email],
            email_type="noreply",
            template_context={
                "title": "Your Quote is Ready",
                "greeting": f"Hi {instance.name}",
                "paragraphs": [
                    f"Our B2B team has reviewed your request for <strong>{instance.product.name}</strong> and prepared a tailored price for you."
                ],
                "meta_info": [
                    ("Product", instance.product.name),
                    ("Quantity", f"{instance.quantity} units"),
                    ("Unit Price", f"₹{instance.quoted_price_per_unit}"),
                    ("Total Estimate", total_est)
                ],
                "extras": extras,
                "action_url": quotes_url,
                "action_text": "Accept Quote",
            }
        )

    elif instance.status == BulkQuoteRequest.Status.REJECTED and not instance.is_resolved:
        send_email_sync(
            subject=f"[JFP] Quote Declined — {instance.product.name}",
            message=f"Hi {instance.name},\nYou've declined the quote for {instance.product.name}.",
            recipient_list=[instance.email],
            email_type="noreply",
            template_context={
                "title": "Quote Declined",
                "greeting": f"Hi {instance.name}",
                "paragraphs": [
                    f"You have declined our quote for <strong>{instance.product.name}</strong>.",
                    "If you'd like to discuss pricing further or make a new request with different specifications, please reach out. We are happy to work with your budget."
                ],
                "action_url": f"{frontend}/quote",
                "action_text": "New Inquiry",
            }
        )

    elif instance.status == BulkQuoteRequest.Status.ACCEPTED:
        send_email_sync(
            subject=f"[JFP] Quote Accepted — Your Bulk Order is Created!",
            message=f"Hi {instance.name},\nYou've accepted the quote. Please complete payment.",
            recipient_list=[instance.email],
            email_type="order",
            template_context={
                "title": "Quote Accepted",
                "greeting": f"Hi {instance.name}",
                "paragraphs": [
                    "You have successfully accepted the quote terms.",
                    f"A bulk wholesale order for <strong>{instance.product.name}</strong> ({instance.quantity} units) has been automatically generated under your account.",
                    "Please navigate to your Orders page to complete payment and begin production."
                ],
                "action_url": quotes_url,
                "action_text": "Go to Orders",
            }
        )
