import logging
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from cart.models import Cart

logger = logging.getLogger(__name__)

def send_email_sync(subject, message, recipient_list, from_email=None, html_message=None):
    """
    Generic function to send emails synchronously.
    """
    if not from_email:
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@jaifancypacks.com")
    
    try:
        logger.info(f"Sending email: '{subject}' to {recipient_list}")
        send_mail(
            subject,
            message,
            from_email,
            recipient_list,
            fail_silently=False,
            html_message=html_message,
        )
    except Exception as exc:
        logger.error(f"Error sending email: {exc}")

def check_abandoned_carts():
    """
    Check for users who left items in their cart and send reminders synchronously.
    (Previously a periodic Celery task)
    """
    cutoff = timezone.now() - timedelta(hours=2)
    abandoned_carts = Cart.objects.filter(
        user__isnull=False,
        updated_at__lte=cutoff,
        abandoned_reminder_sent=False,
        items__isnull=False
    ).distinct().select_related("user")

    count = 0
    for cart in abandoned_carts:
        user = cart.user
        subject = "You left something beautiful in your atelier — Jai Fancy Packs"
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        cart_url = f"{frontend_url}/cart"
        
        message = f"Hello {user.first_name},\n\nWe noticed you left some exquisite pieces in your cart. They are waiting for you at the atelier.\n\nVisit your cart: {cart_url}\n\nThank you for choosing Jai Fancy Packs."
        html_message = f"""
        <div style="font-family: serif; color: #1a1a1a; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #f0f0f0;">
            <h2 style="color: #c8a96e; text-align: center;">Something Beautiful Awaits</h2>
            <p>Hello {user.first_name},</p>
            <p>We noticed you haven't finalized your selection yet. Your boutique items are still reserved for you in your cart.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{cart_url}" style="background-color: #1a1a1a; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 2px;">Return to My Atelier</a>
            </div>
            <p style="font-size: 11px; color: #666; font-style: italic; text-align: center;">Premium Gifting & Boutique Packaging — Jai Fancy Packs</p>
        </div>
        """
        
        send_email_sync(subject, message, [user.email], html_message=html_message)
        
        cart.abandoned_reminder_sent = True
        cart.save(update_fields=["abandoned_reminder_sent"])
        count += 1
    
    return f"Sent {count} abandonment reminders."
