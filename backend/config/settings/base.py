"""
Django settings — Jai Fancy Packs API.
Loads `.env` from repo root (`E_com/.env`) or `backend/.env`.
"""
import os
from datetime import timedelta
from decimal import Decimal
from importlib import import_module
from pathlib import Path

try:
    load_dotenv = import_module("dotenv").load_dotenv
except ModuleNotFoundError:
    def load_dotenv(*args, **kwargs):
        return False

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
REPO_ROOT = BACKEND_DIR.parent

load_dotenv(REPO_ROOT / ".env")
# Local overrides (e.g. SQLite in backend/.env when Docker Postgres is not used)
load_dotenv(BACKEND_DIR / ".env", override=True)

DEBUG = os.environ.get("DJANGO_DEBUG", "0") in ("1", "true", "True", "yes")
_secret_key = (os.environ.get("DJANGO_SECRET_KEY") or "").strip()
if not _secret_key:
    if DEBUG:
        _secret_key = "dev-only-unsafe-key-change-me"
    else:
        raise RuntimeError("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG=0")
SECRET_KEY = _secret_key

_raw_hosts = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1")
ALLOWED_HOSTS = [h.strip() for h in _raw_hosts.split(",") if h.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "core",
    "accounts",
    "catalog",
    "cart",
    "orders",
    "quotes",
    "notifications",
    "reviews",
    "wishlist",
    "coupons",
    "attendance",
    "backoffice",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    'whitenoise.middleware.WhiteNoiseMiddleware',
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

STATIC_URL = '/static/'
STATIC_ROOT = BACKEND_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BACKEND_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Database: PostgreSQL via DATABASE_URL; SQLite fallback if unset ---
try:
    dj_database_url = import_module("dj_database_url")
  
except ModuleNotFoundError:
    dj_database_url = None

if dj_database_url:
    default_db_config = dj_database_url.config(
        default=f"sqlite:///{BACKEND_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
else:
    default_db_config = {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(BACKEND_DIR / "db.sqlite3"),
    }

DATABASES = {
    "default": default_db_config
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-in"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BACKEND_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BACKEND_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- CORS / CSRF (production allowlist) ---
_default_cors_origins = "https://jfp-git-dev-ozuma25s-projects.vercel.app"
_raw_cors_origins = os.environ.get("CORS_ALLOWED_ORIGINS", _default_cors_origins)
CORS_ALLOWED_ORIGINS = [o.strip() for o in _raw_cors_origins.split(",") if o.strip()]
CORS_ALLOW_CREDENTIALS = True
_raw_csrf_origins = os.environ.get("CSRF_TRUSTED_ORIGINS", _raw_cors_origins)
CSRF_TRUSTED_ORIGINS = [o.strip() for o in _raw_csrf_origins.split(",") if o.strip()]

# --- REST + JWT ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {"anon": "100/minute", "user": "300/minute"},
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
}

# --- Security (enable in production) ---
# Controlled by env so local dev stays simple.
DJANGO_SECURE = os.environ.get("DJANGO_SECURE", "0") in ("1", "true", "True", "yes")
SECURE_ENABLED = DJANGO_SECURE or (not DEBUG)

if SECURE_ENABLED:
    # Behind proxies (Render / Nginx / etc): allow reading scheme from forwarded header.
    if os.environ.get("DJANGO_USE_X_FORWARDED_PROTO", "1") in ("1", "true", "True", "yes"):
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

    SECURE_SSL_REDIRECT = os.environ.get("DJANGO_SECURE_SSL_REDIRECT", "1") in (
        "1",
        "true",
        "True",
        "yes",
    )

    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = os.environ.get("DJANGO_SESSION_COOKIE_SAMESITE", "Lax")
    CSRF_COOKIE_SAMESITE = os.environ.get("DJANGO_CSRF_COOKIE_SAMESITE", "Lax")

    # Recommended baseline headers
    X_FRAME_OPTIONS = os.environ.get("DJANGO_X_FRAME_OPTIONS", "DENY")
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = os.environ.get("DJANGO_SECURE_REFERRER_POLICY", "same-origin")

    # HSTS (set to 0 to disable if you don't want preload)
    SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", "1") in (
        "1",
        "true",
        "True",
        "yes",
    )
    SECURE_HSTS_PRELOAD = os.environ.get("DJANGO_SECURE_HSTS_PRELOAD", "0") in (
        "1",
        "true",
        "True",
        "yes",
    )

# --- Email (Resend SMTP) ---
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST      = os.environ.get("EMAIL_HOST", "smtp.resend.com")
EMAIL_PORT      = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USE_TLS   = os.environ.get("EMAIL_USE_TLS", "1") in ("1", "true", "True", "yes")
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "resend")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")  # Resend API key

# FROM addresses
# - ORDER_FROM_EMAIL  → for order confirmations, payment, shipping
# - NOREPLY_FROM_EMAIL → for auth (OTP, registration), quotes, system notifications
ORDER_FROM_EMAIL   = os.environ.get("ORDER_FROM_EMAIL",   "Jai Fancy Packs Orders <orders@jaifancypacks.com>")
NOREPLY_FROM_EMAIL = os.environ.get("NOREPLY_FROM_EMAIL", "Jai Fancy Packs <noreply@jaifancypacks.com>")

# Backwards-compatible alias (used in many places already)
DEFAULT_FROM_EMAIL = NOREPLY_FROM_EMAIL

# Admin notification email
ADMINS_EMAIL = os.environ.get("ADMINS_EMAIL", "")

# Frontend and backend URLs (used in emails and notifications)
FRONTEND_URL = os.environ.get(
    "FRONTEND_URL",
    "https://jfp-git-dev-ozuma25s-projects.vercel.app",
)
BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")

# Checkout shipping (INR). Doorstep fee is added to order total; pickup and custom courier are ₹0 at checkout.
DOORSTEP_SHIPPING_INR = Decimal(os.environ.get("DOORSTEP_SHIPPING_INR", "0"))
STORE_PICKUP_ADDRESS = {
    "line1": os.environ.get(
        "STORE_PICKUP_LINE1",
        "Jai Fancy Packs, 481/2, Tiru nager 1st Street, Selvapuram",
    ),
    "line2": os.environ.get(
        "STORE_PICKUP_LINE2",
        "via Ukkadam byepasss road, via sundakamuttur byepass road",
    ),
    "city": os.environ.get("STORE_PICKUP_CITY", "Coimbatore"),
    "state": os.environ.get("STORE_PICKUP_STATE", "Tamil Nadu"),
    "postal_code": os.environ.get("STORE_PICKUP_POSTAL_CODE", "641026"),
}
# Google Maps link for pickup (share link from Business Profile, or override in .env)
STORE_PICKUP_MAP_URL = os.environ.get(
    "STORE_PICKUP_MAP_URL",
    "https://www.google.com/maps/search/?api=1&query=Jai+Fancy+Packs%2C+481%2F2%2C+Tiru+nager+1st+Street%2C+Selvapuram%2C+Coimbatore%2C+Tamil+Nadu+641026",
)


# --- Media: local (dev), Cloudinary, or S3 ---
USE_CLOUDINARY = os.environ.get("USE_CLOUDINARY", "0") in ("1", "true", "True", "yes")
USE_S3 = os.environ.get("USE_S3", "0") in ("1", "true", "True", "yes")

if USE_CLOUDINARY:
    INSTALLED_APPS += ["cloudinary_storage", "cloudinary"]
    CLOUDINARY_STORAGE = {
        "CLOUD_NAME": os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
        "API_KEY": os.environ.get("CLOUDINARY_API_KEY", ""),
        "API_SECRET": os.environ.get("CLOUDINARY_API_SECRET", ""),
    }
    STORAGES = {
        "default": {
            "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
elif USE_S3:
    INSTALLED_APPS.append("storages")
    AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
    AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME", "")
    AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "ap-south-1")
    AWS_DEFAULT_ACL = None
    AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
