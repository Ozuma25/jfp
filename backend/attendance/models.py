"""
Attendance app models.

Models:
  - OfficeSettings  (singleton — office config, geofence, shift times)
  - Employee        (staff, PIN-based auth, auto employee_code)
  - SalaryHistory   (tracks salary changes for future encashment)
  - RegisteredDevice (admin-registered devices allowed to punch)
  - Attendance      (daily punch-in/out record)
  - LeaveBalance    (per-employee, per-year leave tracking)
  - LeaveRecord     (individual leave entries managed by admin)
  - AuditLog        (immutable change log)
"""

import datetime
import math

from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# Office Settings (Singleton)
# ---------------------------------------------------------------------------

class OfficeSettings(models.Model):
    """
    Singleton. Fetch via OfficeSettings.get_settings().
    Stores geofence, shift times, and attendance thresholds.
    """
    office_name = models.CharField(max_length=200, default="Jai Fancy Packs")

    # Geofence
    latitude = models.FloatField(default=0.0, help_text="Office GPS latitude")
    longitude = models.FloatField(default=0.0, help_text="Office GPS longitude")
    allowed_radius_meters = models.PositiveIntegerField(
        default=100,
        help_text="Geofence radius in metres. Employee must be within this distance to punch.",
    )

    # Shift
    shift_start = models.TimeField(default=datetime.time(10, 0), help_text="10:00 AM")
    shift_end = models.TimeField(default=datetime.time(19, 45), help_text="7:45 PM")

    # Thresholds
    late_grace_minutes = models.PositiveIntegerField(
        default=10,
        help_text="Minutes after shift_start before punch-in is marked LATE.",
    )
    half_day_cutoff = models.TimeField(
        default=datetime.time(15, 0),
        help_text="Punch-out before this time → HALF_DAY.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Office Settings"
        verbose_name_plural = "Office Settings"

    def __str__(self):
        return self.office_name

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    @property
    def late_threshold(self) -> datetime.time:
        """shift_start + late_grace_minutes"""
        dt = datetime.datetime.combine(datetime.date.today(), self.shift_start)
        dt += datetime.timedelta(minutes=self.late_grace_minutes)
        return dt.time()

    def save(self, *args, **kwargs):
        self.pk = 1  # enforce singleton
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # prevent deletion


# ---------------------------------------------------------------------------
# Employee
# ---------------------------------------------------------------------------

class Employee(models.Model):
    class SalaryType(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        DAILY = "daily", "Daily Wage"
        HOURLY = "hourly", "Hourly"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    # Identity
    employee_code = models.CharField(
        max_length=10, unique=True, editable=False,
        help_text="Auto-generated. Format: JFP001, JFP002 …",
    )
    name = models.CharField(max_length=200)
    mobile = models.CharField(max_length=20)
    address = models.TextField(blank=True)
    designation = models.CharField(max_length=100)
    joining_date = models.DateField()

    # Salary
    salary_type = models.CharField(
        max_length=20, choices=SalaryType.choices, default=SalaryType.MONTHLY
    )
    monthly_salary = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Base salary amount (₹). Interpretation depends on salary_type.",
    )

    # Auth
    pin_hash = models.CharField(max_length=256, help_text="Hashed PIN (never store raw)")

    # Photo
    profile_photo = models.CharField(
        max_length=500, blank=True,
        help_text="Cloudinary URL or local media URL",
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )

    failed_attempts = models.PositiveIntegerField(
        default=0, help_text="Number of consecutive failed PIN attempts"
    )
    locked_until = models.DateTimeField(
        null=True, blank=True, help_text="Account lock expiry time"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["employee_code"]
        verbose_name = "Employee"
        verbose_name_plural = "Employees"

    def __str__(self):
        return f"{self.employee_code} — {self.name}"

    # -- PIN helpers ----------------------------------------------------------

    def set_pin(self, raw_pin: str) -> None:
        """Hash and store the PIN using Django's PBKDF2 hasher."""
        self.pin_hash = make_password(str(raw_pin))

    def check_pin(self, raw_pin: str) -> bool:
        return check_password(str(raw_pin), self.pin_hash)

    # -- Code generation ------------------------------------------------------

    @classmethod
    def generate_code(cls) -> str:
        """
        Return next JFP### code. Never reuses codes from deleted/inactive employees.
        Thread-safe enough for the expected employee count (< 500).
        """
        codes = list(
            cls.objects.values_list("employee_code", flat=True)
        )
        nums = [
            int(c[3:])
            for c in codes
            if c.startswith("JFP") and c[3:].isdigit()
        ]
        next_num = (max(nums) + 1) if nums else 1
        return f"JFP{next_num:03d}"

    def save(self, *args, **kwargs):
        if not self.employee_code:
            self.employee_code = Employee.generate_code()
        super().save(*args, **kwargs)

    @property
    def is_active(self) -> bool:
        return self.status == self.Status.ACTIVE


# ---------------------------------------------------------------------------
# Salary History  (Phase-1 data, Phase-2 UI)
# ---------------------------------------------------------------------------

class SalaryHistory(models.Model):
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="salary_history"
    )
    salary_type = models.CharField(
        max_length=20, choices=Employee.SalaryType.choices
    )
    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2)
    effective_from = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-effective_from"]
        verbose_name = "Salary History"
        verbose_name_plural = "Salary History"

    def __str__(self):
        return (
            f"{self.employee.employee_code} — ₹{self.monthly_salary} "
            f"({self.get_salary_type_display()}) from {self.effective_from}"
        )


# ---------------------------------------------------------------------------
# Registered Device  (admin-only registration)
# ---------------------------------------------------------------------------

class RegisteredDevice(models.Model):
    device_fingerprint = models.CharField(
        max_length=256, unique=True,
        help_text="Browser-generated fingerprint hash",
    )
    device_name = models.CharField(max_length=200)
    browser = models.CharField(max_length=200, blank=True)
    os = models.CharField(max_length=200, blank=True)
    registered_for = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registered_devices",
        help_text="Employee this device belongs to (optional — shared devices leave blank)",
    )
    notes = models.TextField(blank=True, help_text="Admin notes")
    is_active = models.BooleanField(default=True)
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-registered_at"]
        verbose_name = "Registered Device"
        verbose_name_plural = "Registered Devices"

    def __str__(self):
        label = self.device_name or "Unknown Device"
        return f"{label} ({self.device_fingerprint[:12]}…)"


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------

class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        LATE = "LATE", "Late"
        HALF_DAY = "HALF_DAY", "Half Day"
        ABSENT = "ABSENT", "Absent"
        INCOMPLETE = "INCOMPLETE", "Incomplete"

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="attendances"
    )
    date = models.DateField(db_index=True)

    # Timestamps
    punch_in = models.DateTimeField(null=True, blank=True)
    punch_out = models.DateTimeField(null=True, blank=True)
    working_minutes = models.PositiveIntegerField(default=0)

    # Status
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ABSENT
    )
    leave_deduction = models.DecimalField(
        max_digits=3, decimal_places=1, default=0,
        help_text="0 = present, 0.5 = half day, 1.0 = full absent",
    )

    # Photos (Cloudinary or media URLs)
    punch_in_photo = models.CharField(max_length=500, blank=True)
    punch_out_photo = models.CharField(max_length=500, blank=True)

    # GPS — punch in
    punch_in_latitude = models.FloatField(null=True, blank=True)
    punch_in_longitude = models.FloatField(null=True, blank=True)
    punch_in_accuracy = models.FloatField(null=True, blank=True, help_text="GPS accuracy in metres")

    # GPS — punch out
    punch_out_latitude = models.FloatField(null=True, blank=True)
    punch_out_longitude = models.FloatField(null=True, blank=True)
    punch_out_accuracy = models.FloatField(null=True, blank=True)

    # Distance at punch-in
    distance_from_office = models.FloatField(
        null=True, blank=True, help_text="Metres from office at punch-in"
    )

    # Device
    device_fingerprint = models.CharField(max_length=256, blank=True)
    device_name = models.CharField(max_length=200, blank=True)
    browser = models.CharField(max_length=200, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    # Manual entry flag
    is_manual_entry = models.BooleanField(default=False)
    manual_entry_note = models.TextField(
        blank=True, help_text="Required when is_manual_entry=True"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("employee", "date")]
        ordering = ["-date", "employee__employee_code"]
        verbose_name = "Attendance Record"
        verbose_name_plural = "Attendance Records"

    def __str__(self):
        return f"{self.employee.employee_code} | {self.date} | {self.status}"

    def save(self, *args, **kwargs):
        if self.punch_in and self.punch_out and self.punch_out > self.punch_in:
            calc_minutes = int((self.punch_out - self.punch_in).total_seconds() / 60)
            if not self.working_minutes or self.working_minutes == 0:
                self.working_minutes = max(calc_minutes, 0)
        super().save(*args, **kwargs)

    # -- Computed helpers -----------------------------------------------------

    @property
    def working_hours_display(self) -> str:
        minutes = self.working_minutes
        if not minutes and self.punch_in and self.punch_out and self.punch_out > self.punch_in:
            minutes = int((self.punch_out - self.punch_in).total_seconds() / 60)
        if not minutes:
            return "—"
        h, m = divmod(minutes, 60)
        return f"{h}h {m}m"

    @property
    def punch_in_time_display(self) -> str:
        if not self.punch_in:
            return "—"
        local = timezone.localtime(self.punch_in)
        return local.strftime("%I:%M %p")

    @property
    def punch_out_time_display(self) -> str:
        if not self.punch_out:
            return "Pending"
        local = timezone.localtime(self.punch_out)
        return local.strftime("%I:%M %p")

    @property
    def status_color(self) -> str:
        return {
            "PRESENT": "green",
            "LATE": "yellow",
            "HALF_DAY": "orange",
            "ABSENT": "red",
            "INCOMPLETE": "gray",
        }.get(self.status, "gray")


# ---------------------------------------------------------------------------
# Leave Balance  (per employee, per year)
# ---------------------------------------------------------------------------

class LeaveBalance(models.Model):
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="leave_balances"
    )
    year = models.PositiveIntegerField(help_text="Calendar year, e.g. 2025")

    carry_forward = models.DecimalField(
        max_digits=5, decimal_places=1, default=0,
        help_text="Unused leaves carried from previous year",
    )
    credited = models.DecimalField(
        max_digits=5, decimal_places=1, default=0,
        help_text="Leaves earned this year (max 12)",
    )
    used = models.DecimalField(
        max_digits=5, decimal_places=1, default=0,
        help_text="Leaves consumed (deducted from attendance)",
    )
    last_credit_date = models.DateField(
        null=True, blank=True,
        help_text="Date of most recent monthly leave credit",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("employee", "year")]
        ordering = ["-year"]
        verbose_name = "Leave Balance"
        verbose_name_plural = "Leave Balances"

    def __str__(self):
        return f"{self.employee.employee_code} — {self.year} (available: {self.available})"

    @property
    def available(self):
        return self.carry_forward + self.credited - self.used

    @classmethod
    def get_or_create_for_year(cls, employee: Employee, year: int) -> "LeaveBalance":
        obj, created = cls.objects.get_or_create(
            employee=employee, year=year,
            defaults={"carry_forward": 0, "credited": 0, "used": 0},
        )
        if created and year > 1:
            # carry forward from previous year
            try:
                prev = cls.objects.get(employee=employee, year=year - 1)
                obj.carry_forward = max(prev.available, 0)
                obj.save(update_fields=["carry_forward"])
            except cls.DoesNotExist:
                pass
        return obj


# ---------------------------------------------------------------------------
# Leave Record  (individual leave entries — admin managed)
# ---------------------------------------------------------------------------

class LeaveRecord(models.Model):
    class Status(models.TextChoices):
        APPROVED = "APPROVED", "Approved"
        PENDING = "PENDING", "Pending"
        REJECTED = "REJECTED", "Rejected"

    class LeaveType(models.TextChoices):
        FULL = "FULL", "Full Day"
        HALF = "HALF", "Half Day"

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="leave_records"
    )
    leave_date = models.DateField()
    leave_type = models.CharField(
        max_length=10, choices=LeaveType.choices, default=LeaveType.FULL
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    remarks = models.TextField(blank=True)
    approved_by = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("employee", "leave_date")]
        ordering = ["-leave_date"]
        verbose_name = "Leave Record"
        verbose_name_plural = "Leave Records"

    def __str__(self):
        return (
            f"{self.employee.employee_code} | {self.leave_date} "
            f"| {self.leave_type} | {self.status}"
        )

    @property
    def deduction_days(self):
        return 0.5 if self.leave_type == self.LeaveType.HALF else 1.0


# ---------------------------------------------------------------------------
# Audit Log  (immutable)
# ---------------------------------------------------------------------------

class AuditLog(models.Model):
    actor = models.CharField(
        max_length=200,
        help_text="Employee code (e.g. JFP001) or 'Admin' or 'System'",
    )
    action = models.CharField(max_length=100, help_text="e.g. PUNCH_IN, EDIT_ATTENDANCE")
    table_name = models.CharField(max_length=100, blank=True)
    record_id = models.PositiveIntegerField(null=True, blank=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"

    def __str__(self):
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {self.actor} — {self.action}"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("AuditLog entries are immutable.")
        super().save(*args, **kwargs)
