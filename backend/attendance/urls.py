from django.urls import path

from . import views

app_name = "attendance"

urlpatterns = [
    path("",                views.employee_root,       name="root"),
    path("login/",          views.employee_login,      name="login"),
    path("logout/",         views.employee_logout,     name="logout"),
    path("dashboard/",      views.employee_dashboard,  name="dashboard"),
    path("punch-in/",       views.punch_in_view,       name="punch_in"),
    path("punch-in/submit/", views.punch_in_submit,    name="punch_in_submit"),
    path("punch-out/",      views.punch_out_view,      name="punch_out"),
    path("punch-out/submit/", views.punch_out_submit,  name="punch_out_submit"),
    path("history/",        views.attendance_history,  name="history"),
    path("profile/",        views.employee_profile,    name="profile"),
    path("profile/update-photo/", views.update_profile_photo, name="update_profile_photo"),
    
    # Custom Backoffice Admin Dashboard
    path("admin-dashboard/", views.admin_dashboard, name="admin_dashboard"),
    path("admin-dashboard/device/<int:device_id>/approve/", views.admin_approve_device, name="admin_approve_device"),
    path("admin-dashboard/device/<int:device_id>/reject/", views.admin_reject_device, name="admin_reject_device"),
    path("admin-dashboard/leave/<int:leave_id>/approve/", views.admin_approve_leave, name="admin_approve_leave"),
    path("admin-dashboard/leave/<int:leave_id>/reject/", views.admin_reject_leave, name="admin_reject_leave"),
    path("admin-dashboard/employee/<int:emp_id>/details/", views.admin_employee_details, name="admin_employee_details"),
    path("admin-dashboard/regularize/", views.admin_regularize_attendance, name="admin_regularize_attendance"),
]
