"""
Business logic for the Attendance system.

All status calculations, punch processing, and leave updates live here.
Views call these functions — no business logic in views.
"""

import datetime
from decimal import Decimal
import math

from django.utils import timezone

from .models import (
    Attendance,
    AuditLog,
    Employee,
    LeaveBalance,
    LeaveRecord,
    OfficeSettings,
)


# ---------------------------------------------------------------------------
# Geofence helper
# ---------------------------------------------------------------------------

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in metres between two GPS coordinates."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))


# ---------------------------------------------------------------------------
# Status Calculation
# ---------------------------------------------------------------------------

def calculate_attendance_status(attendance: Attendance) -> tuple[str, float]:
    """
    Return (status, leave_deduction) based on punch times and office settings.

    Priority: HALF_DAY > LATE > PRESENT
    ABSENT / INCOMPLETE are set externally.
    """
    settings = OfficeSettings.get_settings()

    if not attendance.punch_in:
        return Attendance.Status.ABSENT, 1.0

    if not attendance.punch_out:
        return Attendance.Status.INCOMPLETE, 0.0

    punch_out_local = timezone.localtime(attendance.punch_out).time()
    punch_in_local = timezone.localtime(attendance.punch_in).time()

    # Half day: punch out before 3:00 PM
    if punch_out_local < settings.half_day_cutoff:
        return Attendance.Status.HALF_DAY, 0.5

    # Late: punch in after shift_start + grace
    if punch_in_local > settings.late_threshold:
        return Attendance.Status.LATE, 0.0

    return Attendance.Status.PRESENT, 0.0


def is_working_day(date: datetime.date) -> bool:
    """
    Monday=0 … Saturday=5 are working days. Sunday=6 is off.
    No holiday calendar in Phase 1.
    """
    return date.weekday() < 6  # 0–5 = Mon–Sat


# ---------------------------------------------------------------------------
# Process Punch In
# ---------------------------------------------------------------------------

def process_punch_in(
    employee: Employee,
    *,
    latitude: float | None,
    longitude: float | None,
    accuracy: float | None,
    photo_url: str,
    device_fingerprint: str,
    device_name: str,
    browser: str,
    ip_address: str | None,
) -> tuple[bool, str, Attendance | None]:
    """
    Validate and create/update the attendance record for today's punch-in.

    Returns (success, message, attendance_object).
    """
    today = timezone.localdate()
    settings = OfficeSettings.get_settings()

    # Already punched in today?
    existing = Attendance.objects.filter(employee=employee, date=today).first()
    if existing and existing.punch_in:
        return False, "You have already punched in today.", existing

    # Geofence validation
    if (
        settings.latitude != 0.0
        and latitude is not None
        and longitude is not None
    ):
        distance = haversine_distance(
            latitude, longitude, settings.latitude, settings.longitude
        )
        if distance > settings.allowed_radius_meters:
            return (
                False,
                f"You are outside the office location ({distance:.0f} m from office; allowed {settings.allowed_radius_meters} m).",
                None,
            )
    else:
        distance = None

    now = timezone.now()
    attendance, _ = Attendance.objects.get_or_create(
        employee=employee, date=today,
        defaults={"status": Attendance.Status.INCOMPLETE},
    )

    attendance.punch_in = now
    attendance.punch_in_photo = photo_url
    attendance.punch_in_latitude = latitude
    attendance.punch_in_longitude = longitude
    attendance.punch_in_accuracy = accuracy
    attendance.distance_from_office = distance
    attendance.device_fingerprint = device_fingerprint
    attendance.device_name = device_name
    attendance.browser = browser
    attendance.ip_address = ip_address
    attendance.status = Attendance.Status.INCOMPLETE
    attendance.save()

    AuditLog.objects.create(
        actor=employee.employee_code,
        action="PUNCH_IN",
        table_name="attendance_attendance",
        record_id=attendance.pk,
        new_value={"date": str(today), "punch_in": str(now)},
        ip_address=ip_address,
    )

    return True, "Punch-in recorded successfully.", attendance


# ---------------------------------------------------------------------------
# Process Punch Out
# ---------------------------------------------------------------------------

def process_punch_out(
    employee: Employee,
    *,
    latitude: float | None,
    longitude: float | None,
    accuracy: float | None,
    photo_url: str,
    device_fingerprint: str,
    device_name: str,
    browser: str,
    ip_address: str | None,
) -> tuple[bool, str, Attendance | None]:
    """
    Validate and update today's attendance with punch-out data.
    """
    today = timezone.localdate()
    settings = OfficeSettings.get_settings()

    attendance = Attendance.objects.filter(employee=employee, date=today).first()

    if not attendance or not attendance.punch_in:
        return False, "Please punch in first.", None

    if attendance.punch_out:
        return False, "You have already punched out today.", attendance

    # Geofence
    if (
        settings.latitude != 0.0
        and latitude is not None
        and longitude is not None
    ):
        distance = haversine_distance(
            latitude, longitude, settings.latitude, settings.longitude
        )
        if distance > settings.allowed_radius_meters:
            return (
                False,
                f"You are outside the office location ({distance:.0f} m from office).",
                None,
            )

    now = timezone.now()
    working_minutes = int((now - attendance.punch_in).total_seconds() / 60)

    attendance.punch_out = now
    attendance.punch_out_photo = photo_url
    attendance.punch_out_latitude = latitude
    attendance.punch_out_longitude = longitude
    attendance.punch_out_accuracy = accuracy
    attendance.working_minutes = max(working_minutes, 0)

    # Determine status
    status, leave_deduction = calculate_attendance_status(attendance)
    attendance.status = status
    attendance.leave_deduction = leave_deduction
    attendance.save()

    # Update leave balance if deduction applies
    if leave_deduction > 0:
        _apply_leave_deduction(employee, today, leave_deduction)

    AuditLog.objects.create(
        actor=employee.employee_code,
        action="PUNCH_OUT",
        table_name="attendance_attendance",
        record_id=attendance.pk,
        new_value={
            "date": str(today),
            "punch_out": str(now),
            "status": status,
            "working_minutes": working_minutes,
        },
        ip_address=ip_address,
    )

    return True, "Punch-out recorded successfully.", attendance


# ---------------------------------------------------------------------------
# Manual Attendance Entry  (admin)
# ---------------------------------------------------------------------------

def create_manual_attendance(
    employee: Employee,
    date: datetime.date,
    *,
    punch_in_time: datetime.time,
    punch_out_time: datetime.time | None,
    note: str,
    actor: str,
    ip_address: str | None = None,
) -> tuple[bool, str, Attendance | None]:
    """
    Admin creates or replaces an attendance record without selfie/GPS.
    """
    if Attendance.objects.filter(employee=employee, date=date).exists():
        old = Attendance.objects.get(employee=employee, date=date)
        old_snapshot = {
            "punch_in": str(old.punch_in),
            "punch_out": str(old.punch_out),
            "status": old.status,
        }
    else:
        old_snapshot = None

    # Build aware datetimes from naive times
    tz = timezone.get_current_timezone()
    punch_in_dt = timezone.make_aware(
        datetime.datetime.combine(date, punch_in_time), tz
    )
    punch_out_dt = (
        timezone.make_aware(datetime.datetime.combine(date, punch_out_time), tz)
        if punch_out_time
        else None
    )

    working_minutes = 0
    if punch_out_dt:
        working_minutes = max(
            int((punch_out_dt - punch_in_dt).total_seconds() / 60), 0
        )

    attendance, _ = Attendance.objects.update_or_create(
        employee=employee,
        date=date,
        defaults={
            "punch_in": punch_in_dt,
            "punch_out": punch_out_dt,
            "working_minutes": working_minutes,
            "is_manual_entry": True,
            "manual_entry_note": note,
        },
    )

    status, leave_deduction = calculate_attendance_status(attendance)
    attendance.status = status
    attendance.leave_deduction = leave_deduction
    attendance.save()

    AuditLog.objects.create(
        actor=actor,
        action="MANUAL_ATTENDANCE_ENTRY",
        table_name="attendance_attendance",
        record_id=attendance.pk,
        old_value=old_snapshot,
        new_value={
            "date": str(date),
            "punch_in": str(punch_in_dt),
            "punch_out": str(punch_out_dt),
            "status": status,
            "note": note,
        },
        ip_address=ip_address,
        notes=note,
    )

    return True, "Attendance record saved.", attendance


# ---------------------------------------------------------------------------
# Resolve Incomplete (called by management command at 9 PM)
# ---------------------------------------------------------------------------

def resolve_incomplete_for_date(date: datetime.date) -> int:
    """
    Mark INCOMPLETE attendance records as ABSENT and apply leave deduction.
    Returns count of records updated.
    """
    incomplete = Attendance.objects.filter(
        date=date, status=Attendance.Status.INCOMPLETE
    )
    count = 0
    for record in incomplete:
        record.status = Attendance.Status.ABSENT
        record.leave_deduction = 1.0
        record.save(update_fields=["status", "leave_deduction", "updated_at"])
        _apply_leave_deduction(record.employee, date, 1.0)
        AuditLog.objects.create(
            actor="System",
            action="AUTO_MARK_ABSENT",
            table_name="attendance_attendance",
            record_id=record.pk,
            old_value={"status": "INCOMPLETE"},
            new_value={"status": "ABSENT", "reason": "EOD auto-resolve at 9 PM"},
        )
        count += 1
    return count


# ---------------------------------------------------------------------------
# Leave Balance helpers (private)
# ---------------------------------------------------------------------------

def _apply_leave_deduction(
    employee: Employee, date: datetime.date, deduction: float
) -> None:
    """Subtract deduction from the employee's leave balance for the year."""
    balance = LeaveBalance.get_or_create_for_year(employee, date.year)
    balance.used = balance.used + Decimal(str(deduction))
    balance.save(update_fields=["used", "updated_at"])


def credit_monthly_leave(employee: Employee, year: int, month: int) -> bool:
    """
    Credit 1 paid leave for the given year/month if not already credited.
    Returns True if credit was applied.
    """
    balance = LeaveBalance.get_or_create_for_year(employee, year)

    credit_month_key = datetime.date(year, month, 1)
    if balance.last_credit_date and balance.last_credit_date >= credit_month_key:
        return False  # already credited this month

    if balance.credited >= 12:
        return False  # annual cap reached

    balance.credited = balance.credited + 1
    balance.last_credit_date = credit_month_key
    balance.save(update_fields=["credited", "last_credit_date", "updated_at"])

    AuditLog.objects.create(
        actor="System",
        action="LEAVE_CREDIT",
        table_name="attendance_leavebalance",
        record_id=balance.pk,
        new_value={"year": year, "month": month, "credited_total": float(balance.credited)},
    )
    return True


def ensure_monthly_leave_credits(employee: Employee, year: int, month: int) -> int:
    """
    Ensure 1 paid leave is credited per month starting from August 2026 up to (year, month).
    Unused paid leaves automatically carry forward month-to-month.
    """
    if employee.status != Employee.Status.ACTIVE:
        return 0

    # Start monthly paid leave accrual from August 2026
    ACCURAL_START_YEAR = 2026
    ACCURAL_START_MONTH = 8

    # If target year/month is before August 2026, no monthly credits are added
    if (year < ACCURAL_START_YEAR) or (year == ACCURAL_START_YEAR and month < ACCURAL_START_MONTH):
        return 0

    join_date = employee.joining_date or datetime.date(ACCURAL_START_YEAR, ACCURAL_START_MONTH, 1)

    if join_date.year > ACCURAL_START_YEAR or (join_date.year == ACCURAL_START_YEAR and join_date.month > ACCURAL_START_MONTH):
        curr_y = join_date.year
        curr_m = join_date.month
    else:
        curr_y = ACCURAL_START_YEAR
        curr_m = ACCURAL_START_MONTH

    credits_added = 0
    while (curr_y < year) or (curr_y == year and curr_m <= month):
        if credit_monthly_leave(employee, curr_y, curr_m):
            credits_added += 1

        if curr_m == 12:
            curr_y += 1
            curr_m = 1
        else:
            curr_m += 1

    return credits_added


# ---------------------------------------------------------------------------
# Dashboard summary helpers
# ---------------------------------------------------------------------------

def get_employee_dashboard_data(employee: Employee) -> dict:
    """Returns data dict for the employee dashboard template."""
    today = timezone.localdate()
    today_record = Attendance.objects.filter(employee=employee, date=today).first()

    # Weekly (Mon–today)
    week_start = today - datetime.timedelta(days=today.weekday())
    week_records = list(
        Attendance.objects.filter(
            employee=employee, date__gte=week_start, date__lte=today
        )
    )

    # Monthly
    month_start = today.replace(day=1)
    month_records = list(
        Attendance.objects.filter(
            employee=employee, date__gte=month_start, date__lte=today
        )
    )

    def _count(records, status):
        return sum(1 for r in records if r.status == status)

    # Leave summary
    balance = LeaveBalance.get_or_create_for_year(employee, today.year)

    return {
        "today": today_record,
        "today_date": today,
        "week": {
            "present": _count(week_records, "PRESENT") + _count(week_records, "LATE"),
            "absent": _count(week_records, "ABSENT"),
            "late": _count(week_records, "LATE"),
            "half_day": _count(week_records, "HALF_DAY"),
        },
        "month": {
            "present": _count(month_records, "PRESENT") + _count(month_records, "LATE"),
            "absent": _count(month_records, "ABSENT"),
            "late": _count(month_records, "LATE"),
            "half_day": _count(month_records, "HALF_DAY"),
            "total_working_hours": sum(r.working_minutes for r in month_records) // 60,
        },
        "leave": {
            "taken_this_month": float(
                sum(
                    r.leave_deduction
                    for r in month_records
                    if r.leave_deduction > 0
                )
            ),
            "taken_this_year": float(balance.used),
        },
    }


def get_admin_dashboard_data() -> dict:
    """Returns today's summary for the admin panel."""
    today = timezone.localdate()
    total_active = Employee.objects.filter(status="active").count()
    todays_records = Attendance.objects.filter(date=today).select_related("employee")

    status_counts = {}
    for r in todays_records:
        status_counts[r.status] = status_counts.get(r.status, 0) + 1

    punched_in_ids = set(
        todays_records.exclude(punch_in=None).values_list("employee_id", flat=True)
    )
    absent_count = total_active - len(punched_in_ids)

    return {
        "total_employees": total_active,
        "present": status_counts.get("PRESENT", 0),
        "late": status_counts.get("LATE", 0),
        "half_day": status_counts.get("HALF_DAY", 0),
        "incomplete": status_counts.get("INCOMPLETE", 0),
        "absent": max(absent_count, 0),
        "today": today,
        "recent_records": list(todays_records.order_by("-punch_in")[:20]),
    }
