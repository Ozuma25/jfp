import json
import urllib.request
import logging
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from cart.models import Cart
import os

logger = logging.getLogger(__name__)

# Centralised reply-to for all transactional emails
REPLY_TO = "Jai Fancy Packs Support <support@jaifancypacks.com>"

def send_email_sync(
    subject: str,
    message: str,
    recipient_list: list,
    from_email: str = None,
    html_message: str = None,
    email_type: str = "noreply",  # "order" → orders@..., "noreply" → noreply@...
    template_context: dict = None,
    attachments: list = None,
):
    """
    Send a transactional email via Resend's HTTP API.
    (We use HTTP instead of SMTP because Render blocks outbound SMTP ports 587/465 on free tiers, 
    causing server timeouts and 500 errors).
    """
    if not from_email:
        if email_type == "order":
            from_email = getattr(settings, "ORDER_FROM_EMAIL", "Jai Fancy Packs Orders <orders@jaifancypacks.com>")
        else:
            from_email = getattr(settings, "NOREPLY_FROM_EMAIL", "Jai Fancy Packs <noreply@jaifancypacks.com>")

    if template_context and not html_message:
        from django.template.loader import render_to_string
        try:
            html_message = render_to_string("notifications/email_action.html", template_context)
        except Exception as e:
            logger.error(f"Failed to render email template: {e}")

    api_key = os.environ.get("EMAIL_HOST_PASSWORD", "")
    if not api_key:
        logger.error("Missing Resend API Key (EMAIL_HOST_PASSWORD). Cannot send email.")
        return

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "JFP-Backend/1.0"
    }
    
    payload = {
        "from": from_email,
        "to": recipient_list,
        "subject": subject,
        "reply_to": REPLY_TO
    }
    
    if html_message:
        payload["html"] = html_message
    else:
        payload["text"] = message
        
    if attachments:
        payload["attachments"] = attachments

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers)

    try:
        logger.info(f"Sending email over HTTP [{email_type}]: '{subject}' → {recipient_list}")
        # 10s timeout prevents the server from hanging indefinitely
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = response.read()
            logger.info(f"Resend accepted email: {res_data}")
    except Exception as exc:
        logger.error(f"HTTP Email send failed: {exc}")


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
        
        send_email_sync(
            subject=subject, 
            message=message, 
            recipient_list=[user.email], 
            template_context={
                "title": "Something Beautiful Awaits",
                "greeting": f"Hello {user.first_name or 'there'}",
                "paragraphs": [
                    "We noticed you haven't finalized your selection yet.",
                    "Your boutique items are still reserved for you in your cart. Finish your checkout before they run out."
                ],
                "action_url": cart_url,
                "action_text": "Return to My Atelier",
            }
        )
        
        cart.abandoned_reminder_sent = True
        cart.save(update_fields=["abandoned_reminder_sent"])
        count += 1
    
    return f"Sent {count} abandonment reminders."
