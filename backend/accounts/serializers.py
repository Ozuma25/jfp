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
    
    # Business Fields
    is_business = serializers.BooleanField(write_only=True, required=False, default=False)
    company_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    gst_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    company_address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_city = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_state = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_country = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_pincode = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("email", "password", "password_confirm", "first_name", "last_name", "phone", 
                  "is_business", "company_name", "gst_number", "company_phone", "company_email", "company_address", "company_city", "company_state", "company_country", "company_pincode")

    def validate(self, attrs):
        pw = attrs.get("password", "")
        if pw != attrs.get("password_confirm", ""):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        
        has_upper = any(char.isupper() for char in pw)
        has_special = any(not char.isalnum() for char in pw)
        if not (has_upper and has_special):
            raise serializers.ValidationError({"password": "Password must contain at least one uppercase letter and one special character."})

        phone = attrs.get("phone", "")
        if not phone.replace('+', '').isdigit() or len(phone.replace('+', '')) < 10:
            raise serializers.ValidationError({"phone": "Enter a valid phone number with at least 10 digits."})

        is_business = attrs.get("is_business", False)
        if is_business:
            if not attrs.get("company_name"):
                raise serializers.ValidationError({"company_name": "Company name is required for business accounts."})
            if not attrs.get("gst_number"):
                raise serializers.ValidationError({"gst_number": "GST number is required for business accounts."})
            
            # Uppercase GST
            attrs["gst_number"] = attrs["gst_number"].upper()
            company_phone = attrs.get("company_phone", "")
            if company_phone and (not company_phone.replace('+', '').isdigit() or len(company_phone.replace('+', '')) < 10):
                raise serializers.ValidationError({"company_phone": "Enter a valid company phone number with at least 10 digits."})

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
        
        is_business = validated_data.pop("is_business", False)
        company_name = validated_data.pop("company_name", "")
        gst_number = validated_data.pop("gst_number", "")
        company_phone = validated_data.pop("company_phone", "")
        company_email = validated_data.pop("company_email", "")
        company_address = validated_data.pop("company_address", "")

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
        
        if is_business:
            profile.is_business = is_business
            profile.company_name = company_name
            profile.gst_number = attrs.get('gst_number', '').upper()
            profile.company_phone = company_phone
            profile.company_email = company_email
            profile.company_address = company_address
            profile.company_city = attrs.get('company_city', '')
            profile.company_state = attrs.get('company_state', '')
            profile.company_country = attrs.get('company_country', '')
            profile.company_pincode = attrs.get('company_pincode', '')
            
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
    
    # Business Fields
    is_business = serializers.BooleanField(source="profile.is_business", required=False)
    company_name = serializers.CharField(source="profile.company_name", required=False, allow_blank=True)
    gst_number = serializers.CharField(source="profile.gst_number", required=False, allow_blank=True)
    company_phone = serializers.CharField(source="profile.company_phone", required=False, allow_blank=True)
    company_email = serializers.EmailField(source="profile.company_email", required=False, allow_blank=True)
    company_address = serializers.CharField(source="profile.company_address", required=False, allow_blank=True)
    company_city = serializers.CharField(source="profile.company_city", required=False, allow_blank=True)
    company_state = serializers.CharField(source="profile.company_state", required=False, allow_blank=True)
    company_country = serializers.CharField(source="profile.company_country", required=False, allow_blank=True)
    company_pincode = serializers.CharField(source="profile.company_pincode", required=False, allow_blank=True)

    email = serializers.EmailField(required=False) # Make email writable

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "phone", "is_email_verified",
                  "is_business", "company_name", "gst_number", "company_phone", "company_email", 
                  "company_address", "company_city", "company_state", "company_country", "company_pincode")
        read_only_fields = ("id", "is_email_verified")

    def validate(self, attrs):
        profile_data = attrs.get('profile', {})
        if 'phone' in profile_data:
            phone = profile_data['phone']
            if phone and (not phone.replace('+', '').isdigit() or len(phone.replace('+', '')) < 10):
                raise serializers.ValidationError({"phone": "Enter a valid phone number with at least 10 digits."})
        
        if 'company_phone' in profile_data:
            c_phone = profile_data['company_phone']
            if c_phone and (not c_phone.replace('+', '').isdigit() or len(c_phone.replace('+', '')) < 10):
                raise serializers.ValidationError({"company_phone": "Enter a valid company phone number with at least 10 digits."})
        
        if profile_data.get('is_business'):
            if not profile_data.get('company_name', getattr(getattr(self, 'instance', None), 'profile', object()).company_name if getattr(self, 'instance', None) else ""):
                pass # Usually partial update, skip rigorous check if not provided here unless required. Just doing phone validation.

        return attrs

    def validate_email(self, value):
        user = self.instance
        if user and user.email != value and User.objects.exclude(pk=user.pk).filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already in use by another account.")
        return value

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        
        email = validated_data.get("email")
        if email and instance.email != email:
            instance.email = email
            # We also update username to match email in this codebase
            if User.objects.filter(username__iexact=email).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError({"email": "This email is already in use."})
            instance.username = email
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            profile.is_email_verified = False  # Reset verification on email change
            profile.save()

        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if "phone" in profile_data:
            profile.phone = profile_data["phone"]
        
        if "is_business" in profile_data:
            profile.is_business = profile_data["is_business"]
        if "company_name" in profile_data:
            profile.company_name = profile_data["company_name"]
        if "gst_number" in profile_data:
            profile.gst_number = profile_data["gst_number"].upper() if profile_data["gst_number"] else ""
        if "company_phone" in profile_data:
            profile.company_phone = profile_data["company_phone"]
        if "company_email" in profile_data:
            profile.company_email = profile_data["company_email"]
        if "company_address" in profile_data:
            profile.company_address = profile_data["company_address"]
        if "company_city" in profile_data:
            profile.company_city = profile_data["company_city"]
        if "company_state" in profile_data:
            profile.company_state = profile_data["company_state"]
        if "company_country" in profile_data:
            profile.company_country = profile_data["company_country"]
        if "company_pincode" in profile_data:
            profile.company_pincode = profile_data["company_pincode"]

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
