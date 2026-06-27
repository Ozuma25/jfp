"""
View decorators for the Employee Attendance portal.

Usage:
    @employee_required
    def my_view(request):
        employee = request.employee  # set by decorator
        ...
"""

from functools import wraps

from django.shortcuts import redirect

from .models import Employee


def employee_required(view_func):
    """
    Ensures the request has a valid employee session.
    Sets request.employee for the wrapped view.
    Redirects to /employee/login/ if not authenticated.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        employee_id = request.session.get("employee_id")
        if not employee_id:
            return redirect("attendance:login")
        try:
            employee = Employee.objects.get(pk=employee_id, status=Employee.Status.ACTIVE)
        except Employee.DoesNotExist:
            request.session.flush()
            return redirect("attendance:login")
        request.employee = employee
        return view_func(request, *args, **kwargs)
    return wrapper
