from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
from notifications.tasks import send_email_sync

from accounts.models import SavedAddress, SavedPaymentMethod, UserProfile
from accounts.serializers import (
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
    SavedAddressSerializer,
    SavedPaymentMethodSerializer,
    UserMeSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # --- Async Welcome/Verification Email ---
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_url = f"{settings.FRONTEND_URL}/verify-email?uid={uid}&token={token}"
        
        subject = "Welcome to Jai Fancy Packs - Verify Your Email"
        message = f"Hello {user.first_name},\n\nWelcome! Please verify your email: {verify_url}"
        html_message = f"<p>Hello {user.first_name},</p><p>Welcome to our atelier. Please <a href='{verify_url}'>verify your email</a> to start shopping.</p>"
        
        send_email_sync(subject, message, [user.email], html_message=html_message)

        return Response(
            {"id": user.id, "email": user.email, "message": "Registered successfully. Verification email sent."},
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        uid = request.data.get("uid")
        token = request.data.get("token")

        if not uid or not token:
            return Response({"error": "UID and Token are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid_decoded = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=uid_decoded)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"error": "Invalid verification link."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"error": "Verification link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)

        profile, _ = UserProfile.objects.get_or_create(user=user)
        if not profile.is_email_verified:
            profile.is_email_verified = True
            profile.save()
            return Response({"message": "Email successfully verified!"}, status=status.HTTP_200_OK)
        
        return Response({"message": "Email is already verified."}, status=status.HTTP_200_OK)


class ResendVerificationEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        if profile.is_email_verified:
            return Response({"message": "Email is already verified."}, status=status.HTTP_400_BAD_REQUEST)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        verify_url = f"{frontend_url}/verify-email?uid={uid}&token={token}"

        subject = "Verify your Jai Fancy Packs Account"
        message = f"Hello {user.first_name},\n\nPlease verify your email by clicking the link below:\n\n{verify_url}\n\nThank you!"
        html_message = f"<p>Hello {user.first_name},</p><p>Please verify your email by clicking the link below:</p><p><a href='{verify_url}'>Verify Email</a></p>"

        send_email_sync(subject, message, [user.email], html_message=html_message)

        return Response({"message": "Verification email sent!"}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        print(f"DEBUG: PasswordResetRequest for email: '{email}'")
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if user:
            print(f"DEBUG: Found user: {user.username}")
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
            reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"

            subject = "Reset your Jai Fancy Packs Password"
            message = f"Hello,\n\nYou requested a password reset. Click the link below to set a new password:\n\n{reset_url}\n\nIf you did not request this, please ignore this email."
            html_message = f"<p>Hello,</p><p>You requested a password reset. Click the link below to set a new password:</p><p><a href='{reset_url}'>Reset Password</a></p><p>If you did not request this, please ignore this email.</p>"

            send_email_sync(subject, message, [user.email], html_message=html_message)
        else:
            print("DEBUG: User not found.")

        # Always return success to prevent email enumeration attacks
        return Response({"message": "If an account with that email exists, a reset link has been sent."}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        uid = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")

        if not all([uid, token, new_password]):
            return Response({"error": "UID, Token, and New Password are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid_decoded = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=uid_decoded)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"error": "Invalid reset link."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"error": "Reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)

        # Basic password validation
        has_upper = any(char.isupper() for char in new_password)
        has_special = any(not char.isalnum() for char in new_password)
        if len(new_password) < 8 or not (has_upper and has_special):
            return Response({"error": "Password must be at least 8 characters, contain one uppercase letter and one special character."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        return Response({"message": "Password successfully reset!"}, status=status.HTTP_200_OK)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserMeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        UserProfile.objects.get_or_create(user=user)
        return user


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class SavedAddressViewSet(viewsets.ModelViewSet):
    serializer_class = SavedAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavedAddress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if serializer.validated_data.get("is_default"):
            SavedAddress.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get("is_default"):
            SavedAddress.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save()


class SavedPaymentMethodViewSet(viewsets.ModelViewSet):
    serializer_class = SavedPaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavedPaymentMethod.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if serializer.validated_data.get("is_default"):
            SavedPaymentMethod.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get("is_default"):
            SavedPaymentMethod.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save()
