"""
Management command: resolve_incomplete_attendance

Run nightly at 9:00 PM via Task Scheduler or cron.

Windows Task Scheduler command:
  python manage.py resolve_incomplete_attendance

Cron (Linux/Mac):
  0 21 * * 1-6 /path/to/venv/bin/python /path/to/manage.py resolve_incomplete_attendance

Marks all INCOMPLETE attendance records for today (or a given date) as ABSENT
and applies 1.0 leave deduction.
"""

import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from attendance.services import resolve_incomplete_for_date


class Command(BaseCommand):
    help = "Marks INCOMPLETE attendance records as ABSENT at 9 PM EOD."

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            type=str,
            default=None,
            help="Date to process in YYYY-MM-DD format. Defaults to today.",
        )

    def handle(self, *args, **options):
        date_str = options.get("date")
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                self.stderr.write(self.style.ERROR(f"Invalid date: {date_str}"))
                return
        else:
            target_date = timezone.localdate()

        self.stdout.write(f"Resolving INCOMPLETE records for {target_date}…")
        count = resolve_incomplete_for_date(target_date)

        if count:
            self.stdout.write(
                self.style.SUCCESS(f"✅ Marked {count} INCOMPLETE record(s) as ABSENT for {target_date}.")
            )
        else:
            self.stdout.write(f"ℹ️  No INCOMPLETE records found for {target_date}.")
