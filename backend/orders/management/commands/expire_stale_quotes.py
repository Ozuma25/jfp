"""
Management command: expire_stale_quotes
---------------------------------------
Only ONE scenario is handled:

  Customer never accepted the admin's price quote within 48 hours:
    status=QUOTED  AND  quoted_at older than 48h
    → Marks as REJECTED
    → Admin note: "Auto-expired: customer did not accept within 48 hours of receiving quote"

NOTE: PENDING quotes (where admin hasn't responded yet) are NEVER auto-expired.
      They remain active until the admin manually acts on them.

Run manually:
    python manage.py expire_stale_quotes

Schedule via Windows Task Scheduler (every 2 hours is sufficient).
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from orders.models import BulkQuoteRequest


class Command(BaseCommand):
    help = "Expire quoted bulk requests where the customer did not accept within the time window."

    def add_arguments(self, parser):
        parser.add_argument(
            "--hours",
            type=int,
            default=48,
            help="Hours after quoting before the unaccepted quote is expired (default: 48).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be expired without actually changing anything.",
        )

    def handle(self, *args, **options):
        hours   = options["hours"]
        dry_run = options["dry_run"]
        cutoff  = timezone.now() - timedelta(hours=hours)

        # Only expire QUOTED quotes — PENDING quotes are never auto-expired
        unaccepted = BulkQuoteRequest.objects.filter(
            status=BulkQuoteRequest.Status.QUOTED,
            is_resolved=False,
            quoted_at__lt=cutoff,
        )

        count = unaccepted.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("No stale quoted requests to expire."))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"[DRY RUN] Would expire {count} quote(s) where customer did not accept within {hours}h:"
            ))
            for q in unaccepted:
                age = timezone.now() - q.quoted_at
                self.stdout.write(
                    f"  - Quote #{q.pk}: {q.name} / {q.product.name} "
                    f"(quoted {age} ago, still unaccepted)"
                )
            return

        expired = unaccepted.update(
            status=BulkQuoteRequest.Status.REJECTED,
            is_resolved=True,
            admin_notes=(
                f"Auto-expired: customer did not accept the quote within {hours} hours "
                f"of receiving it. They may submit a new request."
            ),
        )

        self.stdout.write(self.style.SUCCESS(
            f"Expired {expired} quoted request(s) unaccepted by customer after {hours} hours."
        ))
