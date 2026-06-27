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
]
