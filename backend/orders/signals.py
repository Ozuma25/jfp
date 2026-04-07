from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Order, BulkQuoteRequest
from notifications.tasks import send_email_sync

@receiver(post_save, sender=Order)
def order_status_changed_notification(sender, instance, created, **kwargs):
    if created:
        return # Initial creation handled in view usually, or stay here
    
    # We check if status was updated in this save (though post_save doesn't tell us, 
    # for simplicity we trigger on any save if status is specific)
    
    if instance.status == Order.Status.DESIGN_APPROVED_PENDING_PAYMENT:
        subject = f"[JFP] Elite Design Approved — Order #{instance.id}"
        message = (
            f"Greetings from Jai Fancy Packs!\n\n"
            f"Your bespoke design for Order #{instance.id} has been APPROVED by our atelier team.\n"
            f"You can now proceed with the final payment to start production.\n\n"
            f"Pay Now: {settings.FRONTEND_URL}/orders/{instance.id}\n\n"
            f"Thank you for choosing elegance."
        )
        send_email_sync(subject, message, [instance.user.email])
        
    elif instance.status == Order.Status.DESIGN_REJECTED:
        subject = f"[JFP] Action Required: Bespoke Design — Order #{instance.id}"
        message = (
            f"Your bespoke design for Order #{instance.id} requires revision.\n\n"
            f"Reason: {instance.admin_rejection_reason}\n\n"
            f"Please upload a higher-quality or corrected design here:\n"
            f"{settings.FRONTEND_URL}/orders/{instance.id}\n\n"
            f"Our team is ready to review your next version."
        )
        send_email_sync(subject, message, [instance.user.email])

@receiver(post_save, sender=BulkQuoteRequest)
def bulk_quote_status_changed_notification(sender, instance, created, **kwargs):
    if created:
        return

    if instance.status == BulkQuoteRequest.Status.QUOTED:
        subject = f"[JFP] Your Boutique Quote is Ready — #{instance.id}"
        message = (
            f"Your request for {instance.product.name} ({instance.quantity} units) has been priced by our team.\n\n"
            f"Rate: Rs. {instance.quoted_price_per_unit} per piece\n\n"
            f"You can review and accept the quote here:\n"
            f"{settings.FRONTEND_URL}/account/bulk-quotes\n\n"
            f"This link will expire once stock is depleted."
        )
        send_email_sync(subject, message, [instance.email])
