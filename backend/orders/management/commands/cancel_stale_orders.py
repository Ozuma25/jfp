"""
Management command: cancel_stale_orders
----------------------------------------
Cancels Orders that have been in PENDING_PAYMENT status for more than
ORDER_CANCEL_HOURS (default 24) hours — meaning the Razorpay payment
window timed out without the user completing payment.

Run manually:
    python manage.py cancel_stale_orders

Schedule via Windows Task Scheduler or cron (every 30 minutes is recommended):
    python manage.py cancel_stale_orders --hours 24
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from orders.models import Order, OrderStatusHistory


class Command(BaseCommand):
    help = "Cancel orders that have been awaiting payment for too long."

    def add_arguments(self, parser):
        parser.add_argument(
            "--hours",
            type=int,
            default=24,
            help="Number of hours after which a pending-payment order is cancelled (default: 24).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be cancelled without actually changing anything.",
        )

    def handle(self, *args, **options):
        hours = options["hours"]
        dry_run = options["dry_run"]
        cutoff = timezone.now() - timedelta(hours=hours)

        # Cancel both regular pending-payment and design-approved-pending-payment
        stale_qs = Order.objects.filter(
            status__in=[
                Order.Status.PENDING_PAYMENT,
                Order.Status.DESIGN_APPROVED_PENDING_PAYMENT,
            ],
            created_at__lt=cutoff,
        )

        count = stale_qs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("No stale orders to cancel."))
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[DRY RUN] Would cancel {count} order(s) older than {hours}h:"
                )
            )
            for o in stale_qs:
                age = timezone.now() - o.created_at
                self.stdout.write(f"  - Order {o.order_number or o.pk}: status={o.status} (age: {age})")
            return

        cancelled = 0
        for order in stale_qs:
            old_status = order.status
            order.status = Order.Status.CANCELLED
            order.save(update_fields=["status", "updated_at"])

            # Record in status history for admin audit trail
            OrderStatusHistory.objects.create(
                order=order,
                status=Order.Status.CANCELLED,
                note=f"Auto-cancelled: payment not received within {hours} hours (was: {old_status}).",
            )

            # Notify the customer
            try:
                from django.conf import settings
                from notifications.tasks import send_email_sync
                send_email_sync(
                    subject=f"[JFP] Order Cancelled — {order.order_number}",
                    message=(
                        f"Hi {order.shipping_name},\n\n"
                        f"Your order {order.order_number} has been automatically cancelled "
                        f"because payment was not received within {hours} hours.\n\n"
                        f"If this was a mistake, you can place a new order anytime:\n"
                        f"{settings.FRONTEND_URL}/products\n\n"
                        f"Need help? Reply to this email or contact support@jaifancypacks.com.\n\n"
                        f"We hope to serve you again!"
                    ),
                    recipient_list=[order.user.email],
                    email_type="order",
                    template_context={
                        "title": "Order Automatically Cancelled",
                        "greeting": f"Hi {order.shipping_name}",
                        "paragraphs": [
                            f"Your order <strong>#{order.order_number}</strong> has been cancelled automatically because payment was not received within our {hours}-hour reservation window.",
                            "If this was an oversight and you still wish to purchase, you are welcome to place a new order."
                        ],
                        "action_url": f"{settings.FRONTEND_URL}/products",
                        "action_text": "Browse Boutique",
                    }
                )
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  Email failed for {order.order_number}: {e}"))

            cancelled += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Cancelled {cancelled} pending-payment order(s) older than {hours} hours."
            )
        )
