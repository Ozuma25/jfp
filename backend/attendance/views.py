"""
Views for the Employee Attendance Portal.

Routes handled:
    /employee/              → redirect to login or dashboard
    /employee/login/        → employee selection + PIN
    /employee/logout/       → clear session
    /employee/dashboard/    → today's status + summary
    /employee/punch-in/     → camera + GPS punch in
    /employee/punch-out/    → camera + GPS punch out
    /employee/history/      → filterable attendance history
"""

import json

from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from .decorators import employee_required
from .models import (
    Attendance,
    AuditLog,
    Employee,
    LeaveBalance,
    OfficeSettings,
    RegisteredDevice,
)
from .services import (
    get_employee_dashboard_data,
    is_working_day,
    process_punch_in,
    process_punch_out,
)
from .utils import get_client_ip, get_device_info, upload_selfie_to_cloudinary


# ---------------------------------------------------------------------------
# Root redirect
# ---------------------------------------------------------------------------

def employee_root(request):
    if request.session.get("employee_id"):
        return redirect("attendance:dashboard")
    return redirect("attendance:login")


# ---------------------------------------------------------------------------
# Login / Logout
# ---------------------------------------------------------------------------

def employee_login(request):
    if request.session.get("employee_id"):
        return redirect("attendance:dashboard")

    employees = Employee.objects.filter(status=Employee.Status.ACTIVE).order_by("name")

    if request.method == "POST":
        employee_id = request.POST.get("employee_id", "").strip()
        pin = request.POST.get("pin", "").strip()

        try:
            employee = employees.get(pk=int(employee_id))
        except (Employee.DoesNotExist, ValueError):
            messages.error(request, "Invalid selection. Please try again.")
            return render(request, "attendance/login.html", {"employees": employees})

        # Check if currently locked out
        if employee.locked_until and employee.locked_until > timezone.now():
            remaining_seconds = int((employee.locked_until - timezone.now()).total_seconds())
            remaining_mins = max(1, int(remaining_seconds / 60))
            messages.error(
                request,
                f"Account is temporarily locked. Please try again in {remaining_mins} min, or request Admin to reset your PIN."
            )
            return render(request, "attendance/login.html", {"employees": employees})

        if not employee.check_pin(pin):
            employee.failed_attempts += 1
            
            if employee.failed_attempts >= 4:
                employee.locked_until = timezone.now() + timezone.timedelta(minutes=15)
                msg = "Incorrect PIN. Account locked for 15 minutes due to too many failed attempts."
                action_type = "ACCOUNT_LOCKED"
            else:
                attempts_left = 4 - employee.failed_attempts
                msg = f"Incorrect PIN. Please try again. ({attempts_left} attempts remaining)"
                action_type = "LOGIN_FAILED"
            
            employee.save(update_fields=["failed_attempts", "locked_until"])

            AuditLog.objects.create(
                actor=employee.employee_code,
                action=action_type,
                table_name="attendance_employee",
                record_id=employee.pk,
                ip_address=get_client_ip(request),
                notes=f"Attempt {employee.failed_attempts} failed."
            )
            messages.error(request, msg)
            return render(request, "attendance/login.html", {"employees": employees})

        # Success — reset lockout states
        if employee.failed_attempts > 0 or employee.locked_until:
            employee.failed_attempts = 0
            employee.locked_until = None
            employee.save(update_fields=["failed_attempts", "locked_until"])

        # Success — set session
        request.session["employee_id"] = employee.pk
        request.session["employee_name"] = employee.name
        request.session["employee_code"] = employee.employee_code
        request.session.set_expiry(0)  # expires on browser close

        device_fingerprint = request.POST.get("device_fingerprint", "").strip()
        if device_fingerprint:
            request.session["device_fingerprint"] = device_fingerprint
            device_info = get_device_info(request)
            RegisteredDevice.objects.get_or_create(
                device_fingerprint=device_fingerprint,
                defaults={
                    "device_name": f"{device_info['device_name']} ({employee.name})",
                    "browser": device_info["browser"],
                    "os": device_info["os"],
                    "registered_for": employee,
                    "is_active": False,  # Awaiting Admin Approval
                    "notes": f"Auto-enrolled on login by {employee.name}."
                }
            )

        AuditLog.objects.create(
            actor=employee.employee_code,
            action="LOGIN",
            table_name="attendance_employee",
            record_id=employee.pk,
            ip_address=get_client_ip(request),
        )
        return redirect("attendance:dashboard")

    return render(request, "attendance/login.html", {"employees": employees})


def employee_logout(request):
    employee_code = request.session.get("employee_code", "Unknown")
    AuditLog.objects.create(
        actor=employee_code,
        action="LOGOUT",
        table_name="attendance_employee",
        ip_address=get_client_ip(request),
    )
    request.session.flush()
    return redirect("attendance:login")


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@employee_required
def employee_dashboard(request):
    data = get_employee_dashboard_data(request.employee)
    settings = OfficeSettings.get_settings()
    today = timezone.localdate()

    current_hour = timezone.localtime(timezone.now()).hour
    if current_hour < 12:
        greeting = "Good Morning"
    elif current_hour < 17:
        greeting = "Good Afternoon"
    else:
        greeting = "Good Evening"

    current_fp = request.session.get("device_fingerprint")
    is_device_approved = True
    if settings.latitude != 0.0 and current_fp:
        is_device_approved = RegisteredDevice.objects.filter(
            device_fingerprint=current_fp, is_active=True
        ).exists()

    context = {
        "employee": request.employee,
        "data": data,
        "office": settings,
        "is_working_day": is_working_day(today),
        "greeting": greeting,
        "is_device_approved": is_device_approved,
        "device_fingerprint": current_fp,
    }
    return render(request, "attendance/dashboard.html", context)


# ---------------------------------------------------------------------------
# Punch In
# ---------------------------------------------------------------------------

@employee_required
def punch_in_view(request):
    employee = request.employee
    today = timezone.localdate()
    existing = Attendance.objects.filter(employee=employee, date=today).first()

    if existing and existing.punch_in:
        messages.info(request, f"You already punched in at {existing.punch_in_time_display}.")
        return redirect("attendance:dashboard")

    if not is_working_day(today):
        messages.warning(request, "Today is not a working day (Sunday). No attendance required.")
        return redirect("attendance:dashboard")

    settings = OfficeSettings.get_settings()
    context = {
        "employee": employee,
        "office_lat": settings.latitude,
        "office_lng": settings.longitude,
        "allowed_radius": settings.allowed_radius_meters,
        "geofence_enabled": settings.latitude != 0.0,
    }
    return render(request, "attendance/punch_in.html", context)


@require_POST
@employee_required
def punch_in_submit(request):
    """
    AJAX endpoint that receives the punch-in data from the browser.
    Expects JSON body.
    """
    employee = request.employee

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "message": "Invalid request."}, status=400)

    photo_b64 = body.get("photo", "")
    lat = body.get("latitude")
    lng = body.get("longitude")
    accuracy = body.get("accuracy")
    device_fp = body.get("device_fingerprint", "")

    # Device check
    settings = OfficeSettings.get_settings()
    if settings.latitude != 0.0:
        if not device_fp or not RegisteredDevice.objects.filter(
            device_fingerprint=device_fp, is_active=True
        ).exists():
            return JsonResponse(
                {"success": False, "message": "Unauthorized device. Please contact admin."},
                status=403,
            )

    # Upload photo
    photo_url = ""
    if photo_b64:
        photo_url = upload_selfie_to_cloudinary(photo_b64, folder="punch_in_selfies")

    device_info = get_device_info(request)

    success, message, attendance = process_punch_in(
        employee,
        latitude=float(lat) if lat is not None else None,
        longitude=float(lng) if lng is not None else None,
        accuracy=float(accuracy) if accuracy is not None else None,
        photo_url=photo_url,
        device_fingerprint=device_fp,
        device_name=device_info["device_name"],
        browser=device_info["browser"],
        ip_address=get_client_ip(request),
    )

    return JsonResponse(
        {
            "success": success,
            "message": message,
            "punch_in_time": attendance.punch_in_time_display if attendance and attendance.punch_in else None,
        }
    )


# ---------------------------------------------------------------------------
# Punch Out
# ---------------------------------------------------------------------------

@employee_required
def punch_out_view(request):
    employee = request.employee
    today = timezone.localdate()
    existing = Attendance.objects.filter(employee=employee, date=today).first()

    if not existing or not existing.punch_in:
        messages.error(request, "You have not punched in today.")
        return redirect("attendance:dashboard")

    if existing.punch_out:
        messages.info(request, f"You already punched out at {existing.punch_out_time_display}.")
        return redirect("attendance:dashboard")

    settings = OfficeSettings.get_settings()
    context = {
        "employee": employee,
        "attendance": existing,
        "office_lat": settings.latitude,
        "office_lng": settings.longitude,
        "allowed_radius": settings.allowed_radius_meters,
        "geofence_enabled": settings.latitude != 0.0,
    }
    return render(request, "attendance/punch_out.html", context)


@require_POST
@employee_required
def punch_out_submit(request):
    """AJAX endpoint for punch-out."""
    employee = request.employee

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "message": "Invalid request."}, status=400)

    photo_b64 = body.get("photo", "")
    lat = body.get("latitude")
    lng = body.get("longitude")
    accuracy = body.get("accuracy")
    device_fp = body.get("device_fingerprint", "")

    # Device check
    settings = OfficeSettings.get_settings()
    if settings.latitude != 0.0:
        if not device_fp or not RegisteredDevice.objects.filter(
            device_fingerprint=device_fp, is_active=True
        ).exists():
            return JsonResponse(
                {"success": False, "message": "Unauthorized device. Please contact admin."},
                status=403,
            )

    photo_url = ""
    if photo_b64:
        photo_url = upload_selfie_to_cloudinary(photo_b64, folder="punch_out_selfies")

    device_info = get_device_info(request)

    success, message, attendance = process_punch_out(
        employee,
        latitude=float(lat) if lat is not None else None,
        longitude=float(lng) if lng is not None else None,
        accuracy=float(accuracy) if accuracy is not None else None,
        photo_url=photo_url,
        device_fingerprint=device_fp,
        device_name=device_info["device_name"],
        browser=device_info["browser"],
        ip_address=get_client_ip(request),
    )

    return JsonResponse(
        {
            "success": success,
            "message": message,
            "status": attendance.status if attendance else None,
            "working_hours": attendance.working_hours_display if attendance else None,
        }
    )


# ---------------------------------------------------------------------------
# Attendance History
# ---------------------------------------------------------------------------

@employee_required
def attendance_history(request):
    employee = request.employee
    today = timezone.localdate()

    filter_type = request.GET.get("filter", "monthly")
    year = int(request.GET.get("year", today.year))
    month = int(request.GET.get("month", today.month))

    if filter_type == "weekly":
        week_start = today - __import__("datetime").timedelta(days=today.weekday())
        records = Attendance.objects.filter(
            employee=employee,
            date__gte=week_start,
            date__lte=today,
        ).order_by("-date")
        period_label = f"Week of {week_start.strftime('%d %b %Y')}"
    else:  # monthly (default)
        records = Attendance.objects.filter(
            employee=employee,
            date__year=year,
            date__month=month,
        ).order_by("-date")
        import calendar
        period_label = f"{calendar.month_name[month]} {year}"

    # Leave summary for this month/year
    balance = LeaveBalance.get_or_create_for_year(employee, today.year)

    import calendar as cal_module
    months = [(i, cal_module.month_name[i]) for i in range(1, 13)]
    current_year = today.year
    years = list(range(current_year - 2, current_year + 1))

    context = {
        "employee": employee,
        "records": records,
        "filter_type": filter_type,
        "year": year,
        "month": month,
        "period_label": period_label,
        "leave_taken_year": float(balance.used),
        "leave_taken_month": float(
            sum(r.leave_deduction for r in records if r.leave_deduction > 0)
        ),
        "today": today,
        "months": months,
        "years": years,
    }
    return render(request, "attendance/history.html", context)


# ---------------------------------------------------------------------------
# Employee Profile
# ---------------------------------------------------------------------------

@employee_required
def employee_profile(request):
    """Render the profile page for the current employee."""
    return render(request, "attendance/profile.html", {"employee": request.employee})


@require_POST
@employee_required
def update_profile_photo(request):
    """AJAX endpoint to upload and set employee profile photo."""
    employee = request.employee
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "message": "Invalid request format."}, status=400)

    photo_b64 = body.get("photo", "")
    if not photo_b64:
        return JsonResponse({"success": False, "message": "No photo data provided."}, status=400)

    # Upload to Cloudinary with profile_photos folder suffix
    photo_url = upload_selfie_to_cloudinary(photo_b64, folder="profile_photos")
    if not photo_url:
        return JsonResponse({"success": False, "message": "Failed to upload photo. Please try again."}, status=500)

    # Save to model
    employee.profile_photo = photo_url
    employee.save(update_fields=["profile_photo", "updated_at"])

    # Audit log
    AuditLog.objects.create(
        actor=employee.employee_code,
        action="UPDATE_PROFILE_PHOTO",
        table_name="attendance_employee",
        record_id=employee.pk,
        new_value={"profile_photo": photo_url},
        ip_address=get_client_ip(request),
    )

    return JsonResponse({
        "success": True,
        "message": "Profile photo updated successfully.",
        "photo_url": photo_url
    })
