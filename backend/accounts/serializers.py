from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from rest_framework import serializers

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import SavedAddress, SavedPaymentMethod, UserProfile


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Accept email or username as `email`, or legacy `username` (same as SimpleJWT clients)."""

    email = serializers.CharField(write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop("username", None)

    def to_internal_value(self, data):
        if hasattr(data, "copy") and not isinstance(data, dict):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)
        else:
            data = dict(data.items()) if hasattr(data, "items") else {}
        if data.get("email") in (None, "") and data.get("username"):
            data["email"] = data["username"]
        return super().to_internal_value(data)

    def validate(self, attrs):
        attrs = dict(attrs)
        login_id = attrs.pop("email", "").strip()
        password = attrs.pop("password")
        user = User.objects.filter(email__iexact=login_id).first()
        if user is None:
            user = User.objects.filter(username__iexact=login_id).first()
        if user is None or not user.check_password(password):
            raise AuthenticationFailed("Invalid email or password.")
        attrs["username"] = user.username
        attrs["password"] = password
        return super().validate(attrs)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    phone = serializers.CharField(write_only=True, required=True, min_length=10, max_length=15)

    class Meta:
        model = User
        fields = ("email", "password", "password_confirm", "first_name", "last_name", "phone")

    def validate(self, attrs):
        pw = attrs.get("password", "")
        if pw != attrs.get("password_confirm", ""):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        
        has_upper = any(char.isupper() for char in pw)
        has_special = any(not char.isalnum() for char in pw)
        if not (has_upper and has_special):
            raise serializers.ValidationError({"password": "Password must contain at least one uppercase letter and one special character."})

        # Basic phone validation: just ensure digits or '+' prefix
        phone = attrs.get("phone", "")
        if not phone.replace('+', '').isdigit():
            raise serializers.ValidationError({"phone": "Enter a valid phone number."})

        return attrs

    def validate_email(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_phone(self, value):
        if UserProfile.objects.filter(phone=value).exists():
            raise serializers.ValidationError("An account with this phone number already exists.")
        return value

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        phone = validated_data.pop("phone", "")
        email = validated_data["email"].strip().lower()
        user = User(
            username=email,
            email=email,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )
        user.set_password(password)
        user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.phone = phone
        profile.save()

        # Send Verification Email
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        verify_url = f"{frontend_url}/verify-email?uid={uid}&token={token}"

        subject = "Verify your Jai Fancy Packs Account"
        message = f"Hello {user.first_name},\n\nPlease verify your email by clicking the link below:\n\n{verify_url}\n\nThank you!"
        html_message = f"<p>Hello {user.first_name},</p><p>Please verify your email by clicking the link below:</p><p><a href='{verify_url}'>Verify Email</a></p>"

        try:
            send_mail(
                subject,
                message,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "contact@jaifancypacks.com"),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=True,  # Prevent crashing if SMTP isn't setup yet
            )
        except Exception:
            pass

        return user


class UserMeSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(source="profile.phone", required=False, allow_blank=True)
    is_email_verified = serializers.BooleanField(source="profile.is_email_verified", read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "phone", "is_email_verified")
        read_only_fields = ("id", "email", "is_email_verified")

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        phone = profile_data.get("phone")

        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if phone is not None:
            profile.phone = phone
            profile.save()

        return instance


class SavedAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedAddress
        fields = (
            "id",
            "name",
            "recipient_name",
            "phone",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "is_default",
        )
        read_only_fields = ("id",)


class SavedPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedPaymentMethod
        fields = ("id", "method_type", "provider", "identifier", "is_default")
        read_only_fields = ("id",)
