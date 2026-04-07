import os
from decimal import Decimal

import razorpay

from orders.models import Order


def get_razorpay_client():
    key_id = os.environ.get("RAZORPAY_KEY_ID", "")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        return None, None, None
    return razorpay.Client(auth=(key_id, key_secret)), key_id, key_secret


def rupees_to_paise(amount: Decimal) -> int:
    return int((amount * Decimal(100)).quantize(Decimal("1")))


def create_razorpay_order(order: Order) -> dict | None:
    client, _, _ = get_razorpay_client()
    if client is None:
        return None
    amount_paise = rupees_to_paise(order.total)
    receipt = f"jfp_order_{order.id}"[:40]
    return client.order.create(
        {
            "amount": amount_paise,
            "currency": order.currency,
            "receipt": receipt,
            "notes": {"django_order_id": str(order.id)},
        }
    )


def verify_payment_signature(order: Order, payment_id: str, signature: str) -> bool:
    client, _, _ = get_razorpay_client()
    if client is None:
        return False
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": order.razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            }
        )
        return True
    except razorpay.errors.SignatureVerificationError:
        return False


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    client, _, _ = get_razorpay_client()
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    if client is None or not secret or not signature:
        return False
    try:
        client.utility.verify_webhook_signature(body.decode(), signature, secret)
        return True
    except (razorpay.errors.SignatureVerificationError, UnicodeDecodeError):
        return False
