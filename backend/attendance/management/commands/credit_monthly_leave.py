"""
Management command: credit_monthly_leave

Run on the 1st of every month via Task Scheduler or cron.

Windows Task Scheduler command:
  python manage.py credit_monthly_leave

Cron (Linux/Mac):
  0 9 1 * * /path/to/venv/bin/python /path/to/manage.py credit_monthly_leave

Credits 1 paid leave to every active employee for the current month.
Skips employees who have already been credited for this month.
Annual cap: 12 leaves per year.
"""

import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from attendance.models import Employee
from attendance.services import credit_monthly_leave


class Command(BaseCommand):
    help = "Credits 1 monthly paid leave to all active employees."

    def add_arguments(self, parser):
        parser.add_argument(
            "--year", type=int, default=None,
            help="Year for credit. Defaults to current year.",
        )
        parser.add_argument(
            "--month", type=int, default=None,
            help="Month (1-12) for credit. Defaults to current month.",
        )

    def handle(self, *args, **options):
        today = timezone.localdate()
        year = options.get("year") or today.year
        month = options.get("month") or today.month

        import calendar
        self.stdout.write(
            f"Crediting 1 paid leave for {calendar.month_name[month]} {year}…"
        )

        active_employees = Employee.objects.filter(status=Employee.Status.ACTIVE)
        credited = 0
        skipped = 0

        for emp in active_employees:
            applied = credit_monthly_leave(emp, year, month)
            if applied:
                credited += 1
                self.stdout.write(f"  ✅ {emp.employee_code} — {emp.name}")
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Credited: {credited}, Skipped (already credited or cap reached): {skipped}."
            )
        )
