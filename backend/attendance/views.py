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
from django.contrib.admin.views.decorators import staff_member_required

from .decorators import employee_required
from .models import (
    Attendance,
    AuditLog,
    Employee,
    LeaveBalance,
    OfficeSettings,
    RegisteredDevice,
    LeaveRecord,
    SalaryHistory,
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


# ---------------------------------------------------------------------------
# Custom Admin Dashboard
# ---------------------------------------------------------------------------

@staff_member_required
def admin_dashboard(request):
    """
    Render a premium Backoffice Dashboard for staff/admins to manage
    attendance records, whitelists, and leaves.
    """
    today = timezone.localdate()
    
    # Selected Month / Year for payroll calculations
    try:
        year = int(request.GET.get("year", today.year))
        month = int(request.GET.get("month", today.month))
    except ValueError:
        year = today.year
        month = today.month
        
    # Active Employees
    total_active = Employee.objects.filter(status=Employee.Status.ACTIVE).count()
    
    # Attendance for today
    todays_records = Attendance.objects.filter(date=today).select_related("employee")
    
    # Calculate daily statistics
    status_counts = {"PRESENT": 0, "LATE": 0, "HALF_DAY": 0, "INCOMPLETE": 0, "ABSENT": 0}
    punched_in_ids = set()
    for r in todays_records:
        status_counts[r.status] = status_counts.get(r.status, 0) + 1
        if r.punch_in:
            punched_in_ids.add(r.employee_id)
            
    # Identify absent employees (Active employees who haven't punched in today, day-off Sunday check)
    if today.weekday() == 6:  # 6 represents Sunday
        absent_employees = Employee.objects.none()
        absent_count = 0
    else:
        absent_employees = Employee.objects.filter(
            status=Employee.Status.ACTIVE
        ).exclude(id__in=punched_in_ids).order_by("employee_code")
        absent_count = absent_employees.count()
    
    # Pending Whitelist device requests
    pending_devices = RegisteredDevice.objects.filter(is_active=False).select_related("registered_for").order_by("-registered_at")
    
    # Pending Leave requests
    pending_leaves = LeaveRecord.objects.filter(status=LeaveRecord.Status.PENDING).select_related("employee").order_by("-leave_date")
    
    # All attendance logs for today for table
    records_list = todays_records.order_by("employee__employee_code")

    # Complete Employee List (for directory tab)
    employees = Employee.objects.all().order_by("employee_code")

    # Payroll estimated data for selected period
    payroll_data = calculate_monthly_payroll(year, month)

    # Months options for selector
    import calendar as cal_module
    months_choices = [(i, cal_module.month_name[i]) for i in range(1, 13)]
    years_choices = list(range(today.year - 2, today.year + 1))

    context = {
        "today": today,
        "total_active": total_active,
        "present_count": status_counts["PRESENT"] + status_counts["LATE"],
        "late_count": status_counts["LATE"],
        "half_day_count": status_counts["HALF_DAY"],
        "incomplete_count": status_counts["INCOMPLETE"],
        "absent_count": absent_count,
        "absent_employees": absent_employees,
        "pending_devices": pending_devices,
        "pending_leaves": pending_leaves,
        "records": records_list,
        "employees": employees,
        "payroll_data": payroll_data,
        "selected_month": month,
        "selected_year": year,
        "months_choices": months_choices,
        "years_choices": years_choices,
    }
    return render(request, "attendance/admin_dashboard.html", context)


@require_POST
@staff_member_required
def admin_approve_device(request, device_id):
    """AJAX: Approve device whitelist request."""
    try:
        device = RegisteredDevice.objects.get(pk=device_id)
        device.is_active = True
        device.save(update_fields=["is_active"])
        
        AuditLog.objects.create(
            actor=f"Admin:{request.user.username}",
            action="APPROVE_DEVICE",
            table_name="attendance_registereddevice",
            record_id=device.pk,
            new_value={"device_fingerprint": device.device_fingerprint, "employee": device.registered_for.employee_code if device.registered_for else "Shared"},
            ip_address=get_client_ip(request),
        )
        return JsonResponse({"success": True, "message": f"Approved device {device.device_name}."})
    except RegisteredDevice.DoesNotExist:
        return JsonResponse({"success": False, "message": "Device request not found."}, status=404)


@require_POST
@staff_member_required
def admin_reject_device(request, device_id):
    """AJAX: Reject and delete device whitelist request."""
    try:
        device = RegisteredDevice.objects.get(pk=device_id)
        device_id_val = device.pk
        fp = device.device_fingerprint
        device.delete()
        
        AuditLog.objects.create(
            actor=f"Admin:{request.user.username}",
            action="REJECT_DEVICE",
            table_name="attendance_registereddevice",
            record_id=device_id_val,
            new_value={"device_fingerprint": fp},
            ip_address=get_client_ip(request),
        )
        return JsonResponse({"success": True, "message": "Rejected and removed device request."})
    except RegisteredDevice.DoesNotExist:
        return JsonResponse({"success": False, "message": "Device request not found."}, status=404)


@require_POST
@staff_member_required
def admin_approve_leave(request, leave_id):
    """AJAX: Approve leave request and deduct leave balance."""
    try:
        leave = LeaveRecord.objects.get(pk=leave_id)
        if leave.status != LeaveRecord.Status.PENDING:
            return JsonResponse({"success": False, "message": "Leave is already processed."}, status=400)
            
        leave.status = LeaveRecord.Status.APPROVED
        leave.approved_by = request.user.username
        leave.save(update_fields=["status", "approved_by"])
        
        # Deduct balance
        balance = LeaveBalance.get_or_create_for_year(leave.employee, leave.leave_date.year)
        balance.used = balance.used + leave.deduction_days
        balance.save(update_fields=["used", "updated_at"])
        
        # Also auto-create or update attendance for that date to avoid ABSENT triggers
        Attendance.objects.update_or_create(
            employee=leave.employee,
            date=leave.leave_date,
            defaults={
                "status": Attendance.Status.HALF_DAY if leave.leave_type == LeaveRecord.LeaveType.HALF else Attendance.Status.PRESENT,
                "leave_deduction": leave.deduction_days,
                "is_manual_entry": True,
                "manual_entry_note": f"Approved Leave: {leave.remarks or 'No remarks'}"
            }
        )
        
        AuditLog.objects.create(
            actor=f"Admin:{request.user.username}",
            action="APPROVE_LEAVE",
            table_name="attendance_leaverecord",
            record_id=leave.pk,
            new_value={"employee": leave.employee.employee_code, "date": str(leave.leave_date), "status": "APPROVED"},
            ip_address=get_client_ip(request),
        )
        return JsonResponse({"success": True, "message": f"Approved leave for {leave.employee.name}."})
    except LeaveRecord.DoesNotExist:
        return JsonResponse({"success": False, "message": "Leave record not found."}, status=404)


@require_POST
@staff_member_required
def admin_reject_leave(request, leave_id):
    """AJAX: Reject leave request."""
    try:
        leave = LeaveRecord.objects.get(pk=leave_id)
        if leave.status != LeaveRecord.Status.PENDING:
            return JsonResponse({"success": False, "message": "Leave is already processed."}, status=400)
            
        leave.status = LeaveRecord.Status.REJECTED
        leave.approved_by = request.user.username
        leave.save(update_fields=["status", "approved_by"])
        
        AuditLog.objects.create(
            actor=f"Admin:{request.user.username}",
            action="REJECT_LEAVE",
            table_name="attendance_leaverecord",
            record_id=leave.pk,
            new_value={"employee": leave.employee.employee_code, "date": str(leave.leave_date), "status": "REJECTED"},
            ip_address=get_client_ip(request),
        )
        return JsonResponse({"success": True, "message": f"Rejected leave for {leave.employee.name}."})
    except LeaveRecord.DoesNotExist:
        return JsonResponse({"success": False, "message": "Leave record not found."}, status=404)


# ---------------------------------------------------------------------------
# Employee Details AJAX API
# ---------------------------------------------------------------------------

@staff_member_required
def admin_employee_details(request, emp_id):
    """AJAX: Get complete history and details of a single employee."""
    try:
        emp = Employee.objects.get(pk=emp_id)
        
        # Leave Balance
        today = timezone.localdate()
        balance, _ = LeaveBalance.objects.get_or_create(
            employee=emp,
            year=today.year,
            defaults={"credited": 0, "used": 0, "carried_forward": 0}
        )
        
        # Salary History
        salaries = SalaryHistory.objects.filter(employee=emp).order_by("-effective_from")
        salary_history_list = [{
            "salary_type": s.get_salary_type_display(),
            "monthly_salary": float(s.monthly_salary),
            "effective_from": str(s.effective_from)
        } for s in salaries]
        
        # Devices
        devices = RegisteredDevice.objects.filter(registered_for=emp)
        device_list = [{
            "device_name": d.device_name,
            "device_fingerprint": d.device_fingerprint,
            "is_active": d.is_active,
            "registered_at": str(d.registered_at.date())
        } for d in devices]
        
        # Recent 30 Attendance Records
        records = Attendance.objects.filter(employee=emp).order_by("-date")[:30]
        attendance_list = [{
            "date": str(r.date),
            "punch_in": r.punch_in_time_display,
            "punch_out": r.punch_out_time_display if r.punch_out else "—",
            "working_hours": r.working_hours_display,
            "status": r.get_status_display(),
            "is_manual": r.is_manual_entry,
            "note": r.manual_entry_note or ""
        } for r in records]
        
        data = {
            "success": True,
            "employee": {
                "id": emp.pk,
                "name": emp.name,
                "code": emp.employee_code,
                "designation": emp.designation,
                "mobile": emp.mobile,
                "address": emp.address,
                "joining_date": str(emp.joining_date),
                "profile_photo": emp.profile_photo or "",
                "status": emp.get_status_display(),
                "salary_type": emp.get_salary_type_display(),
                "monthly_salary": float(emp.monthly_salary)
            },
            "leave_balance": {
                "credited": float(balance.credited),
                "used": float(balance.used),
                "remaining": float(balance.credited - balance.used)
            },
            "salary_history": salary_history_list,
            "devices": device_list,
            "attendance": attendance_list
        }
        return JsonResponse(data)
    except Employee.DoesNotExist:
        return JsonResponse({"success": False, "message": "Employee not found."}, status=404)


# ---------------------------------------------------------------------------
# Monthly Payroll Helper
# ---------------------------------------------------------------------------

def calculate_monthly_payroll(year: int, month: int) -> list:
    import calendar as cal_module
    from datetime import date
    
    # Get all employees
    employees = Employee.objects.all().order_by("employee_code")
    
    # Start and end date for that month
    _, num_days = cal_module.monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, num_days)
    
    payroll_data = []
    
    # Fetch all attendance records for that month
    attendance_records = Attendance.objects.filter(
        date__gte=start_date, date__lte=end_date
    )
    
    # Group attendance by employee
    emp_attendance = {}
    for r in attendance_records:
        if r.employee_id not in emp_attendance:
            emp_attendance[r.employee_id] = []
        emp_attendance[r.employee_id].append(r)
        
    for emp in employees:
        records = emp_attendance.get(emp.id, [])
        
        # Count statuses
        present = sum(1 for r in records if r.status == Attendance.Status.PRESENT)
        late = sum(1 for r in records if r.status == Attendance.Status.LATE)
        half_day = sum(1 for r in records if r.status == Attendance.Status.HALF_DAY)
        absent = sum(1 for r in records if r.status == Attendance.Status.ABSENT)
        incomplete = sum(1 for r in records if r.status == Attendance.Status.INCOMPLETE)
        
        # Total leave days deducted from paid balance in this month
        paid_leaves_used = sum(r.leave_deduction for r in records if r.leave_deduction > 0.0)
        
        # Unpaid absences
        unpaid_absents = sum(1 for r in records if r.status == Attendance.Status.ABSENT and r.leave_deduction == 0.0)
        unpaid_half_days = sum(0.5 for r in records if r.status == Attendance.Status.HALF_DAY and r.leave_deduction == 0.0)
        
        total_unpaid_days = unpaid_absents + unpaid_half_days
        
        # Estimated Payout calculation based on Salary Type
        base_salary = float(emp.monthly_salary)
        net_payout = 0.0
        details = ""
        
        if emp.salary_type == Employee.SalaryType.MONTHLY:
            # S - unpaid_days * (S / 26)
            daily_rate = base_salary / 26.0
            deduction = total_unpaid_days * daily_rate
            net_payout = max(0.0, base_salary - deduction)
            details = f"Monthly base: ₹{base_salary:,.0f} | Deducted {total_unpaid_days} unpaid days"
            
        elif emp.salary_type == Employee.SalaryType.DAILY:
            total_worked_days = (present + late) + (0.5 * half_day)
            net_payout = total_worked_days * base_salary
            details = f"Daily wage: ₹{base_salary:,.0f} | Worked {total_worked_days} days"
            
        elif emp.salary_type == Employee.SalaryType.HOURLY:
            total_minutes = sum(r.working_minutes for r in records if r.working_minutes)
            total_hours = total_minutes / 60.0
            net_payout = total_hours * base_salary
            details = f"Hourly wage: ₹{base_salary:,.0f} | Worked {total_hours:.1f} hours"
            
        payroll_data.append({
            "employee": emp,
            "present": present,
            "late": late,
            "half_day": half_day,
            "absent": absent + incomplete,
            "paid_leaves_used": float(paid_leaves_used),
            "unpaid_days": float(total_unpaid_days),
            "base_salary": base_salary,
            "net_payout": net_payout,
            "details": details,
        })
        
    return payroll_data
