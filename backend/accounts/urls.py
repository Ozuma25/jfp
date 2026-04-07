from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts import views

router = DefaultRouter()
router.register("addresses", views.SavedAddressViewSet, basename="address")
router.register("payments", views.SavedPaymentMethodViewSet, basename="payment")

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view(), name="auth-register"),
    path("auth/verify-email/", views.VerifyEmailView.as_view(), name="auth-verify-email"),
    path("auth/verify-email/resend/", views.ResendVerificationEmailView.as_view(), name="auth-verify-email-resend"),
    path("auth/password-reset/", views.PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path("auth/password-reset-confirm/", views.PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
    path("auth/me/", views.MeView.as_view(), name="auth-me"),
    path("auth/token/", views.EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("", include(router.urls)),
]
