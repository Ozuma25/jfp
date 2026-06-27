"""
Django Admin for the Attendance module.

Admins can manage:
  - Office Settings (singleton)
  - Employees (with salary history inline)
  - Registered Devices
  - Attendance Records (with manual entry support)
  - Leave Balances
  - Leave Records
  - Audit Logs (read-only)
"""

import datetime

from django import forms
from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils import timezone

from .models import (
    AuditLog,
    Attendance,
    Employee,
    LeaveBalance,
    LeaveRecord,
    OfficeSettings,
    RegisteredDevice,
    SalaryHistory,
)
from .services import create_manual_attendance
from .utils import get_client_ip


# ---------------------------------------------------------------------------
# Office Settings
# ---------------------------------------------------------------------------

@admin.register(OfficeSettings)
class OfficeSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ("Office", {"fields": ("office_name",)}),
        (
            "Geofence",
            {
                "fields": ("latitude", "longitude", "allowed_radius_meters"),
                "description": "Set latitude/longitude to 0.0 to disable geofence validation.",
            },
        ),
        (
            "Shift Timings",
            {
                "fields": (
                    "shift_start",
                    "shift_end",
                    "late_grace_minutes",
                    "half_day_cutoff",
                )
            },
        ),
    )
    readonly_fields = ("created_at", "updated_at")

    def has_add_permission(self, request):
        return not OfficeSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


# ---------------------------------------------------------------------------
# Salary History Inline
# ---------------------------------------------------------------------------

class SalaryHistoryInline(admin.TabularInline):
    model = SalaryHistory
    extra = 0
    readonly_fields = ("created_at",)
    ordering = ["-effective_from"]


# ---------------------------------------------------------------------------
# Employee Admin Form  (declared at module level so fieldset validation works)
# ---------------------------------------------------------------------------

class EmployeeAdminForm(forms.ModelForm):
    new_pin = forms.CharField(
        required=False,
        widget=forms.PasswordInput(render_value=False),
        label="Set New PIN",
        help_text="Enter a numeric PIN to set/reset. Leave blank to keep the existing PIN.",
    )

    class Meta:
        model = Employee
        fields = "__all__"


# ---------------------------------------------------------------------------
# Employee
# ---------------------------------------------------------------------------

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    form = EmployeeAdminForm
    list_display = (
        "employee_code", "name", "designation", "mobile",
        "salary_type", "monthly_salary_display", "status", "lock_status", "joining_date",
    )
    list_filter = ("status", "salary_type", "designation")
    search_fields = ("employee_code", "name", "mobile", "designation")
    readonly_fields = ("employee_code", "created_at", "updated_at", "pin_hash_display", "lock_status")
    inlines = [SalaryHistoryInline]
    actions = ["unlock_accounts"]

    fieldsets = (
        ("Identity", {"fields": ("employee_code", "name", "designation", "mobile", "address", "joining_date")}),
        ("Salary", {"fields": ("salary_type", "monthly_salary")}),
        ("Security", {"fields": ("pin_hash_display", "new_pin", "lock_status"), "classes": ("collapse",)}),
        ("Profile", {"fields": ("profile_photo", "status")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def save_model(self, request, obj, form, change):
        new_pin = form.cleaned_data.get("new_pin", "").strip()
        if new_pin:
            obj.set_pin(new_pin)
            obj.failed_attempts = 0
            obj.locked_until = None
        super().save_model(request, obj, form, change)

        # Auto-create salary history on new employee or salary change
        if not change or (change and "monthly_salary" in form.changed_data):
            SalaryHistory.objects.create(
                employee=obj,
                salary_type=obj.salary_type,
                monthly_salary=obj.monthly_salary,
                effective_from=obj.joining_date if not change else timezone.localdate(),
            )

        actor = getattr(request.user, "username", "Admin")
        AuditLog.objects.create(
            actor=f"Admin:{actor}",
            action="EMPLOYEE_CREATED" if not change else "EMPLOYEE_UPDATED",
            table_name="attendance_employee",
            record_id=obj.pk,
            new_value={"name": obj.name, "status": obj.status},
            ip_address=get_client_ip(request),
        )

    def monthly_salary_display(self, obj):
        return f"₹{obj.monthly_salary:,.0f}"
    monthly_salary_display.short_description = "Salary"

    def pin_hash_display(self, obj):
        return "••••••••"
    pin_hash_display.short_description = "PIN"

    def lock_status(self, obj):
        if obj.locked_until and obj.locked_until > timezone.now():
            local_time = timezone.localtime(obj.locked_until)
            return format_html(
                '<span style="color:#ef4444;font-weight:700;">⚠️ LOCKED until {}</span>',
                local_time.strftime("%I:%M %p")
            )
        if obj.failed_attempts > 0:
            return format_html(
                '<span style="color:#f59e0b;font-weight:600;">{} Failed Attempts</span>',
                obj.failed_attempts
            )
        return format_html('<span style="color:#10b981;font-weight:600;">OK</span>')
    lock_status.short_description = "Lock Status"

    def unlock_accounts(self, request, queryset):
        count = queryset.update(failed_attempts=0, locked_until=None)
        self.message_user(request, f"Successfully unlocked {count} employee account(s).")
    unlock_accounts.short_description = "🔓 Unlock selected employee accounts"


# ---------------------------------------------------------------------------
# Registered Device
# ---------------------------------------------------------------------------

@admin.register(RegisteredDevice)
class RegisteredDeviceAdmin(admin.ModelAdmin):
    list_display = ("device_name", "browser", "os", "registered_for", "is_active", "registered_at", "fingerprint_short")
    list_filter = ("is_active", "browser", "os")
    search_fields = ("device_fingerprint", "device_name", "registered_for__name")
    readonly_fields = ("registered_at",)

    def fingerprint_short(self, obj):
        return f"{obj.device_fingerprint[:16]}…"
    fingerprint_short.short_description = "Fingerprint"


# ---------------------------------------------------------------------------
# Attendance  (with manual entry action)
# ---------------------------------------------------------------------------

class AttendancePhotoMixin:
    def punch_in_photo_preview(self, obj):
        if obj.punch_in_photo:
            return format_html(
                '<a href="{}" target="_blank"><img src="{}" height="60" style="border-radius:6px;"></a>',
                obj.punch_in_photo, obj.punch_in_photo,
            )
        return "—"
    punch_in_photo_preview.short_description = "In Photo"

    def punch_out_photo_preview(self, obj):
        if obj.punch_out_photo:
            return format_html(
                '<a href="{}" target="_blank"><img src="{}" height="60" style="border-radius:6px;"></a>',
                obj.punch_out_photo, obj.punch_out_photo,
            )
        return "—"
    punch_out_photo_preview.short_description = "Out Photo"


@admin.register(Attendance)
class AttendanceAdmin(AttendancePhotoMixin, admin.ModelAdmin):
    list_display = (
        "employee", "date", "punch_in_time_col", "punch_out_time_col",
        "working_hours_col", "status_badge", "leave_deduction", "is_manual_entry",
    )
    list_filter = ("status", "date", "is_manual_entry", "employee__designation")
    search_fields = ("employee__name", "employee__employee_code", "date")
    readonly_fields = (
        "created_at", "updated_at",
        "punch_in_photo_preview", "punch_out_photo_preview",
        "working_hours_col",
    )
    date_hierarchy = "date"
    ordering = ["-date"]

    fieldsets = (
        ("Employee & Date", {"fields": ("employee", "date")}),
        ("Punch Times", {"fields": ("punch_in", "punch_out")}),
        ("Photos", {"fields": ("punch_in_photo_preview", "punch_out_photo_preview")}),
        ("Status", {"fields": ("status", "leave_deduction", "working_hours_col")}),
        (
            "GPS",
            {
                "fields": (
                    "punch_in_latitude", "punch_in_longitude", "punch_in_accuracy",
                    "punch_out_latitude", "punch_out_longitude", "punch_out_accuracy",
                    "distance_from_office",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Device",
            {
                "fields": ("device_fingerprint", "device_name", "browser", "ip_address"),
                "classes": ("collapse",),
            },
        ),
        (
            "Manual Entry",
            {
                "fields": ("is_manual_entry", "manual_entry_note"),
                "classes": ("collapse",),
            },
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def punch_in_time_col(self, obj):
        return obj.punch_in_time_display
    punch_in_time_col.short_description = "Punch In"

    def punch_out_time_col(self, obj):
        return obj.punch_out_time_display
    punch_out_time_col.short_description = "Punch Out"

    def working_hours_col(self, obj):
        return obj.working_hours_display
    working_hours_col.short_description = "Working Hours"

    def status_badge(self, obj):
        colors = {
            "PRESENT": "#16a34a", "LATE": "#d97706",
            "HALF_DAY": "#ea580c", "ABSENT": "#dc2626", "INCOMPLETE": "#6b7280",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">{}</span>',
            color, obj.get_status_display(),
        )
    status_badge.short_description = "Status"

    def save_model(self, request, obj, form, change):
        if change:
            # Require edit reason for changed records
            edit_reason = request.POST.get("manual_entry_note", "").strip()
            if not edit_reason:
                messages.warning(
                    request,
                    "Please add a Manual Entry Note explaining why this record was edited.",
                )
            old = Attendance.objects.get(pk=obj.pk)
            AuditLog.objects.create(
                actor=f"Admin:{request.user.username}",
                action="EDIT_ATTENDANCE",
                table_name="attendance_attendance",
                record_id=obj.pk,
                old_value={
                    "punch_in": str(old.punch_in),
                    "punch_out": str(old.punch_out),
                    "status": old.status,
                },
                new_value={
                    "punch_in": str(obj.punch_in),
                    "punch_out": str(obj.punch_out),
                    "status": obj.status,
                    "reason": obj.manual_entry_note,
                },
                ip_address=get_client_ip(request),
            )
        super().save_model(request, obj, form, change)


# ---------------------------------------------------------------------------
# Leave Balance
# ---------------------------------------------------------------------------

@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ("employee", "year", "carry_forward", "credited", "used", "available_display")
    list_filter = ("year",)
    search_fields = ("employee__name", "employee__employee_code")
    readonly_fields = ("created_at", "updated_at")

    def available_display(self, obj):
        avail = obj.available
        color = "#16a34a" if avail > 0 else "#dc2626"
        return format_html(
            '<span style="color:{};font-weight:600;">{}</span>', color, avail
        )
    available_display.short_description = "Available"


# ---------------------------------------------------------------------------
# Leave Record
# ---------------------------------------------------------------------------

@admin.register(LeaveRecord)
class LeaveRecordAdmin(admin.ModelAdmin):
    list_display = ("employee", "leave_date", "leave_type", "status", "remarks", "approved_by", "created_at")
    list_filter = ("status", "leave_type", "leave_date")
    search_fields = ("employee__name", "employee__employee_code", "remarks")
    readonly_fields = ("created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not obj.approved_by and obj.status == LeaveRecord.Status.APPROVED:
            obj.approved_by = request.user.get_full_name() or request.user.username
        super().save_model(request, obj, form, change)

        AuditLog.objects.create(
            actor=f"Admin:{request.user.username}",
            action="LEAVE_UPDATED",
            table_name="attendance_leaverecord",
            record_id=obj.pk,
            new_value={
                "employee": obj.employee.employee_code,
                "date": str(obj.leave_date),
                "status": obj.status,
            },
            ip_address=get_client_ip(request),
        )


# ---------------------------------------------------------------------------
# Salary History (standalone admin)
# ---------------------------------------------------------------------------

@admin.register(SalaryHistory)
class SalaryHistoryAdmin(admin.ModelAdmin):
    list_display = ("employee", "salary_type", "monthly_salary", "effective_from", "created_at")
    list_filter = ("salary_type",)
    search_fields = ("employee__name", "employee__employee_code")
    readonly_fields = ("created_at",)


# ---------------------------------------------------------------------------
# Audit Log (read-only)
# ---------------------------------------------------------------------------

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "table_name", "record_id", "ip_address")
    list_filter = ("action", "table_name")
    search_fields = ("actor", "action", "notes")
    readonly_fields = (
        "actor", "action", "table_name", "record_id",
        "old_value", "new_value", "ip_address", "notes", "created_at",
    )
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
